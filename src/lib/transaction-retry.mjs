import { setTimeout as delay } from "node:timers/promises";

/** Retry only rolled-back serialization conflicts, never validation/I/O failures.
 * The callback must contain database work only, with no external side effects.
 * @template T
 * @param {() => Promise<T>} work
 * @returns {Promise<T>}
 */
export async function retryTransaction(work) {
  for (let attempt = 0; ; attempt++) {
    try { return await work(); }
    catch (error) {
      if (error?.code !== "P2034" || attempt >= 3) throw error;
      await delay(20 * 2 ** attempt + Math.floor(Math.random() * 20));
    }
  }
}
