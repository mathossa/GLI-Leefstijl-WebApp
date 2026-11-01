// Only run against a disposable migrated database and a built production server.
import assert from "node:assert/strict";
import { readFile, readdir, rm } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { join } from "node:path";
import pg from "pg";
import sharp from "sharp";
import flight from "next/dist/compiled/react-server-dom-turbopack/client.node.js";
import { amsterdamMonday } from "../src/lib/goals-domain.mjs";

const origin = new URL(process.env.BETTER_AUTH_URL || "http://127.0.0.1:3000").origin;
const manifest = JSON.parse(await readFile(".next/server/server-reference-manifest.json", "utf8"));
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const headers = { origin, "x-real-ip": "198.51.100.20" };
const authPost = (path, body, cookie = "") => fetch(origin + "/api/auth" + path, {
  method: "POST", headers: { ...headers, "content-type": "application/json", cookie }, body: JSON.stringify(body),
});
const actionId = (name) => {
  const match = Object.entries(manifest.node).find(([, value]) => value.exportedName === name);
  assert.ok(match, "Server action must be registered: " + name);
  return match[0];
};
async function action(name, args, cookie, fields) {
  const actionHeaders = { ...headers, cookie, "Next-Action": actionId(name) };
  if (fields) {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    args = args.map(value => value === "$K1" ? form : value);
  }
  // Reuse React's own encoder, including its version-specific multipart prefixes.
  const body = await flight.encodeReply(args);
  if (typeof body === "string") actionHeaders["content-type"] = "text/plain;charset=UTF-8";
  const route = ["createMeeting", "updateMeeting", "uploadMeetingPhoto"].includes(name)
    ? "/dashboard/reflectie" : "/dashboard";
  const response = await fetch(origin + route, { method: "POST", redirect: "manual", headers: actionHeaders, body });
  const text = await response.text();
  assert.ok(response.status < 500, `${name} must not fail with a server error (${response.status}): ${text.slice(0,100)}`);
  return { response, text };
}

async function concurrent(count, task) {
  // Finish every request before finally deleting fixtures, including on failure.
  const results = await Promise.allSettled(Array.from({ length: count }, (_, i) => task(i)));
  for (const result of results) if (result.status === "rejected") throw result.reason;
}

await db.connect();
let userId, photoFolder;
try {
  const signInPage = await fetch(origin + "/sign-in");
  assert.equal(signInPage.headers.get("x-frame-options"), "DENY");
  assert.match(signInPage.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal(signInPage.headers.get("x-content-type-options"), "nosniff");
  assert.equal(signInPage.headers.get("referrer-policy"), "no-referrer");
  assert.equal(signInPage.headers.get("x-powered-by"), null);
  const missingIp = await fetch(origin + "/api/auth/get-session");
  assert.equal(missingIp.status, 503, "Missing trusted proxy IP must fail closed in production");
  const crossOrigin = await fetch(origin + "/api/auth/sign-in/email", {
    method: "POST", headers: { ...headers, origin: "https://untrusted.example", "content-type": "application/json" },
    body: JSON.stringify({ email: "ci-admin@example.test", password: "invalid" }),
  });
  assert.equal(crossOrigin.status, 403, "Untrusted origin must be rejected");

  const admin = await authPost("/sign-in/email", { email: "ci-admin@example.test", password: process.env.CI_ADMIN_PASSWORD });
  assert.equal(admin.status, 200);
  const cookie = admin.headers.getSetCookie().map(v => v.split(";")[0]).join("; ");
  const email = randomUUID() + "@example.test";
  const created = await authPost("/admin/create-user", { name: "CI Review", email, password: "CI-only-disposable-password-12345", role: "user" }, cookie);
  assert.equal(created.status, 200);
  userId = (await created.json()).user.id;
  photoFolder = join(process.env.PRIVATE_UPLOAD_DIR || ".private-uploads", createHash("sha256").update(userId).digest("hex"));
  const login = await authPost("/sign-in/email", { email, password: "CI-only-disposable-password-12345" });
  assert.equal(login.status, 200);
  const member = login.headers.getSetCookie().map(v => v.split(";")[0]).join("; ");
  const fake = new File([await sharp({ create: { width: 8, height: 8, channels: 3, background: "#ffffff" } }).png().toBuffer()], "ci.png", { type: "image/png" });
  const title = "CI Review Meeting";
  const savedMeeting = await action("createMeeting", [{ error: null }, "$K1"], member, { title, meetingDate: "2026-10-26", notes: "Original", photo: fake });
  const meeting = (await db.query('SELECT id FROM meeting_note WHERE "userId"=$1 AND title=$2', [userId, title])).rows[0];
  assert.ok(meeting, "Meeting with photo must be saved through the real server action: " + savedMeeting.text);
  // Concurrent requests must share the same five-photo quota.
  await concurrent(7, () => action("uploadMeetingPhoto", ["$K1"], member, { id: meeting.id, photo: fake }));
  const count = await db.query('SELECT COUNT(*)::int AS total FROM meeting_photo WHERE "userId"=$1 AND "meetingId"=$2', [userId, meeting.id]);
  assert.equal(count.rows[0].total, 5, "Simultaneous uploads must never exceed the quota");
  assert.equal((await readdir(photoFolder)).length, 5, "Rejected uploads must leave no staged files");
  const failedEdit = await action("updateMeeting", [{ error: null }, "$K1"], member, {
    id: meeting.id, title: "Must roll back", meetingDate: "2026-10-26", notes: "Changed", photo: fake,
  });
  assert.match(failedEdit.text, /error/);
  assert.equal((await db.query('SELECT title FROM meeting_note WHERE id=$1', [meeting.id])).rows[0].title, title,
    "A rejected photo must roll back the text edit too");
  assert.equal((await readdir(photoFolder)).length, 5);

  const goalId = randomUUID(), habitId = randomUUID();
  await db.query('INSERT INTO goal (id,"userId",title,motivation,area,"updatedAt") VALUES ($1,$2,\'CI Review\',\'\',\'BEWEGING\',NOW())', [goalId,userId]);
  await db.query('INSERT INTO habit_action (id,"userId","goalId",title,"targetPerWeek","updatedAt") VALUES ($1,$2,$3,\'CI Review Action\',3,NOW())', [habitId,userId,goalId]);
  await concurrent(5, () => action("logCompletion", [habitId], member));
  const week = (await db.query('SELECT id,"completedCount" FROM habit_week_progress WHERE "userId"=$1 AND "actionId"=$2 AND "weekStart"=$3', [userId,habitId,amsterdamMonday()])).rows[0];
  assert.equal(week.completedCount, 3);
  assert.equal((await db.query('SELECT COUNT(*)::int AS total FROM habit_week_entry WHERE "userId"=$1 AND "weekId"=$2', [userId,week.id])).rows[0].total, 3);
  // Calling the same action without a session cannot mutate the owner's totals.
  await action("undoLastCompletion", [habitId], "");
  await action("undoLastCompletion", [habitId], cookie);
  assert.equal((await db.query('SELECT "completedCount" FROM habit_week_progress WHERE id=$1', [week.id])).rows[0].completedCount, 3);

  // Keep X-Real-IP constant while rotating a forged forwarded chain.
  const attempts = await Promise.all(Array.from({ length: 8 }, (_, i) => fetch(origin + "/api/auth/sign-in/email", {
    method: "POST", headers: { ...headers, "x-real-ip": "198.51.100.25", "x-forwarded-for": `203.0.113.${i}, 10.0.0.2`, "content-type": "application/json" },
    body: JSON.stringify({ email: "not-present@example.test", password: "invalid-password" }),
  })));
  assert.equal(attempts.filter(r => r.status === 429).length, 5, "Only three concurrent login attempts per window are allowed");
  const stored = await db.query('SELECT count FROM "rateLimit" WHERE key=$1', ["198.51.100.25|/sign-in/email"]);
  assert.equal(stored.rows[0].count, 3, "Auth throttling must persist to the shared database");
  console.log("Review smoke passed: headers, origin/proxy protection, persistent atomic login throttling, upload concurrency/rollback/cleanup, completion concurrency, anonymous action isolation.");
} finally {
  if (userId) await db.query('DELETE FROM "user" WHERE id=$1', [userId]);
  if (photoFolder) await rm(photoFolder, { recursive: true, force: true });
  await db.end();
}
