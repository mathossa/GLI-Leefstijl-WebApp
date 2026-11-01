import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { retryTransaction } from "@/lib/transaction-retry.mjs";

export function serializableTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return retryTransaction(() => prisma.$transaction(work, { isolationLevel: "Serializable" }));
}
