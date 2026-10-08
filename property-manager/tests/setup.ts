import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env");
} catch {
  // optional
}
// Point Prisma at the test database before anything imports lib/db.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DIRECT_URL = process.env.TEST_DATABASE_URL;
process.env.NEXT_PUBLIC_APP_TIMEZONE = "Europe/Athens";
