// Small HTTP-level smoke suite for the Better Auth API and Next.js access checks.
// Invoked only in CI against an isolated disposable PostgreSQL database.
import assert from "node:assert/strict";

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

const logout = await post("/api/auth/sign-out", {}, adminCookie);
assert.ok(logout.ok, "Logout must work");
console.log("Auth smoke passed: public sign-up blocked, login, admin role, member isolation, logout");
