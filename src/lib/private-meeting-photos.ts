import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import type { Prisma } from "@/generated/prisma/client";
import { serializableTransaction } from "@/lib/transactions";
import { privatePhotoFolder } from "@/lib/user-photo-cleanup";
import { FormInputError } from "@/lib/goals-domain.mjs";

export const MAX_MEETING_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const allowedTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
]);

function storagePath(userId: string, photoId: string) {
  if (!/^[a-f0-9-]{36}$/.test(photoId)) throw new FormInputError();
  return join(privatePhotoFolder(userId), photoId + ".webp");
}

export async function photoBytes(userId: string, photoId: string) {
  return readFile(storagePath(userId, photoId));
}

export async function deletePhotoFile(userId: string, photoId: string) {
  try {
    await unlink(storagePath(userId, photoId));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function validatePhoto(input: FormDataEntryValue | null): Promise<{
  buffer: Buffer; originalName: string;
} | null> {
  if (!input) return null;
  if (!(input instanceof File)) throw new FormInputError();
  if (input.size === 0 && !input.name) return null;
  if (input.size === 0 || input.size > MAX_PHOTO_BYTES || !allowedTypes.has(input.type)) {
    throw new FormInputError();
  }
  const bytes = Buffer.from(await input.arrayBuffer());
  try {
    const pipeline = sharp(bytes, { limitInputPixels: 30_000_000, failOn: "error" });
    const metadata = await pipeline.metadata();
    if (!["jpeg", "png", "webp", "heif"].includes(metadata.format) ||
        !metadata.width || !metadata.height) throw new FormInputError();
    // Re-encode and intentionally discard EXIF, GPS, camera serial and other metadata.
    const normalized = await pipeline.rotate()
      .resize({ width: 1800, height: 2400, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85, effort: 4 })
      .toBuffer();
    return {
      buffer: normalized,
      originalName: input.name.replace(/[\\/\x00-\x1F]/g, "").slice(0, 120) || "Notitiefoto",
    };
  } catch (error) {
    if (error instanceof FormInputError) throw error;
    throw new FormInputError();
  }
}

/** Stage bytes once, then commit the meeting and photo metadata together.
 * The retryable transaction contains only database work, never file writes.
 */
export async function saveMeetingWithPhoto(
  userId: string,
  image: { buffer: Buffer; originalName: string } | null,
  save: (tx: Prisma.TransactionClient) => Promise<string>,
) {
  const id = randomUUID();
  if (image) {
    await mkdir(privatePhotoFolder(userId), { recursive: true, mode: 0o700 });
    await writeFile(storagePath(userId, id), image.buffer, { flag: "wx", mode: 0o600 });
  }
  try {
    return await serializableTransaction(async (tx) => {
      const meetingId = await save(tx);
      if (image) {
        // Validate ownership here as well as in callers. Serializable isolation
        // prevents concurrent uploads from passing the same count check.
        const meeting = await tx.meetingNote.findFirst({
          where: { id: meetingId, userId }, select: { id: true },
        });
        if (!meeting) throw new FormInputError();
        const count = await tx.meetingPhoto.count({ where: { userId, meetingId } });
        if (count >= MAX_MEETING_PHOTOS) throw new FormInputError();
        await tx.meetingPhoto.create({
          data: { id, userId, meetingId, fileName: image.originalName },
        });
      }
      return meetingId;
    });
  } catch (error) {
    if (image) await deletePhotoFile(userId, id);
    throw error;
  }
}
