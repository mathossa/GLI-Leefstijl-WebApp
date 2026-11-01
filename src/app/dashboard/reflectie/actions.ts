"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializableTransaction } from "@/lib/transactions";
import { requireSession } from "@/lib/session";
import { FormInputError } from "@/lib/goals-domain.mjs";
import { MeetingInputError, parseOwnedId, parseReflectionWeek, parseReflection, parseMeeting } from "@/lib/reflections-domain.mjs";
import { validatePhoto, saveMeetingWithPhoto, deletePhotoFile } from "@/lib/private-meeting-photos";

const route = "/dashboard/reflectie";

export type ReflectionFormState = { error: string | null };

// Unlike deleting records, saving a draft must never redirect on a validation
// error: that would unmount the dialog and discard the user's unsaved writing.
async function completeForm(
  task: () => Promise<void>,
  errorMessage: string | ((error: FormInputError) => string),
): Promise<ReflectionFormState> {
  try { await task(); }
  catch (error) {
    if (error instanceof FormInputError) {
      return { error: typeof errorMessage === "string" ? errorMessage : errorMessage(error) };
    }
    // Never drop a user's writing on a transient database/storage failure.
    // Log only the error type: personal notes must not reach application logs.
    console.error("Reflectie opslaan mislukt:", error instanceof Error ? error.name : "unknown");
    return { error: "Opslaan is niet gelukt door een technische fout. Je tekst staat nog in dit formulier; probeer het opnieuw." };
  }
  revalidatePath(route);
  revalidatePath("/dashboard/inzichten");
  redirect(route + "?melding=opgeslagen");
}

function meetingErrorMessage(error: FormInputError): string {
  if (error instanceof MeetingInputError) {
    switch (error.field) {
      case "meetingDate":
        return "De bijeenkomst kon niet worden opgeslagen: controleer de datum (2000–2100). Datums in het verleden zijn toegestaan. Je tekst blijft staan.";
      case "title":
        return "Vul een titel voor je bijeenkomst in (maximaal 120 tekens). Je overige invoer blijft staan.";
      case "notes":
        return "De notitie is ongeldig of langer dan 4000 tekens. Je invoer blijft staan.";
      case "actionPoints":
        return "De actiepunten zijn ongeldig of langer dan 2000 tekens. Je invoer blijft staan.";
    }
  }
  return "De eventuele foto kon niet worden verwerkt (maximaal 8 MB, JPG/PNG/WebP/HEIC), of er zijn al vijf foto's opgeslagen. Je tekst blijft staan.";
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
    await saveMeetingWithPhoto(user.id, image, async (tx) => {
      const meeting = await tx.meetingNote.create({ data: { userId: user.id, ...data }, select: { id: true } });
      return meeting.id;
    });
  }, meetingErrorMessage);
}

export async function updateMeeting(_previous: ReflectionFormState, form: FormData): Promise<ReflectionFormState> {
  const { user } = await requireSession();
  return completeForm(async () => {
    const id = parseOwnedId(form);
    const data = parseMeeting(form);
    const image = await validatePhoto(form.get("photo"));
    await saveMeetingWithPhoto(user.id, image, async (tx) => {
      const result = await tx.meetingNote.updateMany({ where: { id, userId: user.id }, data });
      if (result.count !== 1) throw new FormInputError();
      return id;
    });
  }, meetingErrorMessage);
}

export async function deleteMeeting(form: FormData) {
  const { user } = await requireSession();
  return complete(async () => {
    const id = parseOwnedId(form);
    const photos = await serializableTransaction(async (tx) => {
      const photos = await tx.meetingPhoto.findMany({
        where: { userId: user.id, meetingId: id }, select: { id: true },
      });
      const result = await tx.meetingNote.deleteMany({ where: { id, userId: user.id } });
      if (result.count !== 1) throw new FormInputError();
      return photos;
    });
    await Promise.all(photos.map((photo) => deletePhotoFile(user.id, photo.id)));
  });
}

export async function uploadMeetingPhoto(form: FormData) {
  const { user } = await requireSession();
  return complete(async () => {
    const id = parseOwnedId(form);
    const meeting = await prisma.meetingNote.findFirst({
      where: { id, userId: user.id }, select: { id: true },
    });
    if (!meeting) throw new FormInputError();
    const image = await validatePhoto(form.get("photo"));
    if (!image) throw new FormInputError();
    await saveMeetingWithPhoto(user.id, image, async () => id);
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
