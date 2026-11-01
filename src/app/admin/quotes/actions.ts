"use server";

import { randomUUID, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import {
  MAX_QUOTE_LIBRARY_ROWS, QuoteInputError, normalizedQuote, parseQuoteFile,
  planQuoteImport, validateQuote,
} from "@/lib/admin-quote-domain.mjs";

type Result = { ok: true; message: string } | { ok: false; message: string };
type QuoteRow = { id: string; text: string; normalizedText: string; category: string | null; isActive: boolean; deletedAt: Date | null };

function errorMessage(error: unknown) {
  if (error instanceof QuoteInputError) return error.message;
  if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
    return "Deze quote of ID bestaat al. Vernieuw het overzicht.";
  }
  return "Opslaan is niet gelukt. Probeer opnieuw.";
}

function refresh() {
  revalidatePath("/admin/quotes");
  revalidatePath("/admin");
  // A selected daily quote is an immutable snapshot; change shows the next day.
  revalidatePath("/dashboard");
}

export async function saveAdminQuote(input: { id?: string; text: string; category: string; isActive: boolean }): Promise<Result> {
  const session = await requireAdmin();
  try {
    const quote = validateQuote(input);
    await prisma.$transaction(async (tx) => {
      if (quote.id) {
        const found = await tx.motivationQuote.findUnique({ where: { id: quote.id } });
        if (!found || found.deletedAt) throw new QuoteInputError("Quote is niet gevonden of verwijderd.");
        await tx.motivationQuote.update({
          where: { id: quote.id },
          data: { text: quote.text, normalizedText: quote.normalizedText, category: quote.category, isActive: quote.isActive },
        });
        await tx.adminAudit.create({ data: { actorId: session.user.id, targetId: quote.id, action: "quotes.updated" } });
      } else {
        const total = await tx.motivationQuote.count();
        if (total >= MAX_QUOTE_LIBRARY_ROWS) throw new QuoteInputError("De bibliotheek is vol (1000 quotes).");
        const id = randomUUID();
        await tx.motivationQuote.create({
          data: { id, text: quote.text, normalizedText: quote.normalizedText,
            category: quote.category, isActive: quote.isActive, origin: "ADMIN" },
        });
        await tx.adminAudit.create({ data: { actorId: session.user.id, targetId: id, action: "quotes.created" } });
      }
    }, { isolationLevel: "Serializable" });
    refresh();
    return { ok: true, message: quote.id ? "Quote bijgewerkt." : "Quote toegevoegd." };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function setAdminQuoteState(id: string, intent: "enable" | "disable" | "delete" | "restore"): Promise<Result> {
  const session = await requireAdmin();
  if (!/^[a-zA-Z0-9_-]{1,40}$/u.test(id) || !["enable","disable","delete","restore"].includes(intent)) {
    return { ok: false, message: "Ongeldige bewerking." };
  }
  try {
    await prisma.$transaction(async (tx) => {
      const found = await tx.motivationQuote.findUnique({ where: { id } });
      if (!found) throw new QuoteInputError("Quote is niet gevonden.");
      if (found.deletedAt && intent !== "restore") throw new QuoteInputError("Herstel deze quote eerst.");
      if (!found.deletedAt && intent === "restore") throw new QuoteInputError("Deze quote is niet verwijderd.");
      const data = intent === "restore" ? { deletedAt: null, isActive: false }
        : intent === "delete" ? { deletedAt: new Date(), isActive: false }
        : { isActive: intent === "enable" };
      await tx.motivationQuote.update({ where: { id }, data });
      await tx.adminAudit.create({ data: { actorId: session.user.id, targetId: id, action: `quotes.${intent}` } });
    }, { isolationLevel: "Serializable" });
    refresh();
    return { ok: true, message: intent === "delete" ? "Quote verwijderd (herstelbaar)." : "Wijziging opgeslagen." };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

async function buildImportPreview(content: string, format: "csv" | "json") {
  const rows = parseQuoteFile(content, format);
  const existing: QuoteRow[] = await prisma.motivationQuote.findMany({
    select: { id: true, text: true, normalizedText: true, category: true, isActive: true, deletedAt: true },
  });
  const plan = planQuoteImport(rows, existing);
  const hash = createHash("sha256").update(JSON.stringify(plan)).digest("hex");
  return { plan, hash, total: existing.length };
}

type ImportLine = { line: number; text?: string; operation: string; reason?: string };
type ImportPreview = {
  ok: boolean; message: string; hash?: string;
  rows?: ImportLine[]; counts?: { create: number; update: number; skip: number; error: number };
};

export async function previewAdminQuoteImport(content: string, format: "csv" | "json"): Promise<ImportPreview> {
  await requireAdmin();
  try {
    const { plan, hash, total } = await buildImportPreview(content, format);
    const counts = { create: 0, update: 0, skip: 0, error: 0 };
    for (const row of plan) counts[row.operation as keyof typeof counts]++;
    if (total + counts.create > MAX_QUOTE_LIBRARY_ROWS) {
      return { ok: false, message: "De bibliotheek kan maximaal 1000 quotes bevatten." };
    }
    return {
      ok: true, message: counts.error ? "Er zijn ongeldige regels. Corrigeer het bestand; importeren is geblokkeerd." : "Controleer de wijzigingen en bevestig de import.",
      hash, counts, rows: plan.map(row => ({
        line: row.line, text: row.text, operation: row.operation, reason: row.reason,
      })),
    };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function confirmAdminQuoteImport(
  content: string, format: "csv" | "json", previewHash: string,
): Promise<Result> {
  const session = await requireAdmin();
  if (!/^[a-f0-9]{64}$/u.test(previewHash)) return { ok: false, message: "Bekijk de import eerst." };
  try {
    const counts = await prisma.$transaction(async (tx) => {
      // Repeat parsing, planning and checksum in the same serializable transaction.
      // A changed file/library cannot be applied based on an outdated preview.
      const records = parseQuoteFile(content, format);
      const existing = await tx.motivationQuote.findMany({
        select: { id: true, text: true, normalizedText: true, category: true, isActive: true, deletedAt: true },
      });
      const plan = planQuoteImport(records, existing);
      const hash = createHash("sha256").update(JSON.stringify(plan)).digest("hex");
      if (hash !== previewHash) throw new QuoteInputError("Bibliotheek of bestand is gewijzigd. Bekijk de import opnieuw.");
      if (plan.some(row => row.operation === "error")) throw new QuoteInputError("Corrigeer eerst alle ongeldige regels.");
      const createCount = plan.filter(row => row.operation === "create").length;
      if (existing.length + createCount > MAX_QUOTE_LIBRARY_ROWS) throw new QuoteInputError("De bibliotheek is vol.");
      let created = 0, updated = 0;
      for (const row of plan) {
        if (row.operation === "skip") continue;
        const id = row.id || randomUUID();
        if (row.operation === "create") {
          await tx.motivationQuote.create({ data: {
            id, text: row.text, normalizedText: normalizedQuote(row.text),
            category: row.category, isActive: row.isActive, origin: "ADMIN",
          } });
          created++;
        } else if (row.operation === "update") {
          await tx.motivationQuote.update({ where: { id }, data: {
            text: row.text, normalizedText: normalizedQuote(row.text),
            category: row.category, isActive: row.isActive,
          } });
          updated++;
        }
        await tx.adminAudit.create({ data: {
          actorId: session.user.id, targetId: id,
          action: row.operation === "create" ? "quotes.import.created" : "quotes.import.updated",
        } });
      }
      return { created, updated };
    }, { isolationLevel: "Serializable", timeout: 20000 });
    refresh();
    return { ok: true, message: `Import klaar: ${counts.created} toegevoegd, ${counts.updated} bijgewerkt.` };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}
