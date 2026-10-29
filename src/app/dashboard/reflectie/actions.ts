"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { FormInputError } from "@/lib/goals-domain.mjs";
import { parseOwnedId, parseReflectionWeek, parseReflection, parseMeeting } from "@/lib/reflections-domain.mjs";
import { validatePhoto, storeMeetingPhoto, deletePhotoFile } from "@/lib/private-meeting-photos";

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
    const image = await validatePhoto(form.get("photo"));
    const meeting = await prisma.meetingNote.create({ data: { userId: user.id, ...parseMeeting(form) } });
    if (image) await storeMeetingPhoto(user.id, meeting.id, image);
  });
}

export async function updateMeeting(form: FormData) {
  const { user } = await requireSession();
  return complete(async () => {
    const id = parseOwnedId(form);
    const image = await validatePhoto(form.get("photo"));
    const result = await prisma.meetingNote.updateMany({
      where: { id, userId: user.id }, data: parseMeeting(form),
    });
    if (result.count !== 1) throw new FormInputError();
    if (image) await storeMeetingPhoto(user.id, id, image);
  });
}

export async function deleteMeeting(form: FormData) {
  const { user } = await requireSession();
  return complete(async () => {
    const id = parseOwnedId(form);
    const photos = await prisma.meetingPhoto.findMany({
      where: { userId: user.id, meetingId: id }, select: { id: true },
    });
    const result = await prisma.meetingNote.deleteMany({ where: { id, userId: user.id } });
    if (result.count !== 1) throw new FormInputError();
    for (const photo of photos) await deletePhotoFile(user.id, photo.id);
  });
}

export async function uploadMeetingPhoto(form: FormData) {
  const { user } = await requireSession();
  return complete(async () => {
    const id = parseOwnedId(form);
    const image = await validatePhoto(form.get("photo"));
    if (!image) throw new FormInputError();
    const meeting = await prisma.meetingNote.findFirst({
      where: { id, userId: user.id }, select: { id: true },
    });
    if (!meeting) throw new FormInputError();
    await storeMeetingPhoto(user.id, id, image);
  });
}

export async function deleteMeetingPhoto(form: FormData) {
  const { user } = await requireSession();
  return complete(async () => {
    const id = parseOwnedId(form);
    const photo = await prisma.meetingPhoto.findFirst({
      where: { id, userId: user.id }, select: { id: true },
    });
    if (!photo) throw new FormInputError();
    await prisma.meetingPhoto.deleteMany({ where: { id, userId: user.id } });
    await deletePhotoFile(user.id, photo.id);
  });
}
