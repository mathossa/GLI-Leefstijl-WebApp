import test from "node:test";
import assert from "node:assert/strict";
import { getIP } from "@better-auth/core/utils/ip";

test("a forged forwarded chain cannot remove the proxy-provided rate limit identity", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.99, 198.51.100.20",
      "x-real-ip": "198.51.100.20",
    });
    assert.equal(getIP(headers, {}), null, "Default chain resolution cannot establish an IP");
    assert.equal(getIP(headers, { advanced: { ipAddress: { ipAddressHeaders: ["x-real-ip"] } } }), "198.51.100.20");
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
