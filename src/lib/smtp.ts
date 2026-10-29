import "server-only";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { decryptSmtpPassword } from "@/lib/smtp-crypto";
import { SmtpConfigurationError, SmtpCredentialError } from "@/lib/smtp-diagnostics";

export async function sendConfiguredTestMail(recipient: string): Promise<void> {
  const settings = await prisma.adminMailSettings.findUnique({ where: { id: "smtp" } });
  if (!settings?.enabled || !settings.host || !settings.fromEmail) throw new SmtpConfigurationError();
  // Only configured SMTP relay, never MX discovery, direct delivery or local sendmail.
  // STARTTLS must successfully negotiate TLS; plaintext fallback is forbidden.
  let password: string | null = null;
  if (settings.encryptedPassword) {
    try {
      password = decryptSmtpPassword(settings.encryptedPassword);
    } catch {
      // Incorrect or rotated key: do not expose crypto internals to the client.
      throw new SmtpCredentialError();
    }
  }
  const transport = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.security === "TLS",
    requireTLS: settings.security === "STARTTLS",
    pool: false,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    disableFileAccess: true,
    disableUrlAccess: true,
    ...(settings.username && password ? { auth: { user: settings.username, pass: password } } : {}),
    tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
  });
  try {
    await transport.sendMail({
      from: { name: settings.fromName, address: settings.fromEmail },
      to: recipient,
      subject: "Mijn Leefstijl — SMTP test",
      text: "Dit is een testbericht van de ingestelde SMTP-relay van Mijn Leefstijl.",
    });
  } finally {
    transport.close();
  }
}
