// Disposable PostgreSQL only. Roll back every change, including soft-deletes and audit.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
const db=new pg.Client({connectionString:process.env.DATABASE_URL});
if(!process.env.DATABASE_URL)throw Error("DATABASE_URL required");
const user=randomUUID(), added=randomUUID();
async function rejected(sql, params, code) {
  await db.query("SAVEPOINT failing");
  try { await assert.rejects(db.query(sql,params), error=>error.code===code); }
  finally { await db.query("ROLLBACK TO SAVEPOINT failing");await db.query("RELEASE SAVEPOINT failing"); }
}
try{
  await db.connect(); await db.query("BEGIN");
  const seeded=await db.query('SELECT "id","text","normalizedText","isActive" FROM "motivation_quote" WHERE "deletedAt" IS NULL ORDER BY "id"');
  assert.ok(seeded.rowCount>=30,"Existing seed rows must survive schema migration");
  assert.ok(seeded.rows.every(row=>row.normalizedText && row.normalizedText.length>0));
  await db.query('INSERT INTO "user" ("id","name","email","updatedAt") VALUES ($1,$2,$3,NOW())',[user,"Beheer","admin-test-"+user+"@example.test"]);
  const normal=seeded.rows[0].normalizedText;
  await rejected(
    'INSERT INTO "motivation_quote" ("id","text","normalizedText","updatedAt") VALUES ($1,$2,$3,NOW())',
    [added,"Dubbelfout",normal],"23505",
  );
  await db.query(
    'INSERT INTO "motivation_quote" ("id","text","normalizedText","category","isActive","origin","updatedAt") VALUES ($1,$2,$3,$4,true,$5,NOW())',
    [added,"Fictieve testquote","fictieve testquote","BEWEGEN","ADMIN"],
  );
  await db.query('INSERT INTO "admin_audit" ("id","actorId","targetId","action") VALUES ($1,$2,$3,$4)',
    [randomUUID(),user,added,"quotes.created"]);
  assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM "admin_audit" WHERE "targetId"=$1',[added])).rows[0].n,1);
  // Daily selection already captured before edit remains unchanged.
  const original=seeded.rows[0];
  await db.query('INSERT INTO "daily_motivation_quote" ("day","quoteId","text") VALUES ($1,$2,$3)',
    ["2027-01-01",original.id,original.text]);
  await db.query('UPDATE "motivation_quote" SET "text"=$1,"normalizedText"=$2 WHERE "id"=$3',
    ["Bewerkt","bewerkt",original.id]);
  assert.equal((await db.query('SELECT "text" FROM "daily_motivation_quote" WHERE "day"=$1',["2027-01-01"])).rows[0].text, original.text);
  await db.query('UPDATE "motivation_quote" SET "isActive"=false,"deletedAt"=NOW() WHERE "id"=$1',[added]);
  assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM "motivation_quote" WHERE "id"=$1 AND "deletedAt" IS NOT NULL AND "isActive"=false',[added])).rows[0].n,1);
  await db.query('UPDATE "motivation_quote" SET "deletedAt"=NULL WHERE "id"=$1',[added]);
  assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM "motivation_quote" WHERE "id"=$1 AND "deletedAt" IS NULL',[added])).rows[0].n,1);
  console.log("Quote library: seed preservation, duplicate safety, audit target, day snapshot and soft-delete verified.");
} finally {try{await db.query("ROLLBACK")} finally{await db.end()}}
