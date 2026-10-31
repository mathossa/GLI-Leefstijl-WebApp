import { rmSync } from "node:fs";

// After switching branches, Next's development cache can mix old client bundles
// with newly server-rendered HTML. Remove only generated build artifacts.
rmSync(".next", { recursive: true, force: true });
console.log("Next.js ontwikkelcache opgeschoond.");
