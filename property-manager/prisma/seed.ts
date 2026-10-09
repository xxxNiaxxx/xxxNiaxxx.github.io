/**
 * Demo data for "Demo Hospitality" (lib/demo-seed.ts). Idempotent: removes the
 * demo organization and demo users, then recreates everything with dates
 * around today.
 *
 * Sign in with demo@demo-hospitality.test / demo1234 (or DEMO_PASSWORD when set).
 * Online, the demo is reset every night by the cron job and the demo users
 * cannot change the password, invite people or delete the account.
 *
 * `tsx prisma/seed.ts --remove` (npm run db:remove-demo) only deletes the demo
 * organization and demo users.
 */
import { PrismaClient } from "@prisma/client";
import { resetDemo, seedDemo } from "../lib/demo-seed";

const db = new PrismaClient();

const run = process.argv.includes("--remove")
  ? resetDemo(db).then(() => console.log("Τα δοκιμαστικά δεδομένα (Demo Hospitality) διαγράφηκαν."))
  : seedDemo(db).then((r) => {
      console.log(`Seeded Demo Hospitality: ${r.properties} properties, ${r.guests} guests, ${r.reservations} reservations, ${r.tasks} tasks.`);
      console.log(`Σύνδεση: demo@demo-hospitality.test / ${process.env.DEMO_PASSWORD ? "(ο κωδικός DEMO_PASSWORD)" : "demo1234"}`);
    });

run
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
