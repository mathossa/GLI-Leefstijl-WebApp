// Native filesystem-only helper. Better Auth's CLI must be able to import
// its auth configuration without resolving Next.js "server-only" modules.
import { createHash } from "node:crypto";
import { rm } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

export function privatePhotoFolder(userId: string) {
  // Runtime volume, never a build input. Prevent tracing private uploads (or
  // the whole repository) into Next's standalone distribution.
  const root = resolve(/*turbopackIgnore: true*/ process.env.PRIVATE_UPLOAD_DIR ?? join(process.cwd(), ".private-uploads"));
  const publicRoot = resolve(process.cwd(), "public");
  if (root === publicRoot || root.startsWith(publicRoot + sep)) {
    throw new Error("PRIVATE_UPLOAD_DIR must not be inside /public");
  }
  return join(/*turbopackIgnore: true*/ root, createHash("sha256").update(userId).digest("hex"));
}

export async function deleteAllUserPhotoFiles(userId: string) {
  await rm(privatePhotoFolder(userId), { recursive: true, force: true });
}
