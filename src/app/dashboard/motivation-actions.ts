"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

type SaveResult = { ok: true } | { ok: false; message: string };

export async function saveMotivationPreference(mode: string, text: string): Promise<SaveResult> {
  const { user } = await requireSession();
  if (mode !== "AUTO" && mode !== "CUSTOM") {
    return { ok: false, message: "Kies automatisch of eigen tekst." };
  }
  // Never read a user ID from the client. Switching back to AUTO keeps customText.
  const customText = typeof text === "string" ? text.trim() : "";
  if (mode === "CUSTOM" && (customText.length < 1 || customText.length > 300)) {
    return { ok: false, message: "Schrijf een eigen tekst van maximaal 300 tekens." };
  }
  await prisma.userQuotePreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, mode, customText: mode === "CUSTOM" ? customText : null },
    update: mode === "CUSTOM" ? { mode, customText } : { mode },
  });
  revalidatePath("/dashboard");
  return { ok: true };
}
