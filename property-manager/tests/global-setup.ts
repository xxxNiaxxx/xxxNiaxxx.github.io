import { execSync } from "node:child_process";
import { loadEnvFile } from "node:process";

/** Applies migrations to the dedicated test database before the suite runs. */
export default function setup() {
  try {
    loadEnvFile(".env");
  } catch {
    // .env is optional when variables come from the environment (CI).
  }
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Set TEST_DATABASE_URL (see .env.example) — tests wipe that database.");
  if (url === process.env.DATABASE_URL) throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL.");
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url }, stdio: "pipe" });
}
