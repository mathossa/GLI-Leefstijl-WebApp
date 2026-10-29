import test from "node:test";
import assert from "node:assert/strict";
import { encryptSmtpPassword, decryptSmtpPassword } from "../src/lib/smtp-crypto.ts";
import { parseMailInput } from "../src/lib/smtp-validation.ts";

const key = Buffer.alloc(32, 7).toString("base64");
test("AES-256-GCM roundtrip uses a random IV and never stores plaintext", () => {
  const first = encryptSmtpPassword("credential-123", key);
  const second = encryptSmtpPassword("credential-123", key);
  assert.notEqual(first, second);
  assert.ok(!first.includes("credential-123"));
  assert.equal(decryptSmtpPassword(first, key), "credential-123");
});
test("incorrect key and tampered ciphertext are rejected", () => {
  const cipher = encryptSmtpPassword("credential-123", key);
  assert.throws(() => decryptSmtpPassword(cipher, Buffer.alloc(32, 9).toString("base64")));
  const parts = cipher.split(":");
  parts[2] = Buffer.from("changed").toString("base64");
  assert.throws(() => decryptSmtpPassword(parts.join(":"), key));
  assert.throws(() => encryptSmtpPassword("credential", "bad-key"));
});
function mailForm(port = "587", security = "STARTTLS") {
  const form = new FormData();
  for (const [name,value] of Object.entries({host:"mail.example.test",port,security,username:"admin@example.test",password:"password",fromName:"Mijn Leefstijl",fromEmail:"no-reply@example.test"})) form.set(name,value);
  form.set("enabled","on");
  return form;
}
test("accepts configured relay on STARTTLS 587 and TLS 465", () => {
  assert.equal(parseMailInput(mailForm()).security,"STARTTLS");
  assert.equal(parseMailInput(mailForm("465","TLS")).security,"TLS");
});
test("rejects direct port 25, URL injection, header injection and insecure modes", () => {
  assert.throws(()=>parseMailInput(mailForm("25")),/25/);
  assert.throws(()=>parseMailInput(mailForm("465","STARTTLS")));
  const host=mailForm(); host.set("host","https://mail.example.test"); assert.throws(()=>parseMailInput(host));
  const from=mailForm(); from.set("fromName","Name\r\nBcc: a@example.test"); assert.throws(()=>parseMailInput(from));
});
