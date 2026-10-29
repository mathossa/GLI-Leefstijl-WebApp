import "server-only";
import { prisma } from "@/lib/prisma";
import { dateOnly } from "@/lib/reflections-domain.mjs";

// Include only personal lifestyle content; never export passwords, sessions or profile data.
export async function exportPersonalData(userId: string) {
  const [goals, reflections, meetings] = await Promise.all([
    prisma.goal.findMany({
      where: { userId }, orderBy: { createdAt: "asc" },
      select: {
        id: true, title: true, motivation: true, area: true, status: true,
        startDate: true, endDate: true, createdAt: true, updatedAt: true,
        actions: {
          where: { userId }, orderBy: { createdAt: "asc" },
          select: {
            id: true, title: true, targetPerWeek: true, archivedAt: true,
            createdAt: true, updatedAt: true,
            weeks: {
              where: { userId }, orderBy: { weekStart: "asc" },
              select: { weekStart: true, targetCount: true, completedCount: true, note: true, createdAt: true, updatedAt: true,
                entries: { where: { userId }, orderBy: { createdAt: "asc" },
                  select: { id: true, createdAt: true, rating: true, note: true } } },
            },
          },
        },
      },
    }),
    prisma.weeklyReflection.findMany({
      where: { userId }, orderBy: { weekStart: "asc" },
      select: { weekStart: true, wentWell: true, difficult: true, nextStep: true, createdAt: true, updatedAt: true },
    }),
    prisma.meetingNote.findMany({
      where: { userId }, orderBy: { meetingDate: "asc" },
      select: { id: true, meetingDate: true, title: true, notes: true, actionPoints: true, createdAt: true, updatedAt: true,
        photos: { where: { userId }, select: { id: true, fileName: true, createdAt: true } } },
    }),
  ]);
  return {
    format: "mijn-leefstijl-json", version: 1, exportedAt: new Date().toISOString(),
    timeZone: "Europe/Amsterdam",
    goals: goals.map((g) => ({
      ...g, startDate: g.startDate ? dateOnly(g.startDate) : null,
      endDate: g.endDate ? dateOnly(g.endDate) : null,
      actions: g.actions.map((a) => ({
        ...a, weeks: a.weeks.map((w) => ({ ...w, weekStart: dateOnly(w.weekStart) })),
      })),
    })),
    reflections: reflections.map((x) => ({ ...x, weekStart: dateOnly(x.weekStart) })),
    meetings: meetings.map((x) => ({ ...x, meetingDate: dateOnly(x.meetingDate) })),
  };
}
