// Test additive SMTP tables and atomic global test-mail cooldown.
import assert from "node:assert/strict";
import pg from "pg";
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try {
  await client.query("BEGIN");
  await client.query(
    'INSERT INTO "admin_mail_settings" ("id","enabled","host","port","security","fromName","fromEmail","updatedAt") VALUES ($1,true,$2,587,$3,$4,$5,NOW())',
    ["smtp","smtp.example.test","STARTTLS","Mijn Leefstijl","noreply@example.test"],
  );
  const sql='UPDATE "admin_mail_settings" SET "lastTestAt"=NOW() WHERE "id"=$1 AND "enabled"=true AND ("lastTestAt" IS NULL OR "lastTestAt"<NOW()-INTERVAL \'5 minutes\') RETURNING "id"';
  assert.equal((await client.query(sql,["smtp"])).rowCount,1);
  assert.equal((await client.query(sql,["smtp"])).rowCount,0,"Must reject test within 5 minutes");
  await client.query('UPDATE "admin_mail_settings" SET "lastTestAt"=NOW()-INTERVAL \'6 minutes\' WHERE "id"=$1',["smtp"]);
  assert.equal((await client.query(sql,["smtp"])).rowCount,1,"Allowed after cooldown");
  for(const invalid of [{port:25,security:"STARTTLS"},{port:587,security:"PLAIN"}]){
    await client.query("SAVEPOINT invalid");
    try {
      await client.query('INSERT INTO "admin_mail_settings" ("id","port","security","updatedAt") VALUES ($1,$2,$3,NOW())',
        [String(invalid.port)+invalid.security,invalid.port,invalid.security]);
      assert.fail("Database must reject insecure relay");
    } catch(e) {
      assert.equal(e.code,"23514","Expected CHECK violation");
    }
    await client.query("ROLLBACK TO SAVEPOINT invalid");
  }
  await client.query("ROLLBACK");
  console.log("SMTP settings constraints and 5-minute atomic cooldown verified.");
} finally { await client.end(); }
