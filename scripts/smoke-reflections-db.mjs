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

  // A target snapshot is not a registration unless there was activity or a note.
  const goalId = randomUUID(), actionId = randomUUID(), weekId = randomUUID();
  await db.query('INSERT INTO "goal" ("id","userId","title","motivation","area","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW())',
    [goalId, a, "Fictief doel", "", "BEWEGING"]);
  await db.query('INSERT INTO "habit_action" ("id","userId","goalId","title","targetPerWeek","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW())',
    [actionId, a, goalId, "Fictieve actie", 3]);
  await db.query('INSERT INTO "habit_week_progress" ("id","userId","actionId","weekStart","targetCount","updatedAt") VALUES ($1,$2,$3,$4,3,NOW())',
    [weekId, a, actionId, "2026-10-26"]);
  const registeredSQL = 'SELECT COUNT(*)::int AS total FROM "habit_week_progress" WHERE "id"=$1 AND ("completedCount">0 OR "note" IS NOT NULL OR EXISTS (SELECT 1 FROM "habit_week_entry" WHERE "weekId"=$1))';
  assert.equal((await db.query(registeredSQL,[weekId])).rows[0].total,0,"Automatic snapshot must not count as a registration");
  await db.query('UPDATE "habit_week_progress" SET "completedCount"=1 WHERE "id"=$1',[weekId]);
  assert.equal((await db.query(registeredSQL,[weekId])).rows[0].total,1,"Logged completion must count");
  console.log("Reflections: unique weeks, ownership and registered week predicates verified.");
} finally {
  try { await db.query("ROLLBACK"); } finally { await db.end(); }
}
