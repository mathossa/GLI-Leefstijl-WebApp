// Pure validation and import/export planning. No Next.js, Prisma or dependencies.
export const MAX_QUOTE_FILE_BYTES = 128 * 1024;
export const MAX_QUOTE_IMPORT_ROWS = 250;
export const MAX_QUOTE_LIBRARY_ROWS = 1000;

export class QuoteInputError extends Error {
  constructor(message) { super(message); this.name = "QuoteInputError"; }
}

export function normalizedQuote(text) {
  return text.normalize("NFC").trim().replace(/\s+/gu, " ").toLowerCase();
}

export function validateQuote(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new QuoteInputError("Ongeldige quote.");
  }
  if (typeof value.text !== "string") throw new QuoteInputError("Tekst ontbreekt.");
  const text = value.text.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (!text || text.length > 300 || /[\u0000-\u001f\u007f]/u.test(text)) {
    throw new QuoteInputError("Tekst moet 1–300 tekens bevatten.");
  }
  const rawCategory = value.category ?? "";
  if (typeof rawCategory !== "string") throw new QuoteInputError("Categorie is ongeldig.");
  const category = rawCategory.trim().toUpperCase();
  if (category && !/^[A-Z0-9_ -]{1,30}$/u.test(category)) {
    throw new QuoteInputError("Categorie: maximaal 30 letters, cijfers of spaties.");
  }
  const rawActive = value.isActive ?? value.active ?? true;
  let isActive;
  if (rawActive === true || rawActive === "true" || rawActive === "1" || rawActive === 1) isActive = true;
  else if (rawActive === false || rawActive === "false" || rawActive === "0" || rawActive === 0) isActive = false;
  else throw new QuoteInputError("Actief moet true/false of 1/0 zijn.");
  const id = value.id == null ? "" : String(value.id).trim();
  if (id && !/^[a-zA-Z0-9_-]{1,40}$/u.test(id)) {
    throw new QuoteInputError("ID bevat ongeldige tekens.");
  }
  return { id, text, normalizedText: normalizedQuote(text), category: category || null, isActive };
}

function csvRows(input) {
  const rows = [];
  let row = [], field = "", quoted = false, closed = false;
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') { field += '"'; index++; }
        else { quoted = false; closed = true; }
      } else { field += char; }
    } else if (char === '"' && field === "" && !closed) {
      quoted = true;
    } else if (char === ",") {
      row.push(field); field = ""; closed = false;
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[index + 1] === "\n") index++;
      row.push(field);
      if (row.some(cell => cell.trim())) rows.push(row);
      row = []; field = ""; closed = false;
    } else {
      if (closed || char === '"') throw new QuoteInputError("Ongeldige CSV-aanhalingstekens.");
      field += char;
    }
  }
  if (quoted) throw new QuoteInputError("Onvolledige CSV-aanhalingstekens.");
  row.push(field);
  if (row.some(cell => cell.trim())) rows.push(row);
  return rows;
}

export function parseQuoteFile(content, format) {
  if (typeof content !== "string" || new TextEncoder().encode(content).length > MAX_QUOTE_FILE_BYTES) {
    throw new QuoteInputError("Bestand is groter dan 128 KB.");
  }
  let records;
  if (format === "json") {
    let data;
    try { data = JSON.parse(content.replace(/^\uFEFF/u, "")); }
    catch { throw new QuoteInputError("JSON kon niet worden gelezen."); }
    records = Array.isArray(data) ? data : data?.quotes;
    if (!Array.isArray(records)) throw new QuoteInputError("JSON moet een quotes-array bevatten.");
  } else if (format === "csv") {
    const rows = csvRows(content.replace(/^\uFEFF/u, ""));
    if (rows.length < 2) throw new QuoteInputError("CSV moet kolomkoppen en minstens één quote bevatten.");
    const header = rows.shift().map(value => value.trim().toLowerCase());
    if (!header.includes("text") || header.some((name, index) => !name || header.indexOf(name) !== index)) {
      throw new QuoteInputError("CSV vereist een unieke kolom 'text'.");
    }
    if (header.some(name => !["id", "text", "category", "isactive", "active"].includes(name))) {
      throw new QuoteInputError("Onbekende CSV-kolom. Gebruik id,text,category,isActive.");
    }
    records = rows.map((row) => {
      if (row.length !== header.length) return null;
      return Object.fromEntries(header.map((key, index) => [key === "isactive" ? "isActive" : key, row[index]]));
    });
  } else {
    throw new QuoteInputError("Alleen CSV en JSON worden ondersteund.");
  }
  if (!records.length || records.length > MAX_QUOTE_IMPORT_ROWS) {
    throw new QuoteInputError("Importeer 1 tot 250 quotes per bestand.");
  }
  return records.map((row, index) => {
    try { return { line: index + 1, ...validateQuote(row) }; }
    catch (error) {
      return { line: index + 1, error: error instanceof Error ? error.message : "Ongeldige regel." };
    }
  });
}

// Side-effect-free preview. A conflicting or corrupt file fails as a whole at apply.
export function planQuoteImport(records, existing) {
  const byId = new Map(existing.map(q => [q.id, q]));
  const byText = new Map(existing.map(q => [q.normalizedText, q]));
  const ids = new Set(), texts = new Set();
  return records.map(record => {
    if (record.error) return { ...record, operation: "error", reason: record.error };
    const id = record.id, normalizedText = record.normalizedText;
    const result = { ...record };
    if ((id && ids.has(id)) || texts.has(normalizedText)) {
      return { ...result, operation: "error", reason: "Dubbele ID of tekst in het importbestand." };
    }
    if (id) ids.add(id);
    texts.add(normalizedText);
    const found = id ? byId.get(id) : null;
    const collision = byText.get(normalizedText);
    if (found?.deletedAt) return { ...result, operation: "error", reason: "Deze ID is verwijderd; herstel hem eerst via beheer." };
    if (collision && collision.id !== id) {
      return { ...result, operation: id ? "error" : "skip", reason: "Tekst bestaat al in de bibliotheek." };
    }
    if (!found) return { ...result, operation: "create", reason: "Nieuwe quote" };
    if (found.text === result.text && found.category === result.category && found.isActive === result.isActive) {
      return { ...result, operation: "skip", reason: "Geen wijziging nodig" };
    }
    return { ...result, operation: "update", reason: "Bestaande ID bijwerken" };
  });
}

export function exportQuotesCsv(quotes) {
  const csvCell = (value) => {
    let text = String(value ?? "");
    // Protect spreadsheet programs from evaluating formula-like user text.
    if (/^[=+@-]/u.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return "\uFEFF" + [
    ["id","text","category","isActive"].join(","),
    ...quotes.map(q => [q.id,q.text,q.category ?? "",String(q.isActive)].map(csvCell).join(",")),
  ].join("\r\n") + "\r\n";
}
