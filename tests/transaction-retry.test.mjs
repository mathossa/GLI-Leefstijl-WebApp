import assert from "node:assert/strict";
import test from "node:test";
import { retryTransaction } from "../src/lib/transaction-retry.mjs";

test("retries rolled-back serialization conflicts and returns the committed result", async () => {
  let calls = 0;
  const result = await retryTransaction(async () => {
    if (++calls < 3) throw Object.assign(new Error("conflict"), { code: "P2034" });
    return { committed: true };
  });
  assert.deepEqual(result, { committed: true });
  assert.equal(calls, 3);
});

test("does not retry validation, storage, or uniqueness failures", async () => {
  for (const error of [new Error("storage"), { code: "P2002" }, null]) {
    let calls = 0;
    await assert.rejects(retryTransaction(async () => { calls++; throw error; }), e => e === error);
    assert.equal(calls, 1);
  }
});

test("stops after four transaction attempts", async () => {
  let calls = 0;
  const error = { code: "P2034" };
  await assert.rejects(retryTransaction(async () => { calls++; throw error; }), e => e === error);
  assert.equal(calls, 4);
});
