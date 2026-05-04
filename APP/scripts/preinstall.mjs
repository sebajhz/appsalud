/**
 * Cross-platform preinstall for workspace root (APP/).
 * Enforces pnpm and removes lockfiles from other package managers.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");

const ua = process.env.npm_config_user_agent ?? "";
if (!ua.startsWith("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}

for (const name of ["package-lock.json", "yarn.lock"]) {
  const filePath = path.join(appRoot, name);
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    if (err && err.code !== "ENOENT") {
      throw err;
    }
  }
}
