import { isIP } from "node:net";

export type MailInput = {
  enabled: boolean;
  host: string;
  port: number;
  security: "TLS" | "STARTTLS";
  username: string | null;
  password: string;
  fromName: string;
  fromEmail: string;
};

export function isEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

export function parseMailInput(form: FormData): MailInput {
  const string = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value.trim() : "";
  };
  const enabled = form.get("enabled") === "on";
  const host = string("host").toLowerCase();
  const portText = string("port");
  const port = Number(portText);
  const security = string("security");
  const username = string("username") || null;
  const rawPassword = form.get("password");
  const password = typeof rawPassword === "string" ? rawPassword : "";
  const fromName = string("fromName");
  const fromEmail = string("fromEmail").toLowerCase();

  if (!Number.isInteger(port) || port < 1 || port > 65535 || port === 25 || !/^\d+$/.test(portText)) {
    throw new Error("Gebruik een geldige SMTP-relaypoort (poort 25 is niet toegestaan).");
  }
  if (security !== "TLS" && security !== "STARTTLS") throw new Error("Kies TLS of STARTTLS.");
  if (security === "TLS" && port === 587) throw new Error("Gebruik STARTTLS voor poort 587.");
  if (security === "STARTTLS" && port === 465) throw new Error("Gebruik TLS voor poort 465.");
  if (host && !isIP(host) && (host.length > 253 || !host.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))) {
    throw new Error("Voer een geldige SMTP-hostnaam of IP-adres in, zonder URL.");
  }
  if (username && (username.length > 254 || /[\r\n\0]/.test(username))) throw new Error("Ongeldige SMTP-gebruikersnaam.");
  if (password.length > 1024) throw new Error("SMTP-wachtwoord is te lang.");
  if (fromName.length > 120 || /[\r\n\0]/.test(fromName)) throw new Error("Ongeldige afzendernaam.");
  if (fromEmail && !isEmail(fromEmail)) throw new Error("Ongeldig afzenderadres.");
  if (enabled && (!host || !fromName || !fromEmail)) throw new Error("Vul relayhost, afzendernaam en afzenderadres in.");
  return { enabled, host, port, security, username, password, fromName, fromEmail };
}
