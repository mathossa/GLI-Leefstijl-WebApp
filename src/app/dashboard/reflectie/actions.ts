"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { FormInputError } from "@/lib/goals-domain.mjs";
import { parseDate, parseOwnedId, parseReflectionWeek, parseReflection, parseMeeting } from "@/lib/reflections-domain.mjs";
import { validatePhoto, storeMeetingPhoto, deletePhotoFile } from "@/lib/private-meeting-photos";

const route = "/dashboard/reflectie";

export type ReflectionFormState = { error: string | null };

// Unlike deleting records, saving a draft must never redirect on a validation
// error: that would unmount the dialog and discard the user's unsaved writing.
async function completeForm(
  task: () => Promise<void>,
  errorMessage: string,
): Promise<ReflectionFormState> {
  try { await task(); }
  catch (error) {
    if (error instanceof FormInputError) return { error: errorMessage };
    // Never drop a user's writing on a transient database/storage failure.
    // Log only the error type: personal notes must not reach application logs.
    console.error("Reflectie opslaan mislukt:", error instanceof Error ? error.name : "unknown");
    return { error: "Opslaan is niet gelukt door een technische fout. Je tekst staat nog in dit formulier; probeer het opnieuw." };
  }
  revalidatePath(route);
  revalidatePath("/dashboard/inzichten");
  redirect(route + "?melding=opgeslagen");
}

function meetingErrorMessage(form: FormData): string {
  const title = form.get("title");
  if (typeof title !== "string" || !title.trim()) {
    return "Vul een titel voor je bijeenkomst in. De overige invoer is behouden.";
  }
  try { parseDate(form.get("meetingDate")); }
  catch {
    return "Controleer de datum (tussen 2000 en 2100). Bijeenkomsten in het verleden zijn toegestaan; je tekst blijft staan.";
  }
  return "Controleer de lengte van je tekst en de eventuele foto (maximaal 8 MB, JPG/PNG/WebP/HEIC). Je invoer blijft staan.";
}

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

export async function saveReflection(_previous: ReflectionFormState, form: FormData): Promise<ReflectionFormState> {
  const { user } = await requireSession();
  return completeForm(async () => {
    const weekStart = parseReflectionWeek(form.get("weekStart"));
    const data = parseReflection(form);
    await prisma.weeklyReflection.upsert({
      where: { userId_weekStart: { userId: user.id, weekStart } },
      create: { userId: user.id, weekStart, ...data },
      update: data,
    });
  }, "Vul minimaal één antwoord in en controleer de lengte (maximaal 1500 tekens per veld). Je invoer is behouden.");
}

export async function deleteReflection(form: FormData) {
  const { user } = await requireSession();
  return complete(async () => {
    const weekStart = parseReflectionWeek(form.get("weekStart"));
    await prisma.weeklyReflection.deleteMany({ where: { userId: user.id, weekStart } });
  });
}

export async function createMeeting(_previous: ReflectionFormState, form: FormData): Promise<ReflectionFormState> {
  const { user } = await requireSession();
  return completeForm(async () => {
    const data = parseMeeting(form);
    const image = await validatePhoto(form.get("photo"));
    const meeting = await prisma.meetingNote.create({ data: { userId: user.id, ...data } });
    if (image) await storeMeetingPhoto(user.id, meeting.id, image);
  }, meetingErrorMessage(form));
}

export async function updateMeeting(_previous: ReflectionFormState, form: FormData): Promise<ReflectionFormState> {
  const { user } = await requireSession();
  return completeForm(async () => {
    const id = parseOwnedId(form);
    const data = parseMeeting(form);
    const image = await validatePhoto(form.get("photo"));
    const result = await prisma.meetingNote.updateMany({
      where: { id, userId: user.id }, data,
    });
    if (result.count !== 1) throw new FormInputError();
    if (image) await storeMeetingPhoto(user.id, id, image);
  }, meetingErrorMessage(form));
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
