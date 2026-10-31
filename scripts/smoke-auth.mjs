// Small HTTP-level smoke suite for the Better Auth API and Next.js access checks.
// Invoked only in CI against an isolated disposable PostgreSQL database.
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { mkdir, writeFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import pg from "pg";
import { PDFArray, PDFDocument } from "pdf-lib";

const base = process.env.BETTER_AUTH_URL || "http://127.0.0.1:3000";
const origin = new URL(base).origin;
const adminPassword = process.env.CI_ADMIN_PASSWORD;
assert.ok(adminPassword, "CI_ADMIN_PASSWORD must be provided by CI");

async function get(path, cookie = "") {
  return fetch(origin + path, { redirect: "manual", headers: cookie ? { cookie } : {} });
}
async function post(path, body, cookie = "") {
  return fetch(origin + path, {
    method: "POST", redirect: "manual",
    headers: { "content-type": "application/json", origin, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}
function cookies(response) {
  return response.headers.getSetCookie().map(v => v.split(";")[0]).join("; ");
}
// pdf-lib encodes text as WinAnsi hex strings inside deflated content streams.
// Inspect the generated drawing operators without adding a PDF parser dependency.
function drawnPdfText(bytes) {
  const binary = bytes.toString("latin1");
  return [...binary.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].flatMap((match) => {
    let content;
    try { content = inflateSync(Buffer.from(match[1], "latin1")).toString("latin1"); }
    catch { return []; } // Font/binary streams are not page text.
    return [...content.matchAll(/<([0-9a-fA-F]+)>\s*Tj/g)]
      .map((item) => Buffer.from(item[1], "hex").toString("latin1"));
  }).join("\n");
}
// Inspect pages separately to ensure the overview and each complete goal plan
// have distinct pages. Reuses the existing test PDF parser; no extra dependency.
function drawnPdfPageText(report) {
  return report.getPages().map(page => {
    const contents = page.node.Contents();
    if (!contents) return "";
    const refs = contents instanceof PDFArray ? contents.asArray() : [contents];
    return refs.flatMap(ref => {
      const stream = report.context.lookup(ref);
      if (!stream || typeof stream.getContents !== "function") return [];
      let decoded;
      try { decoded = inflateSync(Buffer.from(stream.getContents())).toString("latin1"); }
      catch { return []; }
      return [...decoded.matchAll(/<([0-9a-fA-F]+)>\s*Tj/g)]
        .map(match => Buffer.from(match[1], "hex").toString("latin1"));
    }).join("\n");
  });
}
function expectsRedirect(response) {
  assert.ok([302,303,307,308].includes(response.status), `Expected redirect, received ${response.status}`);
  assert.ok(new URL(response.headers.get("location"), origin).pathname === "/sign-in");
}

expectsRedirect(await get("/dashboard"));
expectsRedirect(await get("/admin"));

const rejectedSignup = await post("/api/auth/sign-up/email", {
  name: "No signup", email: "not-allowed@example.test", password: "A-strong-test-password-123456",
});
assert.ok(rejectedSignup.status >= 400 && rejectedSignup.status < 500, `Public sign-up was not blocked: ${rejectedSignup.status}`);

const adminLogin = await post("/api/auth/sign-in/email", {
  email: "ci-admin@example.test", password: adminPassword,
});
assert.equal(adminLogin.status, 200, `Admin login failed: ${adminLogin.status} ${await adminLogin.text()}`);
const adminCookie = cookies(adminLogin);
assert.ok(adminCookie, "Login must return a session cookie");
assert.equal((await get("/dashboard",adminCookie)).status, 200, "Admin must access dashboard");
assert.equal((await get("/admin",adminCookie)).status, 200, "Admin must access admin page");

const createUser = await post("/api/auth/admin/create-user", {
  name: "Test Member", email: "ci-member@example.test", password: "A-strong-test-password-123456", role: "user",
}, adminCookie);
assert.equal(createUser.status, 200, `Admin user creation failed: ${createUser.status} ${await createUser.text()}`);
const memberLogin = await post("/api/auth/sign-in/email", {
  email: "ci-member@example.test", password: "A-strong-test-password-123456",
});
assert.equal(memberLogin.status, 200, "Regular user must be able to log in");
const memberCookie = cookies(memberLogin);
assert.equal((await get("/dashboard",memberCookie)).status, 200);
assert.equal((await get("/admin",memberCookie)).status, 404, "Non-admin must be denied");
const listAdmin = await get("/api/auth/admin/list-users?limit=20&offset=0",adminCookie);
assert.equal(listAdmin.status,200,"Official admin plugin must list users for admin");
const listMember = await get("/api/auth/admin/list-users?limit=20&offset=0",memberCookie);
assert.ok(listMember.status >= 400 && listMember.status < 500,"Member must not list users");
const memberCreate = await post("/api/auth/admin/create-user",{
  name:"Forbidden user",email:"not-created@example.test",password:"A-strong-test-password-123456",role:"user"
},memberCookie);
assert.ok(memberCreate.status >= 400 && memberCreate.status < 500,"Member must not create users");


// Export must be private and include individual entries without auth credentials.
const noSessionExport = await get("/api/export");
assert.equal(noSessionExport.status, 401, "Export without login must be rejected");
const adminSession = await (await get("/api/auth/get-session", adminCookie)).json();
const memberSession = await (await get("/api/auth/get-session", memberCookie)).json();
assert.ok(adminSession?.user?.id && memberSession?.user?.id);

const connection = new pg.Client({ connectionString: process.env.DATABASE_URL });
let privatePhotoId = "", privatePhotoFolder = "";
await connection.connect();
try {
  const sentinel = "CI-ENCRYPTED-SMTP-SENTINEL-NOT-FOR-CLIENTS";
  await connection.query(
    'INSERT INTO "admin_mail_settings" ("id","enabled","encryptedPassword","updatedAt") VALUES ($1,false,$2,NOW())',
    ["smtp",sentinel],
  );
  const html = await (await get("/admin",adminCookie)).text();
  assert.ok(!html.includes(sentinel),"Encrypted SMTP credential must never be serialized to browser");

  const adminId = adminSession.user.id;
  const memberId = memberSession.user.id;
  for (const [id, userId, title] of [
    [randomUUID(), adminId, "CI-ADMIN-PRIVATE-GOAL"],
    [randomUUID(), adminId, "CI-ADMIN-SLAAP-GOAL"],
    [randomUUID(), adminId, "CI-ADMIN-VOEDING-GOAL"],
    [randomUUID(), memberId, "CI-MEMBER-PRIVATE-GOAL"],
  ]) {
    await connection.query(
      'INSERT INTO "goal" ("id","userId","title","motivation","progressIndicator","area","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,NOW())',
      [id, userId, title,
        userId === adminId ? "CI-ADMIN-WHY" : "CI-MEMBER-WHY",
        userId === adminId ? "CI-ADMIN-SUCCESS" : null,
        "BEWEGING"],
    );
    if (userId === adminId) {
      const actionId = randomUUID(), weekId = randomUUID();
      await connection.query(
        'INSERT INTO "habit_action" ("id","userId","goalId","title","targetPerWeek","whenContext","confidenceScore","existingStrength","confidenceBooster","obstacle","fallbackPlan","updatedAt") VALUES ($1,$2,$3,$4,3,$5,$6,$7,$8,$9,$10,NOW())',
        [actionId, adminId, id, "CI Action", "CI-ACTION-WHEN", 8,
          "CI-ACTION-STRENGTH", "CI-ACTION-BOOSTER", "CI-ACTION-OBSTACLE", "CI-ACTION-PLAN-B"],
      );
      await connection.query(
        'INSERT INTO "habit_week_progress" ("id","userId","actionId","weekStart","targetCount","completedCount","updatedAt") VALUES ($1,$2,$3,$4,3,1,NOW())',
        [weekId, adminId, actionId, "2026-10-26"],
      );
      await connection.query(
        'INSERT INTO "habit_week_entry" ("id","userId","weekId","rating","note") VALUES ($1,$2,$3,$4,$5)',
        [randomUUID(), adminId, weekId, "GOED", "CI-PRIVATE-ENTRY-NOTE"],
      );
      // Exercise the approved design B with 3 goals and 7 week actions.
      const extraActions = title === "CI-ADMIN-VOEDING-GOAL" ? 2 : 1;
      for (let n = 0; n < extraActions; n++) {
        const extraId = randomUUID(), extraWeekId = randomUUID();
        await connection.query(
          'INSERT INTO "habit_action" ("id","userId","goalId","title","targetPerWeek","updatedAt") VALUES ($1,$2,$3,$4,3,NOW())',
          [extraId, adminId, id, "Extra fictieve weekactie " + (n + 1)],
        );
        await connection.query(
          'INSERT INTO "habit_week_progress" ("id","userId","actionId","weekStart","targetCount","completedCount","updatedAt") VALUES ($1,$2,$3,$4,3,2,NOW())',
          [extraWeekId, adminId, extraId, "2026-10-26"],
        );
      }
    }
  }
  await connection.query(
    'INSERT INTO "weekly_reflection" ("id","userId","weekStart","wentWell","updatedAt") VALUES ($1,$2,$3,$4,NOW())',
    [randomUUID(), adminId, "2026-10-26", "CI-PRIVATE-REFLECTION"],
  );
  const meetingId = randomUUID();
  await connection.query(
    'INSERT INTO "meeting_note" ("id","userId","meetingDate","title","notes","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW())',
    [meetingId, adminId, "2026-10-26", "CI meeting", "CI-PRIVATE-MEETING-NOTE"],
  );
  privatePhotoId = randomUUID();
  await connection.query(
    'INSERT INTO "meeting_photo" ("id","userId","meetingId","fileName") VALUES ($1,$2,$3,$4)',
    [privatePhotoId, adminId, meetingId, "Fictieve-scannotitie.png"],
  );
  const hash = createHash("sha256").update(adminId).digest("hex");
  privatePhotoFolder = join(process.cwd(), ".private-uploads", hash);
  await mkdir(privatePhotoFolder, { recursive: true, mode: 0o700 });
  const fake = await sharp({ create: { width: 12, height: 12, channels: 3, background: "#e2eee1" } }).webp().toBuffer();
  await writeFile(join(privatePhotoFolder, privatePhotoId + ".webp"), fake, { mode: 0o600 });
} finally {
  await connection.end();
}
const adminExportResponse = await get("/api/export", adminCookie);
const memberExportResponse = await get("/api/export", memberCookie);
assert.equal(adminExportResponse.status, 200, "Admin must export personal data");
assert.equal(memberExportResponse.status, 200, "Regular member must export personal data");
assert.match(adminExportResponse.headers.get("cache-control"), /no-store/);
const adminExport = await adminExportResponse.json();
const memberExport = await memberExportResponse.json();
assert.ok(adminExport.goals.some(g => g.title === "CI-ADMIN-PRIVATE-GOAL"));
assert.ok(!adminExport.goals.some(g => g.title === "CI-MEMBER-PRIVATE-GOAL"));
assert.ok(memberExport.goals.some(g => g.title === "CI-MEMBER-PRIVATE-GOAL"));
assert.ok(!memberExport.goals.some(g => g.title === "CI-ADMIN-PRIVATE-GOAL"));
assert.ok(adminExport.goals.find(g => g.title === "CI-ADMIN-PRIVATE-GOAL").actions[0].weeks[0].entries[0].note === "CI-PRIVATE-ENTRY-NOTE");
assert.equal(adminExport.goals.filter(g => g.status === "ACTIVE").length, 3, "PDF fixture includes three active goals");
assert.equal(adminExport.goals.flatMap(g => g.actions).length, 7, "PDF fixture includes seven actions");
assert.equal(adminExport.reflections[0].wentWell, "CI-PRIVATE-REFLECTION");
assert.equal(adminExport.meetings[0].notes, "CI-PRIVATE-MEETING-NOTE");
assert.equal(adminExport.goals[0].motivation, "CI-ADMIN-WHY");
assert.equal(adminExport.goals[0].progressIndicator, "CI-ADMIN-SUCCESS");
assert.equal(adminExport.goals[0].actions[0].confidenceScore, 8);
assert.equal(adminExport.goals[0].actions[0].fallbackPlan, "CI-ACTION-PLAN-B");
assert.equal(memberExport.reflections.length, 0);
assert.equal(memberExport.meetings.length, 0);
for (const report of [adminExport, memberExport]) {
  const raw = JSON.stringify(report);
  for (const secret of ["password", "token", "banReason", "CI_ADMIN_PASSWORD", "emailVerified"]) {
    assert.ok(!raw.includes('"' + secret + '":'), "Sensitive authentication field leaked: " + secret);
  }
}
console.log("Private JSON export verified: 401 for anonymous, owner isolation, entries, reflections, meetings.");

// The browser cannot fetch any other user's private attachment.
assert.equal((await get("/api/meeting-photos/" + privatePhotoId)).status, 401);
assert.equal((await get("/api/meeting-photos/" + privatePhotoId, memberCookie)).status, 404);
const ownerPhoto = await get("/api/meeting-photos/" + privatePhotoId, adminCookie);
assert.equal(ownerPhoto.status, 200);
assert.equal(ownerPhoto.headers.get("content-type"), "image/webp");
assert.match(ownerPhoto.headers.get("cache-control"), /no-store/);
assert.equal(adminExport.meetings[0].photos[0].fileName, "Fictieve-scannotitie.png");
await rm(join(privatePhotoFolder, privatePhotoId + ".webp"), { force: true });

assert.equal((await get("/api/export/pdf")).status, 401, "PDF without login must return 401");
for (const cookie of [adminCookie, memberCookie]) {
  const pdfResult = await get("/api/export/pdf", cookie);
  assert.equal(pdfResult.status, 200, "Signed-in PDF export must succeed");
  assert.equal(pdfResult.headers.get("content-type"), "application/pdf");
  assert.match(pdfResult.headers.get("cache-control"), /no-store/);
  const pdfBytes = Buffer.from(await pdfResult.arrayBuffer());
  assert.equal(pdfBytes.subarray(0, 5).toString("ascii"), "%PDF-", "PDF must be a valid PDF document");
  const report = await PDFDocument.load(pdfBytes);
  assert.ok(report.getPageCount() >= 1, "PDF must have pages");
  const printed = drawnPdfText(pdfBytes);
  const pages = drawnPdfPageText(report);
  assert.ok(pages[0].includes("Jouw leefstijl"), "First page must start with an overview");
  assert.ok(!pages[0].includes("WAAROM IS DIT DOEL"), "Overview page must not contain detailed answers");
  if (cookie === adminCookie) {
    assert.ok(report.getPageCount() >= 5, "Three goals require overview, three plan pages and reflection page");
    const goalNames = ["CI-ADMIN-PRIVATE-GOAL", "CI-ADMIN-SLAAP-GOAL", "CI-ADMIN-VOEDING-GOAL"];
    for (let index = 0; index < goalNames.length; index++) {
      assert.ok(pages[0].includes(goalNames[index]), "Overview must list every active goal");
      assert.ok(pages[index + 1].includes(`DOEL ${index + 1} VAN 3`), "Each goal must begin on a new plan page");
      assert.ok(pages[index + 1].includes(goalNames[index]), "Plan page must show its own goal");
      assert.ok(pages[index + 1].includes("CI-ADMIN-WHY"), "Each goal plan must include its motivation");
      for (let other = 0; other < goalNames.length; other++) {
        if (other !== index) assert.ok(!pages[index + 1].includes(goalNames[other]),
          "Different goals must not share a detailed plan page");
      }
    }
    assert.ok(pages.slice(4).some(p => p.includes("Terugblik & reflectie")), "Reflection must follow complete plans");
    for (const field of ["CI-ADMIN-WHY", "CI-ADMIN-SUCCESS", "8 / 10",
      "CI-ACTION-WHEN", "CI-ACTION-STRENGTH", "CI-ACTION-BOOSTER",
      "CI-ACTION-OBSTACLE", "CI-ACTION-PLAN-B"]) {
      assert.ok(printed.includes(field), "PDF is missing guided answer: " + field);
    }
    assert.ok(!printed.includes("CI-MEMBER-WHY"), "PDF must not leak another user's motivation");
  } else {
    assert.ok(printed.includes("CI-MEMBER-WHY"), "Member PDF must include own motivation");
    assert.ok(!printed.includes("CI-ADMIN-WHY"), "Member PDF must not leak admin answers");
  }
}
console.log("Protected CooL photos and branded PDF download verified.");


const memberId = memberSession.user.id;
const adminId = adminSession.user.id;
// The admin plugin must support name updates without changing login email.
const nameUpdate = await post("/api/auth/admin/update-user", {
  userId: memberId, data: { name: "Bijgewerkte testgebruiker" },
}, adminCookie);
assert.equal(nameUpdate.status, 200, "Admin must update display names");
const memberAfterNameChange = await get("/api/auth/get-session", memberCookie);
assert.equal((await memberAfterNameChange.json()).user.name, "Bijgewerkte testgebruiker");
const deniedNameUpdate = await post("/api/auth/admin/update-user", {
  userId: adminId, data: { name: "Attempted takeover" },
}, memberCookie);
assert.ok(deniedNameUpdate.status >= 400 && deniedNameUpdate.status < 500,
  "Ordinary member must not update another user");
const deniedRemove = await post("/api/auth/admin/remove-user", { userId: adminId }, memberCookie);
assert.ok(deniedRemove.status >= 400 && deniedRemove.status < 500,
  "Ordinary member must not remove users");
const deniedSelfRemove = await post("/api/auth/admin/remove-user", { userId: adminId }, adminCookie);
assert.ok(deniedSelfRemove.status >= 400 && deniedSelfRemove.status < 500,
  "Administrator must not remove the only administrator through the underlying API");
assert.equal((await get("/admin", adminCookie)).status, 200, "Admin must still be active");

// Use a dedicated temporary private photo of the member to test file cleanup.
// This is not user-provided data. Everything is on the disposable CI database.
const deletionDb = new pg.Client({ connectionString: process.env.DATABASE_URL });
const memberPhotoId = randomUUID(), memberMeetingId = randomUUID();
const memberPhotoFolder = join(process.cwd(), ".private-uploads", createHash("sha256").update(memberId).digest("hex"));
await deletionDb.connect();
try {
  await deletionDb.query(
    'INSERT INTO "meeting_note" ("id","userId","meetingDate","title","notes","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW())',
    [memberMeetingId, memberId, "2026-10-26", "Delete smoke meeting", "Delete smoke note"],
  );
  await deletionDb.query(
    'INSERT INTO "meeting_photo" ("id","userId","meetingId","fileName") VALUES ($1,$2,$3,$4)',
    [memberPhotoId, memberId, memberMeetingId, "deletion-test.webp"],
  );
  await mkdir(memberPhotoFolder, { recursive: true, mode: 0o700 });
  await writeFile(join(memberPhotoFolder, memberPhotoId + ".webp"),
    await sharp({ create: { width: 8, height: 8, channels: 3, background: "#ffffff" } }).webp().toBuffer(),
    { mode: 0o600 });
} finally { await deletionDb.end(); }

const removed = await post("/api/auth/admin/remove-user", { userId: memberId }, adminCookie);
assert.equal(removed.status, 200, "Admin must be able to permanently remove a regular user");
const checkDeleted = new pg.Client({ connectionString: process.env.DATABASE_URL });
await checkDeleted.connect();
try {
  for (const [table, name] of [
    ["user","id"],["session","userId"],["account","userId"],["goal","userId"],
    ["weekly_reflection","userId"],["meeting_note","userId"],["meeting_photo","userId"],
  ]) {
    const count = await checkDeleted.query(
      `SELECT COUNT(*)::int AS total FROM "${table}" WHERE "${name}"=$1`,[memberId],
    );
    assert.equal(count.rows[0].total,0, `Deleted account must leave no ${table} rows`);
  }
} finally { await checkDeleted.end(); }
await assert.rejects(stat(memberPhotoFolder),{ code: "ENOENT" },
  "Private meeting photo directory must be erased when deleting account");
expectsRedirect(await get("/dashboard", memberCookie));
console.log("Admin rename and permanent user deletion: roles, DB cascades, sessions and photos verified.");

const logout = await post("/api/auth/sign-out", {}, adminCookie);
assert.ok(logout.ok, "Logout must work");
console.log("Auth smoke passed: public sign-up blocked, login, admin role, member isolation, logout");
