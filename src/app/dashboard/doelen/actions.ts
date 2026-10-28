"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import {
  amsterdamMonday, FormInputError, MAX_ACTIVE_ACTIONS, MAX_ACTIVE_GOALS,
  ownedWhere, parseActionForm, parseGoalForm, parseProgressForm, parseEntryFeedback,
} from "@/lib/goals-domain.mjs";

const doneUrl = "/dashboard/doelen?melding=opgeslagen";
const invalidUrl = "/dashboard/doelen?melding=ongeldig";

async function finish(work: () => Promise<void>) {
  try {
    await work();
  } catch (error) {
    if (error instanceof FormInputError) redirect(invalidUrl);
    throw error;
  }
  revalidatePath("/dashboard/doelen");
  revalidatePath("/dashboard");
  redirect(doneUrl);
}

function idFrom(form: FormData, key: string) {
  const value = form.get(key);
  if (typeof value !== "string" || !value || value.length > 128) throw new FormInputError();
  return value;
}

export async function createGoal(form: FormData) {
  const { user } = await requireSession();
  return finish(async () => {
    const input = parseGoalForm(form);
    await prisma.$transaction(async (tx) => {
      const count = await tx.goal.count({ where: { userId: user.id, status: "ACTIVE" } });
      if (count >= MAX_ACTIVE_GOALS) throw new FormInputError();
      await tx.goal.create({
        data: { userId: user.id, ...input, area: input.area as "BEWEGING" | "VOEDING" | "SLAAP" | "ONTSPANNING" | "SOCIAAL" | "ANDERS" },
      });
    }, { isolationLevel: "Serializable" });
  });
}

export async function updateGoal(form: FormData) {
  const { user } = await requireSession();
  return finish(async () => {
    const id = idFrom(form, "goalId");
    const input = parseGoalForm(form);
    const result = await prisma.goal.updateMany({
      where: { ...ownedWhere(user.id, id), status: "ACTIVE" },
      data: { ...input, area: input.area as "BEWEGING" | "VOEDING" | "SLAAP" | "ONTSPANNING" | "SOCIAAL" | "ANDERS" },
    });
    if (result.count !== 1) throw new FormInputError();
  });
}

export async function archiveGoal(form: FormData) {
  const { user } = await requireSession();
  return finish(async () => {
    const id = idFrom(form, "goalId");
    const result = await prisma.goal.updateMany({
      where: { ...ownedWhere(user.id, id), status: "ACTIVE" },
      data: { status: "ARCHIVED" },
    });
    if (result.count !== 1) throw new FormInputError();
  });
}

export async function createHabitAction(form: FormData) {
  const { user } = await requireSession();
  return finish(async () => {
    const goalId = idFrom(form, "goalId");
    const input = parseActionForm(form);
    await prisma.$transaction(async (tx) => {
      const goal = await tx.goal.findFirst({
        where: { ...ownedWhere(user.id, goalId), status: "ACTIVE" },
        select: { id: true },
      });
      if (!goal) throw new FormInputError();
      const count = await tx.habitAction.count({
        where: { userId: user.id, goalId, archivedAt: null },
      });
      if (count >= MAX_ACTIVE_ACTIONS) throw new FormInputError();
      await tx.habitAction.create({ data: { userId: user.id, goalId, ...input } });
    }, { isolationLevel: "Serializable" });
  });
}

export async function updateHabitAction(form: FormData) {
  const { user } = await requireSession();
  return finish(async () => {
    const id = idFrom(form, "actionId");
    const input = parseActionForm(form);
    const weekStart = amsterdamMonday();
    await prisma.$transaction(async (tx) => {
      const current = await tx.habitAction.findFirst({
        where: { ...ownedWhere(user.id, id), archivedAt: null, goal: { status: "ACTIVE" } },
        select: { targetPerWeek: true },
      });
      if (!current) throw new FormInputError();
      // Freeze THIS week's original target. Revisions take effect next Monday.
      await tx.habitWeekProgress.upsert({
        where: { actionId_weekStart: { actionId: id, weekStart }, userId: user.id },
        update: {},
        create: {
          actionId: id, userId: user.id, weekStart,
          targetCount: current.targetPerWeek, completedCount: 0,
        },
      });
      const updated = await tx.habitAction.updateMany({
        where: { ...ownedWhere(user.id, id), archivedAt: null },
        data: input,
      });
      if (updated.count !== 1) throw new FormInputError();
    }, { isolationLevel: "Serializable" });
  });
}

export async function archiveHabitAction(form: FormData) {
  const { user } = await requireSession();
  return finish(async () => {
    const id = idFrom(form, "actionId");
    const result = await prisma.habitAction.updateMany({
      where: { ...ownedWhere(user.id, id), archivedAt: null, goal: { status: "ACTIVE" } },
      data: { archivedAt: new Date() },
    });
    if (result.count !== 1) throw new FormInputError();
  });
}

export async function saveWeekProgress(form: FormData) {
  const { user } = await requireSession();
  return finish(async () => {
    const actionId = idFrom(form, "actionId");
    const weekStart = amsterdamMonday();
    const action = await prisma.habitAction.findFirst({
      where: { ...ownedWhere(user.id, actionId), archivedAt: null, goal: { status: "ACTIVE" } },
      select: { targetPerWeek: true },
    });
    if (!action) throw new FormInputError();
    const previous = await prisma.habitWeekProgress.findFirst({
      where: { userId: user.id, actionId, weekStart },
      select: { targetCount: true },
    });
    const targetCount = previous?.targetCount ?? action.targetPerWeek;
    const input = parseProgressForm(form, targetCount);
    await prisma.habitWeekProgress.upsert({
      where: { actionId_weekStart: { actionId, weekStart }, userId: user.id },
      create: { userId: user.id, actionId, weekStart, targetCount, ...input },
      update: input,
    });
  });
}

/** One click from Today. No note or assessment is required. */
export async function logCompletion(actionId: string): Promise<{ ok: boolean; reason?: string }> {
  const { user } = await requireSession();
  try {
    if (!actionId || actionId.length > 128) throw new FormInputError();
    const weekStart = amsterdamMonday();
    await prisma.$transaction(async (tx) => {
      const action = await tx.habitAction.findFirst({
        where: { ...ownedWhere(user.id, actionId), archivedAt: null, goal: { status: "ACTIVE" } },
        select: { targetPerWeek: true },
      });
      if (!action) throw new FormInputError();
      const week = await tx.habitWeekProgress.upsert({
        where: { actionId_weekStart: { actionId, weekStart }, userId: user.id },
        update: {},
        create: { actionId, userId: user.id, weekStart, targetCount: action.targetPerWeek, completedCount: 0 },
        select: { id: true, targetCount: true },
      });
      // Atomic conditional increment prevents exceeding the weekly target.
      const changed = await tx.habitWeekProgress.updateMany({
        where: { id: week.id, userId: user.id, completedCount: { lt: week.targetCount } },
        data: { completedCount: { increment: 1 } },
      });
      if (changed.count !== 1) throw new FormInputError();
      await tx.habitWeekEntry.create({ data: { userId: user.id, weekId: week.id } });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof FormInputError) return { ok: false, reason: "Deze actie is niet beschikbaar of je weekdoel is al bereikt." };
    throw error;
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/doelen");
  return { ok: true };
}

/** Preserves the weekly narrative separately from per-occurrence notes. */
export async function saveWeekReflection(form: FormData) {
  const { user } = await requireSession();
  return finish(async () => {
    const actionId = idFrom(form, "actionId");
    const raw = form.get("note");
    if (typeof raw !== "string" || raw.trim().length > 500) throw new FormInputError();
    const weekStart = amsterdamMonday();
    const action = await prisma.habitAction.findFirst({
      where: { ...ownedWhere(user.id, actionId), archivedAt: null, goal: { status: "ACTIVE" } },
      select: { targetPerWeek: true },
    });
    if (!action) throw new FormInputError();
    await prisma.habitWeekProgress.upsert({
      where: { actionId_weekStart: { actionId, weekStart }, userId: user.id },
      create: { actionId, userId: user.id, weekStart, targetCount: action.targetPerWeek, note: raw.trim() || null },
      update: { note: raw.trim() || null },
    });
  });
}

export type EntryFeedbackState = { ok: boolean; message: string };
export async function saveEntryFeedback(
  _previous: EntryFeedbackState,
  form: FormData,
): Promise<EntryFeedbackState> {
  const { user } = await requireSession();
  try {
    const entryId = idFrom(form, "entryId");
    const input = parseEntryFeedback(form);
    const changed = await prisma.habitWeekEntry.updateMany({
      where: { id: entryId, userId: user.id, week: { action: { userId: user.id, archivedAt: null, goal: { status: "ACTIVE" } } } },
      data: input,
    });
    if (changed.count !== 1) throw new FormInputError();
  } catch (error) {
    if (error instanceof FormInputError) return { ok: false, message: "Deze registratie is niet beschikbaar of de invoer is ongeldig." };
    throw error;
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/doelen");
  return { ok: true, message: "Ervaring opgeslagen." };
}
