#!/usr/bin/env node
// One-time, opt-in bootstrap for Portainer installations without an interactive console.
// Only an EMPTY user table may be bootstrapped; never change or promote existing users.
import { spawnSync } from "node:child_process";
import pg from "pg";

const keys = [
  "BOOTSTRAP_ADMIN_EMAIL",
  "BOOTSTRAP_ADMIN_NAME",
  "BOOTSTRAP_ADMIN_PASSWORD",
];
const configured = keys.filter((key) => Boolean(process.env[key]));
if (configured.length === 0) {
  process.exit(0);
}
if (configured.length !== keys.length) {
  console.error("[bootstrap] Set all three BOOTSTRAP_ADMIN_* variables or none.");
  process.exit(1);
}

const email = process.env.BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase();
const name = process.env.BOOTSTRAP_ADMIN_NAME.trim();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
if (
  email.length > 254 ||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
  name.length < 1 ||
  name.length > 120 ||
  /[\x00-\x1f\x7f]/.test(name) ||
  password.length < 12 ||
  password.length > 256 ||
  /[\x00\r\n]/.test(password)
) {
  console.error("[bootstrap] Invalid admin email, name, or password (minimum 12 characters).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  const { rows } = await client.query('SELECT EXISTS (SELECT 1 FROM "user") AS has_users');
  if (rows[0].has_users) {
    console.log("[bootstrap] Users already exist; skipping. Existing users and passwords are unchanged.");
    process.exit(0);
  }
} catch {
  console.error("[bootstrap] Could not inspect the user table; refusing admin bootstrap.");
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}

// Use the official Better Auth CLI to create the account and hash the password.
// No shell, no password in Git or logs. The password is temporarily visible in
// process arguments and Docker env to host administrators during bootstrap.
const result = spawnSync(
  "./node_modules/.bin/auth",
  ["create-admin", "--email", email, "--name", name, "--role", "admin", "--password", password],
  { cwd: "/app", env: process.env, stdio: "ignore", timeout: 90_000 },
);
if (result.error || result.status !== 0) {
  console.error("[bootstrap] Better Auth admin creation failed; app startup is blocked.");
  process.exit(1);
}
console.log("[bootstrap] First admin created. Remove BOOTSTRAP_ADMIN_* from Portainer and redeploy.");
