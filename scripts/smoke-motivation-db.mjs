// CI-only database smoke. All fictional accounts and modifications are rolled back.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const alice = randomUUID(), bob = randomUUID();
async function rejected(sql, args, code) {
  await db.query("SAVEPOINT failed_write");
  try {
    await assert.rejects(db.query(sql, args), (error) => error.code === code);
  } finally {
    await db.query("ROLLBACK TO SAVEPOINT failed_write");
    await db.query("RELEASE SAVEPOINT failed_write");
  }
}
try {
  await db.connect();
  await db.query("BEGIN");
  const seeded = await db.query('SELECT "id", "text" FROM "motivation_quote" WHERE "isActive"=true ORDER BY "id"');
  assert.equal(seeded.rowCount, 30, "migration must seed the 30 starter quotes");
  for (const id of [alice, bob]) {
    await db.query('INSERT INTO "user" ("id","name","email","updatedAt") VALUES ($1,$2,$3,NOW())',
      [id, "Fictief", `${id}@example.test`]);
  }
  await db.query('INSERT INTO "user_quote_preference" ("userId","mode","customText","updatedAt") VALUES ($1,$2,$3,NOW())',
    [alice, "CUSTOM", "Ik wil buiten wandelen"]);
  await db.query('INSERT INTO "user_quote_preference" ("userId","mode","customText","updatedAt") VALUES ($1,$2,$3,NOW())',
    [bob, "CUSTOM", "Fietsen voelt fijn"]);
  const own = await db.query('SELECT "customText" FROM "user_quote_preference" WHERE "userId"=$1', [alice]);
  assert.deepEqual(own.rows.map((row) => row.customText), ["Ik wil buiten wandelen"]);
  await db.query('UPDATE "user_quote_preference" SET "mode"=$1 WHERE "userId"=$2', ["AUTO", alice]);
  const preserved = await db.query('SELECT "customText" FROM "user_quote_preference" WHERE "userId"=$1', [alice]);
  assert.equal(preserved.rows[0].customText, "Ik wil buiten wandelen");
  await rejected('INSERT INTO "user_quote_preference" ("userId","customText","updatedAt") VALUES ($1,$2,NOW())',
    [randomUUID(), "Geen gebruiker"], "23503");
  await rejected('UPDATE "user_quote_preference" SET "customText"=$1 WHERE "userId"=$2',
    ["X".repeat(301), alice], "22001");
  await db.query('INSERT INTO "daily_motivation_quote" ("day","quoteId","text") VALUES ($1,$2,$3)',
    ["2026-10-31", seeded.rows[0].id, seeded.rows[0].text]);
  await rejected('INSERT INTO "daily_motivation_quote" ("day","quoteId","text") VALUES ($1,$2,$3)',
    ["2026-10-31", seeded.rows[1].id, seeded.rows[1].text], "23505");
  await db.query('UPDATE "motivation_quote" SET "text"=$1 WHERE "id"=$2', ["Gewijzigd door beheerder", seeded.rows[0].id]);
  assert.equal((await db.query('SELECT "text" FROM "daily_motivation_quote" WHERE "day"=$1', ["2026-10-31"])).rows[0].text,
    seeded.rows[0].text, "existing daily quote snapshot must not change");
  await db.query('DELETE FROM "user" WHERE "id"=$1', [alice]);
  assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM "user_quote_preference" WHERE "userId"=$1', [alice])).rows[0].n, 0);
  assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM "user_quote_preference" WHERE "userId"=$1', [bob])).rows[0].n, 1);
  console.log("Motivation quotes: starter rows, user isolation, preservation, daily snapshot and cascade verified.");
} finally {
  try { await db.query("ROLLBACK"); } finally { await db.end(); }
}
