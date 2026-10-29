// Small HTTP-level smoke suite for the Better Auth API and Next.js access checks.
// Invoked only in CI against an isolated disposable PostgreSQL database.
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import pg from "pg";
import { PDFDocument } from "pdf-lib";

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
  const adminId = adminSession.user.id;
  const memberId = memberSession.user.id;
  for (const [id, userId, title] of [
    [randomUUID(), adminId, "CI-ADMIN-PRIVATE-GOAL"],
    [randomUUID(), adminId, "CI-ADMIN-SLAAP-GOAL"],
    [randomUUID(), adminId, "CI-ADMIN-VOEDING-GOAL"],
    [randomUUID(), memberId, "CI-MEMBER-PRIVATE-GOAL"],
  ]) {
    await connection.query(
      'INSERT INTO "goal" ("id","userId","title","motivation","area","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW())',
      [id, userId, title, "", "BEWEGING"],
    );
    if (userId === adminId) {
      const actionId = randomUUID(), weekId = randomUUID();
      await connection.query(
        'INSERT INTO "habit_action" ("id","userId","goalId","title","targetPerWeek","updatedAt") VALUES ($1,$2,$3,$4,3,NOW())',
        [actionId, adminId, id, "CI Action"],
      );
      await connection.query(
        'INSERT INTO "habit_week_progress" ("id","userId","actionId","weekStart","targetCount","completedCount","updatedAt") VALUES ($1,$2,$3,$4,3,1,NOW())',
        [weekId, adminId, actionId, "2026-10-26"],
      );
      await connection.query(
        'INSERT INTO "habit_week_entry" ("id","userId","weekId","rating","note") VALUES ($1,$2,$3,$4,$5)',
        [randomUUID(), adminId, weekId, "GOED", "CI-PRIVATE-ENTRY-NOTE"],
      );
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
assert.equal(adminExport.reflections[0].wentWell, "CI-PRIVATE-REFLECTION");
assert.equal(adminExport.meetings[0].notes, "CI-PRIVATE-MEETING-NOTE");
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
  if (cookie === adminCookie) {
    assert.ok(report.getPageCount() >= 2, "Three-goal PDF report must paginate with reflections");
  }
}
console.log("Protected CooL photos and branded PDF download verified.");

const logout = await post("/api/auth/sign-out", {}, adminCookie);
assert.ok(logout.ok, "Logout must work");
console.log("Auth smoke passed: public sign-up blocked, login, admin role, member isolation, logout");
