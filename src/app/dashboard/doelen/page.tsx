import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { amsterdamMonday } from "@/lib/goals-domain.mjs";
import { GoalsOverview, type GoalView } from "@/components/goals-overview";

export const metadata: Metadata = { title: "Mijn doelen" };

const isoDate = (date: Date | null) => date?.toISOString().slice(0, 10) ?? null;

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ melding?: string }>;
}) {
  const { user } = await requireSession();
  const weekStart = amsterdamMonday();
  const all = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      actions: {
        where: { userId: user.id },
        orderBy: [{ archivedAt: "asc" }, { createdAt: "desc" }],
        include: {
          weeks: {
            where: { userId: user.id },
            orderBy: { weekStart: "desc" },
            take: 8,
            include: {
              entries: { orderBy: { createdAt: "desc" }, take: 8 },
            },
          },
        },
      },
    },
  });
  // Explicit serializable DTOs: no session information or other users' data
  // reaches the client component, and no Prisma Date objects cross the boundary.
  const goals: GoalView[] = all.map((goal) => ({
    id: goal.id,
    title: goal.title,
    motivation: goal.motivation,
    area: goal.area,
    status: goal.status,
    startDate: isoDate(goal.startDate),
    endDate: isoDate(goal.endDate),
    actions: goal.actions.map((action) => ({
      id: action.id,
      title: action.title,
      targetPerWeek: action.targetPerWeek,
      archived: action.archivedAt !== null,
      weeks: action.weeks.map((week) => ({
        id: week.id,
        weekStart: isoDate(week.weekStart) ?? "",
        targetCount: week.targetCount,
        completedCount: week.completedCount,
        note: week.note,
        entries: week.entries.map((entry) => ({
          id: entry.id,
          createdAt: entry.createdAt.toISOString(),
          rating: entry.rating,
          note: entry.note,
        })),
      })),
    })),
  }));
  return (
    <GoalsOverview
      goals={goals}
      currentWeek={weekStart.toISOString().slice(0, 10)}
      message={(await searchParams).melding ?? null}
    />
  );
}
