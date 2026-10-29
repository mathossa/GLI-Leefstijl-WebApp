// Keep diagnostics actionable without copying SMTP library errors, credentials,
// email addresses, response strings or relay hostnames to the browser/logs.
export class SmtpConfigurationError extends Error {
  constructor() { super("SMTP configuration incomplete"); this.name = "SmtpConfigurationError"; }
}
export class SmtpCredentialError extends Error {
  constructor() { super("Stored SMTP password could not be decrypted"); this.name = "SmtpCredentialError"; }
}

type TransportError = { code?: unknown; responseCode?: unknown };

const knownCodes = new Set([
  "EAUTH", "EENVELOPE", "EMESSAGE", "ECONNECTION", "ECONNREFUSED",
  "ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT", "ESOCKET",
  "CERT_HAS_EXPIRED", "DEPTH_ZERO_SELF_SIGNED_CERT",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "SELF_SIGNED_CERT_IN_CHAIN", "ERR_TLS_CERT_ALTNAME_INVALID",
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);

export function smtpErrorDetails(error: unknown): {
  kind: string; code: string; responseCode: number | null; publicMessage: string;
} {
  if (error instanceof SmtpConfigurationError) {
    return { kind: "config", code: "CONFIG", responseCode: null,
      publicMessage: "De SMTP-relay is niet volledig ingesteld. Controleer de host en afzender." };
  }
  if (error instanceof SmtpCredentialError) {
    return { kind: "credential-key", code: "DECRYPT", responseCode: null,
      publicMessage: "Het opgeslagen SMTP-wachtwoord kan niet worden ontsleuteld. Controleer of SMTP_ENCRYPTION_KEY nog dezelfde is als bij het opslaan en sla het wachtwoord zo nodig opnieuw op." };
  }
  const obj: TransportError = typeof error === "object" && error !== null ? error : {};
  const rawCode = typeof obj.code === "string" ? obj.code : "";
  const code = knownCodes.has(rawCode) ? rawCode : "UNKNOWN";
  const responseCode = typeof obj.responseCode === "number" && Number.isInteger(obj.responseCode) &&
    obj.responseCode >= 400 && obj.responseCode <= 599 ? obj.responseCode : null;
  let kind = "unknown";
  let publicMessage = "De SMTP-test is mislukt. Controleer de relayinstellingen en bekijk de veilige foutcategorie in de serverlog.";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    kind = "dns";
    publicMessage = "De SMTP-host kan niet via DNS worden gevonden. Controleer de hostnaam en DNS op de server.";
  } else if (code === "EAUTH" || responseCode === 535 || responseCode === 534) {
    kind = "authentication";
    publicMessage = "De SMTP-relay accepteert de aanmelding niet. Controleer de gebruikersnaam, het app-wachtwoord en of SMTP-authenticatie is toegestaan.";
  } else if (code === "ECONNREFUSED" || code === "ECONNECTION" ||
      code === "ETIMEDOUT" || code === "ESOCKET") {
    kind = "connection";
    publicMessage = "Geen werkende verbinding met de SMTP-relay. Controleer host, poort, firewall en TLS/STARTTLS.";
  } else if (code.startsWith("CERT_") || code.includes("CERT_") ||
      code === "SELF_SIGNED_CERT_IN_CHAIN") {
    kind = "tls-certificate";
    publicMessage = "De relay gebruikt een ongeldig of niet-vertrouwd TLS-certificaat. Controleer het certificaat en de hostnaam. TLS-validatie blijft verplicht.";
  } else if (code === "EENVELOPE" || (responseCode !== null && responseCode >= 500)) {
    kind = "rejected";
    publicMessage = "De SMTP-relay heeft het bericht geweigerd. Controleer of de ingestelde afzender en het beheeradres toegestaan zijn.";
  } else if (responseCode !== null) {
    kind = "relay-response";
    publicMessage = "De SMTP-relay geeft een fout terug. Controleer het relaybeleid en de mailserverstatus.";
  }
  return { kind, code, responseCode, publicMessage };
}
