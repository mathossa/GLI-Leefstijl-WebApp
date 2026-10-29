import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { amsterdamMonday } from "@/lib/goals-domain.mjs";
import { amsterdamDate, dateOnly, summarizeCompletion } from "@/lib/reflections-domain.mjs";
import { InsightsOverview } from "@/components/insights-overview";

export const metadata: Metadata = { title: "Inzichten" };

export default async function InsightsPage() {
  const { user } = await requireSession();
  const now = amsterdamDate();
  const monday = amsterdamMonday();
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() - i * 7);
    return d;
  });
  const months = Array.from({ length: 6 }, (_, i) =>
    new Date(Date.UTC(Number(now.slice(0, 4)), Number(now.slice(5, 7)) - 1 - i, 1)));
  const earliest = weeks[11] < months[5] ? weeks[11] : months[5];

  const [progress, reflectionCount] = await Promise.all([
    prisma.habitWeekProgress.findMany({
      where: {
        userId: user.id, weekStart: { gte: earliest, lte: monday },
        OR: [{ completedCount: { gt: 0 } }, { note: { not: null } }, { entries: { some: { userId: user.id } } }],
      },
      select: { weekStart: true, completedCount: true, targetCount: true },
    }),
    prisma.weeklyReflection.count({ where: { userId: user.id, weekStart: { gte: weeks[11] } } }),
  ]);
  const weekly = weeks.map((date) => ({
    date, completion: summarizeCompletion(progress.filter((item) => dateOnly(item.weekStart) === dateOnly(date))),
  }));
  const monthly = months.map((date) => ({
    date, completion: summarizeCompletion(progress.filter(
      (item) => dateOnly(item.weekStart).slice(0, 7) === dateOnly(date).slice(0, 7))),
  }));
  const registeredWeeks = weekly.filter((entry) => entry.completion.percentage !== null).length;
  const formatWeek = new Intl.DateTimeFormat("nl-NL", { timeZone: "UTC", day: "numeric", month: "short" });
  const formatMonth = new Intl.DateTimeFormat("nl-NL", { timeZone: "UTC", month: "long", year: "numeric" });
  return <InsightsOverview registeredWeeks={registeredWeeks} reflectionCount={reflectionCount}
    weeks={weekly.map(({ date, completion }) => ({ label: "Week " + formatWeek.format(date), ...completion }))}
    months={monthly.map(({ date, completion }) => ({ label: formatMonth.format(date), ...completion }))}/>;
}
