#!/usr/bin/env node
import { execSync } from "node:child_process";

try {
  const output = execSync('git grep -n -E "(/Users/[a-zA-Z0-9_-]+|[a-zA-Z]:\\\\Users\\\\[a-zA-Z0-9_-]+|/home/[a-zA-Z0-9_-]+)"', {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "ignore"],
  });

  const lines = output.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length > 0) {
    console.error("❌ Personal paths detected in repository:");
    lines.forEach((l) => console.error(`  ${l}`));
    console.error("\nPlease use repository-relative paths (e.g. src/..., ./data/...) instead of machine-specific home paths.");
    process.exit(1);
  }
} catch {
  // git grep returns exit code 1 when no matches are found, which means clean!
}

console.log("✅ No personal machine paths detected.");
process.exit(0);
