// Private data checks against a disposable PostgreSQL 17 database.
// All test rows are rolled back; no real account or health data is used.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const a = randomUUID(), b = randomUUID();
async function rejected(sql, args, code) {
  await db.query("SAVEPOINT error_case");
  try {
    await assert.rejects(db.query(sql, args), (error) => error.code === code);
  } finally {
    await db.query("ROLLBACK TO SAVEPOINT error_case");
    await db.query("RELEASE SAVEPOINT error_case");
  }
}
try {
  await db.connect();
  await db.query("BEGIN");
  for (const id of [a, b]) {
    await db.query('INSERT INTO "user" ("id","name","email","updatedAt") VALUES ($1, $2, $3, NOW())',
      [id, "Testaccount", id + "@example.test"]);
  }
  const reflectSQL = 'INSERT INTO "weekly_reflection" ("id","userId","weekStart","wentWell","updatedAt") VALUES ($1,$2,$3,$4,NOW())';
  await db.query(reflectSQL, [randomUUID(), a, "2026-10-26", "Fictieve observatie"]);
  await db.query(reflectSQL, [randomUUID(), b, "2026-10-26", "Andere fictieve observatie"]);
  await rejected(reflectSQL, [randomUUID(), a, "2026-10-26", "Duplicaat"], "23505");
  await rejected(reflectSQL, [randomUUID(), a, "2026-10-27", "Verkeerde dag"], "23514");
  await rejected(reflectSQL, [randomUUID(), a, "2026-11-02", "  "], "23514");
  const rows = await db.query('SELECT "wentWell" FROM "weekly_reflection" WHERE "userId"=$1', [a]);
  assert.equal(rows.rowCount, 1);
  assert.equal(rows.rows[0].wentWell, "Fictieve observatie");
  const otherUserEdit = await db.query(
    'UPDATE "weekly_reflection" SET "wentWell"=$1 WHERE "userId"=$2 AND "weekStart"=$3',
    ["Mag niet wijzigen", a, "2026-10-19"]);
  assert.equal(otherUserEdit.rowCount, 0);
  const noteSQL = 'INSERT INTO "meeting_note" ("id","userId","meetingDate","title","notes","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW())';
  await db.query(noteSQL, [randomUUID(), b, "2026-10-20", "Groep", "Fictieve notitie"]);
  const edit = await db.query('DELETE FROM "meeting_note" WHERE "userId"=$1', [a]);
  assert.equal(edit.rowCount, 0);
  const ownNotes = await db.query('SELECT "id" FROM "meeting_note" WHERE "userId"=$1', [a]);
  assert.equal(ownNotes.rowCount, 0);
  console.log("Reflections: unique weeks, ownership scoped reads/writes and DB constraints verified.");
} finally {
  try { await db.query("ROLLBACK"); } finally { await db.end(); }
}
