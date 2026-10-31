import "server-only";
import { prisma } from "@/lib/prisma";
import { amsterdamDayKey, pickDailyQuote } from "@/lib/motivation-quote-domain.mjs";

export type MotivationView = {
  quote: string;
  mode: "AUTO" | "CUSTOM";
  customText: string;
};

const FALLBACK = "Kleine stappen in je eigen tempo.";

async function getDailyMotivationText(): Promise<string> {
  const dayKey = amsterdamDayKey();
  // DATE is an Amsterdam calendar label stored at UTC midnight, not a UTC day boundary.
  const day = new Date(`${dayKey}T00:00:00.000Z`);
  const saved = await prisma.dailyMotivationQuote.findUnique({
    where: { day }, select: { text: true },
  });
  if (saved) return saved.text;

  const active = await prisma.motivationQuote.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
    select: { id: true, text: true },
  });
  if (!active.length) return FALLBACK;

  const previous = await prisma.dailyMotivationQuote.findMany({
    where: { day: { lt: day } },
    orderBy: { day: "desc" },
    take: Math.max(active.length - 1, 0),
    select: { quoteId: true },
  });
  const picked = pickDailyQuote(active, previous.map((row) => row.quoteId), dayKey);
  if (!picked) return FALLBACK;

  // Unique DATE PK resolves concurrent first visitors. The no-op update never
  // changes the day's snapshotted text, even if admins edit the library later.
  const chosen = await prisma.dailyMotivationQuote.upsert({
    where: { day },
    create: { day, quoteId: picked.id, text: picked.text },
    update: { day },
    select: { text: true },
  });
  return chosen.text;
}

export async function getUserMotivation(userId: string): Promise<MotivationView> {
  const preference = await prisma.userQuotePreference.findUnique({
    where: { userId },
    select: { mode: true, customText: true },
  });
  const mode = preference?.mode === "CUSTOM" && preference.customText?.trim() ? "CUSTOM" : "AUTO";
  return {
    mode,
    customText: preference?.customText ?? "",
    quote: mode === "CUSTOM" ? preference!.customText! : await getDailyMotivationText(),
  };
}
