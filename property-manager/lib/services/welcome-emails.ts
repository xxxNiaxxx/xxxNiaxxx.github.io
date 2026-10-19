import { createHmac, timingSafeEqual } from "node:crypto";
import { APP_NAME, FREE_UNTIL_NOTE } from "@/lib/brand";
import { db } from "@/lib/db";
import { DEMO_EMAIL_DOMAIN } from "@/lib/demo-domain";
import { sendEmail, type EmailMessage } from "@/lib/email";

/**
 * Welcome series after sign-up: the 1st, 3rd and 7th day. Sent by the daily
 * job, one email per user per day at most; a step missed (e.g. email was off)
 * is skipped rather than sent late. Every email has an unsubscribe link.
 */
export const WELCOME_DAYS = [1, 3, 7] as const;
/** Users older than this get nothing (so the series never reaches long-time users). */
const MAX_AGE_DAYS = 10;
const DAY = 86_400_000;

type Recipient = { id: string; name: string | null; email: string; hasProperty: boolean };

const greeting = (name: string | null) => {
  const first = name?.trim().split(/\s+/)[0];
  return first ? `Γεια σας ${first},` : "Γεια σας,";
};

/** The email for a step (1–3); exported for the preview in marketing/. */
export function welcomeEmail(step: number, u: Recipient, origin: string): EmailMessage {
  const help = `${origin}/help#airbnb-booking`;
  const sign = `\n\nΜε εκτίμηση,\nΗ ομάδα του ${APP_NAME}`;
  const footer = `\n\n—\nΔεν θέλετε άλλα τέτοια email (συμβουλές και νέα); Διαγραφή: ${unsubscribeUrl(origin, u.id)}`;
  if (step === 1) {
    return {
      to: u.email,
      subject: `Τα πρώτα 3 βήματα στο ${APP_NAME}`,
      text:
        `${greeting(u.name)}\n\nκαλώς ήρθατε! Με 3 βήματα (περίπου 10 λεπτά) βλέπετε όλη τη χρονιά σας:\n\n` +
        `1. ${u.hasProperty ? "✓ Το κατάλυμα το έχετε ήδη βάλει." : "Προσθέστε το κατάλυμά σας (Ακίνητα). Βάλτε και τον ΑΜΑ του."}\n` +
        `2. Συνδέστε το ημερολόγιο της Airbnb και της Booking, για να έρχονται μόνες τους οι νέες κρατήσεις.\n` +
        `3. Ανεβάστε το αρχείο κρατήσεων από 1/1 μέχρι σήμερα: βλέπετε αμέσως έσοδα, προμήθειες, ΤΑΚΚ και εκτίμηση φόρου.\n\n` +
        `Πού βρίσκετε τον σύνδεσμο και το αρχείο σε κάθε πλατφόρμα: ${help}\n\n${FREE_UNTIL_NOTE}${sign}${footer}`,
      action: { label: u.hasProperty ? "Εισαγωγή κρατήσεων" : "Προσθήκη καταλύματος", url: `${origin}${u.hasProperty ? "/reservations/import" : "/properties"}` },
    };
  }
  if (step === 2) {
    return {
      to: u.email,
      subject: "Σε 1 λεπτό: από τα αρχεία Airbnb και Booking στα καθαρά σας",
      text:
        `${greeting(u.name)}\n\nφτιάξαμε ένα βίντεο ενός λεπτού: ανεβαίνουν τα αρχεία της Airbnb και της Booking και φαίνονται ` +
        `τα καθαρά, τα έξοδα και οι φόροι της χρονιάς.\n\nΒίντεο: ${origin}/media/csv.mp4\n\n` +
        (u.hasProperty ? "" : "Δεν έχετε βάλει ακόμη κατάλυμα· ξεκινήστε από εκεί και τα υπόλοιπα θα σας πάρουν λίγα λεπτά.\n\n") +
        `Κάτι δεν δουλεύει όπως περιμένατε; Απαντήστε σε αυτό το email και θα σας βοηθήσουμε.${sign}${footer}`,
      action: { label: "Άνοιγμα εφαρμογής", url: `${origin}/dashboard` },
    };
  }
  return {
    to: u.email,
    subject: "Πώς σας φαίνεται μέχρι τώρα;",
    text:
      `${greeting(u.name)}\n\nείναι μια εβδομάδα που χρησιμοποιείτε το ${APP_NAME}. Θα θέλαμε πολύ να μάθουμε:\n\n` +
      `• Τι σας γλίτωσε χρόνο;\n• Τι σας μπέρδεψε ή σας έλειψε;\n\n` +
      `Απαντήστε σε αυτό το email, έστω με μία πρόταση· διαβάζουμε όλα τα μηνύματα. ` +
      `Αν θέλετε να το δούμε μαζί, γράψτε μας ένα τηλέφωνο και μια ώρα που σας βολεύει και σας καλούμε για 15 λεπτά.${sign}${footer}`,
    action: { label: "Άνοιγμα εφαρμογής", url: `${origin}/dashboard` },
  };
}

const SWITCH_KEY = "followUpEmails";

/**
 * The welcome series and the waitlist reminder go out only once switched on
 * in the admin waitlist page (off until the texts are approved).
 */
export async function followUpEmailsOn() {
  const row = await db.appSetting.findUnique({ where: { key: SWITCH_KEY } });
  return row?.value === true;
}

export async function setFollowUpEmails(on: boolean) {
  await db.appSetting.upsert({ where: { key: SWITCH_KEY }, create: { key: SWITCH_KEY, value: on }, update: { value: on } });
  return { followUpEmails: on };
}

/** Daily: the step each new user is due, if not already sent. */
export async function sendWelcomeEmails(origin: string, now = new Date()) {
  if (!(await followUpEmailsOn())) return { sent: 0, off: true };
  const users = await db.user.findMany({
    where: {
      emailOptOutAt: null,
      welcomeEmails: { lt: WELCOME_DAYS.length },
      createdAt: { gte: new Date(now.getTime() - MAX_AGE_DAYS * DAY), lte: new Date(now.getTime() - WELCOME_DAYS[0] * DAY) },
      NOT: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } },
    },
    select: { id: true, name: true, email: true, createdAt: true, welcomeEmails: true, memberships: { select: { organization: { select: { _count: { select: { properties: true } } } } } } },
  });
  let sent = 0;
  for (const u of users) {
    const age = (now.getTime() - u.createdAt.getTime()) / DAY;
    const due = WELCOME_DAYS.filter((d) => d <= age).length;
    if (due <= u.welcomeEmails) continue;
    const hasProperty = u.memberships.some((m) => m.organization._count.properties > 0);
    // Claim the step first, so two runs never send it twice.
    const { count } = await db.user.updateMany({ where: { id: u.id, welcomeEmails: u.welcomeEmails }, data: { welcomeEmails: due } });
    if (!count) continue;
    if (await sendEmail(welcomeEmail(due, { id: u.id, name: u.name, email: u.email, hasProperty }, origin))) sent++;
    else await db.user.update({ where: { id: u.id }, data: { welcomeEmails: u.welcomeEmails } }); // email not set up: try again tomorrow
  }
  return { sent };
}

// ─── Unsubscribe ─────────────────────────────────────────────────────

function sign(userId: string) {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "").update(`unsubscribe:${userId}`).digest("base64url").slice(0, 22);
}

export const unsubscribeToken = (userId: string) => `${userId}.${sign(userId)}`;
export const unsubscribeUrl = (origin: string, userId: string) => `${origin}/unsubscribe/${unsubscribeToken(userId)}`;

/** The user id of a valid token, or null. */
export function verifyUnsubscribeToken(token: string) {
  const [userId, mac] = token.split(".");
  if (!userId || !mac) return null;
  const expected = Buffer.from(sign(userId));
  const given = Buffer.from(mac);
  return expected.length === given.length && timingSafeEqual(expected, given) ? userId : null;
}

export async function unsubscribe(token: string, now = new Date()) {
  const userId = verifyUnsubscribeToken(token);
  if (!userId) return false;
  await db.user.updateMany({ where: { id: userId, emailOptOutAt: null }, data: { emailOptOutAt: now } });
  return true;
}
