import "server-only";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { decryptSmtpPassword } from "@/lib/smtp-crypto";

export async function sendConfiguredTestMail(recipient: string): Promise<void> {
  const settings = await prisma.adminMailSettings.findUnique({ where: { id: "smtp" } });
  if (!settings?.enabled || !settings.host || !settings.fromEmail) throw new Error("Relay is niet geconfigureerd");
  // Only configured SMTP relay, never MX discovery, direct delivery or local sendmail.
  // STARTTLS must successfully negotiate TLS; plaintext fallback is forbidden.
  const password = settings.encryptedPassword ? decryptSmtpPassword(settings.encryptedPassword) : null;
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
