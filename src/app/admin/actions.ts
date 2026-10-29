"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { encryptSmtpPassword } from "@/lib/smtp-crypto";
import { parseMailInput } from "@/lib/smtp-validation";
import { sendConfiguredTestMail } from "@/lib/smtp";
import { smtpErrorDetails } from "@/lib/smtp-diagnostics";

export type SmtpActionState = { status: "idle" | "success" | "error"; message: string };

export async function saveSmtpSettings(_previous: SmtpActionState, formData: FormData): Promise<SmtpActionState> {
  void _previous;
  const session = await requireAdmin();
  let input;
  try { input = parseMailInput(formData); }
  catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Controleer de velden." }; }

  const existing = await prisma.adminMailSettings.findUnique({ where: { id: "smtp" } });
  if (input.password && !input.username) return { status: "error", message: "Vul een gebruikersnaam in bij een wachtwoord." };
  let encryptedPassword: string | null = input.username ? existing?.encryptedPassword ?? null : null;
  if (input.password) {
    try { encryptedPassword = encryptSmtpPassword(input.password); }
    catch { return { status: "error", message: "Configureer eerst een correcte SMTP_ENCRYPTION_KEY op de server." }; }
  }
  if (input.username && !encryptedPassword) return { status: "error", message: "SMTP-wachtwoord ontbreekt." };

  await prisma.$transaction(async (tx) => {
    await tx.adminMailSettings.upsert({
      where: { id: "smtp" },
      create: {
        id: "smtp", enabled: input.enabled, host: input.host, port: input.port,
        security: input.security, username: input.username, encryptedPassword,
        fromName: input.fromName, fromEmail: input.fromEmail, updatedById: session.user.id,
      },
      update: {
        enabled: input.enabled, host: input.host, port: input.port,
        security: input.security, username: input.username, encryptedPassword,
        fromName: input.fromName, fromEmail: input.fromEmail, updatedById: session.user.id,
      },
    });
    await tx.adminAudit.create({ data: { actorId: session.user.id, action: "smtp.settings.saved" } });
  });
  revalidatePath("/admin");
  return { status: "success", message: input.enabled ? "Relayinstellingen opgeslagen." : "Instellingen opgeslagen. De relay staat uit." };
}

export async function sendSmtpTest(_previous: SmtpActionState, _form: FormData): Promise<SmtpActionState> {
  void _previous;
  void _form;
  const session = await requireAdmin();
  // Atomic PostgreSQL update also throttles simultaneous requests across replicas.
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  const claimed = await prisma.adminMailSettings.updateMany({
    where: { id: "smtp", enabled: true, OR: [{ lastTestAt: null }, { lastTestAt: { lt: cutoff } }] },
    data: { lastTestAt: new Date() },
  });
  if (claimed.count !== 1) return { status: "error", message: "Relay niet actief of er was al een test in de afgelopen 5 minuten." };
  await prisma.adminAudit.create({ data: { actorId: session.user.id, action: "smtp.test.requested" } });
  try {
    // The recipient comes exclusively from Better Auth, not from user-supplied input.
    await sendConfiguredTestMail(session.user.email);
    await prisma.adminAudit.create({ data: { actorId: session.user.id, action: "smtp.test.sent" } });
    return { status: "success", message: "Testbericht verzonden naar je eigen beheeraccount." };
  } catch (error) {
    const diagnostic = smtpErrorDetails(error);
    // Never log raw SMTP errors: Nodemailer can include addresses, relay text
    // or parts of authentication details in its error.message/response.
    console.warn("[smtp-test] failure", {
      kind: diagnostic.kind, code: diagnostic.code, responseCode: diagnostic.responseCode,
    });
    await prisma.adminAudit.create({ data: { actorId: session.user.id, action: "smtp.test.failed" } });
    return { status: "error", message: diagnostic.publicMessage };
  }
}
