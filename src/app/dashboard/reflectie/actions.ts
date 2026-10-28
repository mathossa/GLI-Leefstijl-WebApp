"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { FormInputError } from "@/lib/goals-domain.mjs";
import { parseOwnedId, parseReflectionWeek, parseReflection, parseMeeting } from "@/lib/reflections-domain.mjs";

const route = "/dashboard/reflectie";
async function complete(task: () => Promise<void>) {
  try { await task(); }
  catch (error) {
    if (error instanceof FormInputError) redirect(route + "?melding=ongeldig");
    throw error;
  }
  revalidatePath(route);
  revalidatePath("/dashboard/inzichten");
  redirect(route + "?melding=opgeslagen");
}

export async function saveReflection(form: FormData) {
  const { user } = await requireSession();
  return complete(async () => {
    const weekStart = parseReflectionWeek(form.get("weekStart"));
    const data = parseReflection(form);
    await prisma.weeklyReflection.upsert({
      where: { userId_weekStart: { userId: user.id, weekStart } },
      create: { userId: user.id, weekStart, ...data },
      update: data,
    });
  });
}

export async function deleteReflection(form: FormData) {
  const { user } = await requireSession();
  return complete(async () => {
    const weekStart = parseReflectionWeek(form.get("weekStart"));
    await prisma.weeklyReflection.deleteMany({ where: { userId: user.id, weekStart } });
  });
}

export async function createMeeting(form: FormData) {
  const { user } = await requireSession();
  return complete(async () => {
    await prisma.meetingNote.create({ data: { userId: user.id, ...parseMeeting(form) } });
  });
}

export async function updateMeeting(form: FormData) {
  const { user } = await requireSession();
  return complete(async () => {
    const id = parseOwnedId(form);
    const result = await prisma.meetingNote.updateMany({
      where: { id, userId: user.id }, data: parseMeeting(form),
    });
    if (result.count !== 1) throw new FormInputError();
  });
}

export async function deleteMeeting(form: FormData) {
  const { user } = await requireSession();
  return complete(async () => {
    const id = parseOwnedId(form);
    const result = await prisma.meetingNote.deleteMany({ where: { id, userId: user.id } });
    if (result.count !== 1) throw new FormInputError();
  });
}
