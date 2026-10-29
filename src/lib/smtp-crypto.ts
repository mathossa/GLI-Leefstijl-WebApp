import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function readKey(encoded: string | undefined): Buffer {
  if (!encoded || !/^[A-Za-z0-9+/]{43}=$/.test(encoded)) {
    throw new Error("SMTP_ENCRYPTION_KEY moet een afzonderlijke base64-sleutel van 32 bytes zijn");
  }
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32 || key.toString("base64") !== encoded) {
    throw new Error("SMTP_ENCRYPTION_KEY moet een afzonderlijke base64-sleutel van 32 bytes zijn");
  }
  return key;
}

export function encryptSmtpPassword(password: string, secret = process.env.SMTP_ENCRYPTION_KEY): string {
  if (!password || password.length > 1024) throw new Error("Ongeldig SMTP-wachtwoord");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", readKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), ciphertext.toString("base64"), cipher.getAuthTag().toString("base64")].join(":");
}

export function decryptSmtpPassword(encrypted: string, secret = process.env.SMTP_ENCRYPTION_KEY): string {
  const parts = encrypted.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") throw new Error("Ongeldig SMTP-geheimformaat");
  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[3], "base64");
  if (iv.length !== 12 || tag.length !== 16) throw new Error("Ongeldig SMTP-geheimformaat");
  const decipher = createDecipheriv("aes-256-gcm", readKey(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(parts[2], "base64")), decipher.final()]).toString("utf8");
}
