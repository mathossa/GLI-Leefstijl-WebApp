import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { amsterdamMonday } from "@/lib/goals-domain.mjs";
import { dateOnly } from "@/lib/reflections-domain.mjs";
import { ReflectionsOverview, type ReflectionView, type MeetingView } from "@/components/reflections-overview";

export const metadata: Metadata = { title: "Reflectie" };

export default async function ReflectionPage({
  searchParams,
}: { searchParams: Promise<{ melding?: string }> }) {
  const { user } = await requireSession();
  const week = amsterdamMonday();
  const [reflections, meetings] = await Promise.all([
    prisma.weeklyReflection.findMany({
      where: { userId: user.id }, orderBy: { weekStart: "desc" }, take: 52,
      select: { weekStart: true, wentWell: true, difficult: true, nextStep: true },
    }),
    prisma.meetingNote.findMany({
      where: { userId: user.id }, orderBy: [{ meetingDate: "desc" }, { createdAt: "desc" }], take: 100,
      select: { id: true, meetingDate: true, title: true, notes: true, actionPoints: true },
    }),
  ]);
  const data: ReflectionView[] = reflections.map((item) => ({
    weekStart: dateOnly(item.weekStart),
    wentWell: item.wentWell,
    difficult: item.difficult,
    nextStep: item.nextStep,
  }));
  const appointments: MeetingView[] = meetings.map((item) => ({
    id: item.id, meetingDate: dateOnly(item.meetingDate),
    title: item.title, notes: item.notes, actionPoints: item.actionPoints,
  }));
  return <ReflectionsOverview currentWeek={dateOnly(week)} reflections={data}
    meetings={appointments} message={(await searchParams).melding ?? null}/>;
}
