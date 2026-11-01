// Deterministic lockfile license inventory without downloading another CLI.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
const list = [];
const invalid = [];
for (const [path, pkg] of Object.entries(lock.packages)) {
  if (!path.startsWith("node_modules/")) continue;
  const license = typeof pkg.license === "string" ? pkg.license.trim() : "";
  const name = path.replace(/^.*node_modules\//, "");
  list.push({ name, version: pkg.version ?? "unknown", license });
  if (!license || /(?:UNLICENSED|PROPRIETARY|NOASSERTION|SEE LICENSE IN|CC-BY-NC|CC-BY-ND)/i.test(license)) {
    invalid.push({ name, license: license || "MISSING" });
  }
}
list.sort((a, b) => a.name.localeCompare(b.name));
const byLicense = Object.fromEntries(
  [...new Set(list.map(p => p.license))].sort().map(lic => [lic, list.filter(p => p.license === lic).length])
);
const report = {
  generatedFrom: "package-lock.json",
  total: list.length,
  byLicense,
  manualReview: list.filter(p => /LGPL|MPL|EPL|CC-BY/i.test(p.license)),
  dependencies: list,
  blockedOrMissing: invalid,
};
const output = new URL("../artifacts/dependency-licenses.json", import.meta.url);
mkdirSync(new URL("../artifacts/", import.meta.url), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log("License inventory:", report.total, "locked dependencies;", invalid.length, "missing/blocked licenses");
console.log("License counts:", JSON.stringify(byLicense));
console.log("Review reciprocal/attribution licenses:", report.manualReview.length);
if (invalid.length) {
  console.error("Missing or clearly forbidden licenses:", JSON.stringify(invalid));
  process.exitCode = 1;
}
