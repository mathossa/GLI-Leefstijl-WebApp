// Smoke tests run against CI's temporary PostgreSQL 17, inside one rolled-back transaction.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
const [userA, userB, goalA, goalB, actionA] = Array.from({ length: 5 }, () => randomUUID());
const insertGoal = `INSERT INTO "goal" ("id","userId","title","motivation","area","updatedAt") VALUES ($1,$2,'Testgoal','Fictieve motivatie','BEWEGING',NOW())`;
const insertAction = `INSERT INTO "habit_action" ("id","userId","goalId","title","targetPerWeek","updatedAt") VALUES ($1,$2,$3,'Fictieve actie',$4,NOW())`;
async function expectDbViolation(sql, params, code) {
  await client.query("SAVEPOINT expected_error");
  try {
    await assert.rejects(client.query(sql, params), (error) => error.code === code);
  } finally {
    await client.query("ROLLBACK TO SAVEPOINT expected_error");
    await client.query("RELEASE SAVEPOINT expected_error");
  }
}

try {
  await client.connect();
  await client.query("BEGIN");
  for (const id of [userA, userB]) {
    await client.query(`INSERT INTO "user" ("id","name","email","updatedAt") VALUES ($1,'CI Test',$2,NOW())`,
      [id, id + "@example.test"]);
  }
  await client.query(insertGoal, [goalA, userA]);
  await client.query(insertGoal, [goalB, userB]);

  const visible = await client.query(`SELECT "id" FROM "goal" WHERE "userId"=$1`, [userA]);
  assert.deepEqual(visible.rows.map((r) => r.id), [goalA], "Owner-scoped query must not return another user's goal");

  await expectDbViolation(insertAction, [randomUUID(), userA, goalB, 3], "23503");
  await expectDbViolation(insertAction, [randomUUID(), userA, goalA, 8], "23514");
  await client.query(insertAction, [actionA, userA, goalA, 3]);

  const insertWeek = `INSERT INTO "habit_week_progress"
    ("id","userId","actionId","weekStart","targetCount","completedCount","updatedAt")
    VALUES ($1,$2,$3,'2026-10-26',3,$4,NOW())`;
  await expectDbViolation(insertWeek, [randomUUID(), userB, actionA, 1], "23503");
  await expectDbViolation(insertWeek, [randomUUID(), userA, actionA, 4], "23514");
  const weekId = randomUUID();
  await client.query(insertWeek, [weekId, userA, actionA, 2]);
  await expectDbViolation(`INSERT INTO "habit_week_entry" ("id","userId","weekId") VALUES ($1,$2,$3)`, [randomUUID(), userB, weekId], "23503");
  await expectDbViolation(`INSERT INTO "habit_week_entry" ("id","userId","weekId","rating") VALUES ($1,$2,$3,$4)`, [randomUUID(), userA, weekId, "ONBEKEND"], "23514");
  await client.query(`INSERT INTO "habit_week_entry" ("id","userId","weekId","rating") VALUES ($1,$2,$3,$4)`, [randomUUID(), userA, weekId, "GOED"]);

  const weeksOtherUser = await client.query(`SELECT "id" FROM "habit_week_progress" WHERE "userId"=$1`, [userB]);
  assert.equal(weeksOtherUser.rowCount, 0);
  console.log("Goal and per-occurrence ownership, rating and weekly limits verified.");
} finally {
  try { await client.query("ROLLBACK"); } finally { await client.end(); }
}
