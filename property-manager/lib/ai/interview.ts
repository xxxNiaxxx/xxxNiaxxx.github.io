import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { BlockedUrlError, fetchPublicText } from "@/lib/net/safe-fetch";
import type { OrgContext } from "@/lib/permissions";
import { rateLimited } from "@/lib/request";
import { assertProperty } from "@/lib/services/scope";
import { detectLanguage } from "./memory";
import { getProvider, type ChatProvider } from "./provider";

/**
 * The knowledge interview: instead of writing everything about a property by
 * hand, the manager answers short questions (most important first), and the
 * assistant asks a follow-up where an answer leaves the guest guessing. The
 * answers can also be read from the property's Booking.com / Airbnb listing.
 *
 * Answers become guest information notes (one per topic), except check-in /
 * check-out times and house rules, which fill the property's own fields.
 */
type Topic = {
  key: string;
  label: string;
  question: string;
  hint?: string;
  /** Stored on the property instead of as a note. */
  field?: "checkInTime" | "checkOutTime" | "houseRules";
  /** Lines of a listing about this topic (Greek and English, without accents). */
  match?: RegExp;
};

export const INTERVIEW_TOPICS: Topic[] = [
  { key: "checkInTime", label: "Check-in", field: "checkInTime", question: "Από τι ώρα μπορεί να γίνει η άφιξη (check-in);", hint: "π.χ. 15:00", match: /check-?in|αφιξη/ },
  { key: "checkOutTime", label: "Check-out", field: "checkOutTime", question: "Μέχρι τι ώρα πρέπει να γίνει η αναχώρηση (check-out);", hint: "π.χ. 11:00", match: /check-?out|αναχωρηση/ },
  {
    key: "access", label: "Είσοδος", question: "Πώς μπαίνει ο επισκέπτης στο κατάλυμα;",
    hint: "Υποδοχή από εσάς, κλειδοθήκη, έξυπνη κλειδαριά… Μη γράψετε κωδικούς πόρτας: τους στέλνετε εσείς λίγο πριν την άφιξη.",
    match: /κλειδοθηκη|lockbox|key ?box|self[- ]check-?in|αυτοματο check-?in|ρεσεψιον|reception|υποδοχη|front desk/,
  },
  { key: "wifi", label: "Wi-Fi", question: "Ποιο είναι το όνομα και ο κωδικός του Wi-Fi;", hint: "Φαίνεται στον οδηγό επισκέπτη, που τον ανοίγουν μόνο όσοι έχουν τον σύνδεσμο.", match: /wi-?fi|internet|ιντερνετ|ασυρματ/ },
  { key: "parking", label: "Πάρκινγκ", question: "Πού παρκάρει ο επισκέπτης;", hint: "π.χ. δωρεάν στον δρόμο, ιδιωτική θέση στην αυλή, δημοτικό πάρκινγκ 200 μ.", match: /parking|παρκινγκ|σταθμευσ|garage|γκαραζ/ },
  { key: "directions", label: "Πώς θα έρθετε", question: "Πώς φτάνει κανείς από το αεροδρόμιο, το λιμάνι ή τον σταθμό;", hint: "π.χ. ταξί 25 λεπτά (~35 €), λεωφορείο Χ95 μέχρι Σύνταγμα", match: /airport|αεροδρομιο|λιμανι|\bport\b|σταθμο|station|μετρο|metro|λεωφορει|\bbus\b/ },
  { key: "houseRules", label: "Κανόνες", field: "houseRules", question: "Ποιοι είναι οι κανόνες του σπιτιού; (κατοικίδια, κάπνισμα, πάρτι, ώρες ησυχίας)", hint: "Ο επισκέπτης τους αποδέχεται στο online check-in.", match: /κατοικιδι|\bpets?\b|καπνισμα|smoking|παρτι|parties|party|ησυχια|quiet hours/ },
  { key: "climate", label: "Κλιματισμός/θέρμανση", question: "Πώς λειτουργούν ο κλιματισμός και η θέρμανση;", match: /κλιματισ|air[- ]condition|θερμανση|heating|καλοριφερ/ },
  { key: "kitchen", label: "Κουζίνα", question: "Τι έχει η κουζίνα; (καφετιέρα, φούρνος, πλυντήριο πιάτων…)", match: /κουζιν|kitchen|ψυγειο|refrigerator|fridge|φουρνο|oven|καφετιερα|coffee|πλυντηριο πιατων|dishwasher|μικροκυματ|microwave/ },
  { key: "linen", label: "Λευκά είδη", question: "Τι λευκά είδη υπάρχουν; (σεντόνια, πετσέτες, πετσέτες θαλάσσης) Αλλάζουν κατά τη διαμονή;", match: /πετσετ|towel|σεντον|linen|κλινοσκεπασματα/ },
  { key: "laundry", label: "Πλυντήριο", question: "Υπάρχει πλυντήριο ρούχων, σίδερο, σεσουάρ;", match: /πλυντηριο ρουχων|washing machine|σιδερο|\biron\b|σεσουαρ|hairdryer|hair dryer|στεγνωτηρ/ },
  { key: "trash", label: "Σκουπίδια", question: "Πού πετάει ο επισκέπτης τα σκουπίδια και την ανακύκλωση;" },
  { key: "nearby", label: "Κοντά", question: "Τι υπάρχει κοντά; (σούπερ μάρκετ, φούρνος, φαρμακείο, παραλία, εστιατόρια)", match: /σουπερ ?μαρκετ|supermarket|παραλια|beach|εστιατορι|restaurant|φαρμακει|pharmacy|ταβερν|καφε\b|cafe/ },
  { key: "family", label: "Για οικογένειες", question: "Υπάρχει βρεφική κούνια ή καρεκλάκι φαγητού;", match: /κουνια|\bcot\b|crib|καρεκλακι|high chair|βρεφ|infant/ },
  { key: "arrival", label: "Νωρίτερα/αργότερα", question: "Γίνεται νωρίτερη άφιξη, αργή άφιξη ή φύλαξη αποσκευών;", match: /αποσκευ|luggage|baggage|late check|αργη αφιξη|early check/ },
  { key: "checkout", label: "Αναχώρηση", question: "Τι πρέπει να κάνει ο επισκέπτης φεύγοντας; (κλειδιά, πιάτα, σκουπίδια, κλιματιστικά)" },
  { key: "emergency", label: "Σε πρόβλημα", question: "Τι κάνει ο επισκέπτης αν κάτι χαλάσει ή υπάρξει πρόβλημα;", hint: "π.χ. τηλέφωνο επικοινωνίας, πού είναι ο ασφαλειοδιακόπτης και η βάνα του νερού" },
];

const TOPIC_KEYS = INTERVIEW_TOPICS.map((t) => t.key) as [string, ...string[]];
const topicOf = (key: string) => INTERVIEW_TOPICS.find((t) => t.key === key)!;
const plain = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
const TIME = /^([01]?\d|2[0-3])[:.]([0-5]\d)$/;

async function interviewProperty(ctx: OrgContext, propertyId: string) {
  await assertProperty(ctx, propertyId);
  return db.property.findUniqueOrThrow({
    where: { id: propertyId },
    select: { id: true, name: true, checkInTime: true, checkOutTime: true, houseRules: true, interviewSkipped: true },
  });
}

/** Where the interview stands for a property: the answers so far and the next question. */
export async function interviewState(ctx: OrgContext, propertyId: string) {
  const p = await interviewProperty(ctx, propertyId);
  const notes = await db.aIMemory.findMany({
    where: { organizationId: ctx.organizationId, propertyId, kind: "GUEST_INFO", topic: { not: null } },
    orderBy: { createdAt: "asc" },
  });
  const answers = INTERVIEW_TOPICS.map((t) => {
    const answer = t.field ? p[t.field] : (notes.find((n) => n.topic === t.key)?.content.replace(`${t.label}: `, "") ?? null);
    const status = answer ? "answered" : p.interviewSkipped.includes(t.key) ? "skipped" : "open";
    return { key: t.key, label: t.label, question: t.question, hint: t.hint ?? null, answer, status: status as "answered" | "skipped" | "open" };
  });
  const next = answers.find((a) => a.status === "open") ?? null;
  return {
    property: { id: p.id, name: p.name },
    answered: answers.filter((a) => a.status === "answered").length,
    total: answers.length,
    next,
    answers,
    aiEnabled: Boolean(process.env.AI_API_KEY),
  };
}
export type InterviewState = Awaited<ReturnType<typeof interviewState>>;

// ─── Answers ─────────────────────────────────────────────────────────

/** Rule-based follow-ups for when no AI model is connected. */
function ruleFollowUp(topic: string, answer: string): string | null {
  const a = plain(answer);
  switch (topic) {
    case "access":
      if (/κλειδοθηκ|lockbox|key ?box/.test(a)) return "Πού ακριβώς βρίσκεται η κλειδοθήκη; (χωρίς τον κωδικό)";
      if (/εξυπνη|smart|πληκτρολογιο|keypad|ηλεκτρονικ/.test(a)) return "Πώς ανοίγει η κλειδαριά; Περιγράψτε τα βήματα (χωρίς τον κωδικό).";
      if (/υποδοχ|περιμεν|προσωπικα|εγω|εμεις|συνεργατ/.test(a)) return "Τι γίνεται αν ο επισκέπτης φτάσει αργά το βράδυ ή καθυστερήσει;";
      return null;
    case "parking":
      if (/πληρωμ|πληρων|\bpaid\b|€|ευρω/.test(a)) return "Πόσο κοστίζει και πώς πληρώνεται;";
      if (/δρομο|street|δημοσι|ελευθερ/.test(a)) return "Είναι εύκολο να βρει θέση; Υπάρχει σημείο που προτείνετε;";
      return null;
    case "wifi":
      return /[/:,]|κωδικ|pass/.test(a) ? null : "Ποιος είναι ο κωδικός του Wi-Fi;";
    case "climate":
      return /τηλεχειρ|remote/.test(a) ? null : "Πού βρίσκονται τα τηλεχειριστήρια;";
    case "trash":
      return /κοντα|μετρα|γωνια|απεναντι|στο |στη |στον |μ\.?$|\d/.test(a) ? null : "Πού ακριβώς είναι οι κάδοι;";
    case "emergency":
      return /\d{6,}/.test(a.replace(/\s/g, "")) ? null : "Σε ποιο τηλέφωνο μπορεί να σας βρει ο επισκέπτης;";
    default:
      return null;
  }
}

/** One short follow-up question from the model, or null when the answer is complete enough. */
async function aiFollowUp(provider: ChatProvider, topic: Topic, answer: string, propertyName: string) {
  const res = await provider.complete({
    tools: [],
    messages: [
      {
        role: "system",
        content:
          "You help a Greek short-term rental host write practical information for guests. Given a question and the host's answer, " +
          "decide whether a guest would still be left guessing about something important. If so, ask ONE short follow-up question in Greek; " +
          "otherwise reply with the single word NONE. Never ask for door codes, alarm codes or key-box codes. Reply with the question only.",
      },
      { role: "user", content: `Property: ${propertyName}\nQuestion: ${topic.question}\nAnswer: ${answer}` },
    ],
  });
  const text = (res.content ?? "").trim().replace(/^["«]|["»]$/g, "");
  return !text || /^none\.?$/i.test(text) || text.length > 200 ? null : text;
}

const answerInput = z.object({
  propertyId: z.string().min(1),
  topic: z.enum(TOPIC_KEYS),
  answer: z.string().trim().min(1, "Γράψτε μια απάντηση ή πατήστε «Παράλειψη»").max(2000),
  /** The answer to a follow-up: added to the note of the topic. */
  followUp: z.string().trim().max(300).optional(),
});

function checkFieldAnswer(topic: Topic, answer: string) {
  if (topic.field === "checkInTime" || topic.field === "checkOutTime") {
    const m = answer.replace(/\s/g, "").match(TIME);
    if (!m) throw new AppError("VALIDATION", "Γράψτε την ώρα σε μορφή ΩΩ:ΛΛ, π.χ. 15:00", [{ path: "answer", message: "Ώρα σε μορφή ΩΩ:ΛΛ" }]);
    return `${m[1].padStart(2, "0")}:${m[2]}`;
  }
  return answer;
}

/**
 * Saves an answer. Returns a follow-up question when the answer leaves
 * something out (asked once per topic: answers to a follow-up get none).
 */
export async function answerTopic(ctx: OrgContext, input: unknown, provider: ChatProvider | null = getProvider()) {
  const data = answerInput.parse(input);
  const p = await interviewProperty(ctx, data.propertyId);
  const topic = topicOf(data.topic);
  if (topic.key === "access" && /\b\d{4,}\b/.test(data.answer)) {
    throw new AppError("VALIDATION", "Μη γράφετε κωδικούς πόρτας ή κλειδοθήκης εδώ: φαίνονται στον οδηγό επισκέπτη.", [{ path: "answer", message: "Χωρίς κωδικούς πόρτας" }]);
  }

  if (topic.field) {
    const value = checkFieldAnswer(topic, data.answer);
    const current = p[topic.field];
    await db.property.update({
      where: { id: p.id },
      data: { [topic.field]: data.followUp && current ? `${current}\n${value}` : value, interviewSkipped: p.interviewSkipped.filter((k) => k !== topic.key) },
    });
    return { followUp: null };
  }

  const existing = await db.aIMemory.findFirst({ where: { organizationId: ctx.organizationId, propertyId: p.id, kind: "GUEST_INFO", topic: topic.key } });
  const content = data.followUp && existing ? `${existing.content}\n${data.answer}` : `${topic.label}: ${data.answer}`;
  const row = { content, language: detectLanguage(content) ?? "el", active: true, source: "INTERVIEW" as const };
  if (existing) await db.aIMemory.update({ where: { id: existing.id }, data: row });
  else await db.aIMemory.create({ data: { ...row, organizationId: ctx.organizationId, propertyId: p.id, kind: "GUEST_INFO", topic: topic.key, createdByUserId: ctx.userId } });
  if (p.interviewSkipped.includes(topic.key)) {
    await db.property.update({ where: { id: p.id }, data: { interviewSkipped: p.interviewSkipped.filter((k) => k !== topic.key) } });
  }

  if (data.followUp) return { followUp: null };
  let followUp = ruleFollowUp(topic.key, data.answer);
  if (provider) followUp = await aiFollowUp(provider, topic, data.answer, p.name).catch(() => followUp);
  return { followUp };
}

const skipInput = z.object({ propertyId: z.string().min(1), topic: z.enum(TOPIC_KEYS) });

/** "Doesn't apply / later": the interview moves on and does not ask again. */
export async function skipTopic(ctx: OrgContext, input: unknown) {
  const data = skipInput.parse(input);
  const p = await interviewProperty(ctx, data.propertyId);
  if (!p.interviewSkipped.includes(data.topic)) {
    await db.property.update({ where: { id: p.id }, data: { interviewSkipped: [...p.interviewSkipped, data.topic] } });
  }
}

/** Ask the skipped questions again. */
export async function resetSkipped(ctx: OrgContext, propertyId: string) {
  await interviewProperty(ctx, propertyId);
  await db.property.update({ where: { id: propertyId }, data: { interviewSkipped: [] } });
}

// ─── Reading a listing ───────────────────────────────────────────────

const LISTING_HOSTS = /(^|\.)(booking\.com|airbnb\.[a-z.]+|vrbo\.com|abritel\.fr|fewo-direkt\.de)$/;

/** Visible text of an HTML page (one line per block), with the JSON-LD description kept. */
export function htmlToText(html: string) {
  const ld = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => {
      try {
        const j = JSON.parse(m[1]) as { description?: string };
        return typeof j.description === "string" ? j.description : "";
      } catch {
        return "";
      }
    })
    .filter(Boolean);
  const body = html
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr|\/section|\/span|\/dt|\/dd)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)));
  return [...ld, body].join("\n").split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
}

/** A time on the same or the next line as a check-in / check-out label. */
function findTime(lines: string[], label: RegExp, prefer: "first" | "last") {
  for (let i = 0; i < lines.length; i++) {
    if (!label.test(plain(lines[i]))) continue;
    const window = `${lines[i]} ${lines[i + 1] ?? ""} ${lines[i + 2] ?? ""}`;
    const times = [...window.matchAll(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g)].map((m) => `${m[1].padStart(2, "0")}:${m[2]}`);
    if (times.length) return prefer === "first" ? times[0] : times.at(-1)!;
  }
  return null;
}

/** Suggested answers from a listing's text, without an AI model: the lines about each topic. */
export function suggestFromText(text: string) {
  const lines = text.split(/\n|(?<=[.!])\s+/).map((l) => l.trim()).filter((l) => l.length >= 3 && l.length <= 240);
  const out: Record<string, string> = {};
  const checkIn = findTime(lines, /check-?in|αφιξη/, "first");
  const checkOut = findTime(lines, /check-?out|αναχωρηση/, "last");
  if (checkIn) out.checkInTime = checkIn;
  if (checkOut) out.checkOutTime = checkOut;
  for (const t of INTERVIEW_TOPICS) {
    if (!t.match || t.field === "checkInTime" || t.field === "checkOutTime") continue;
    const found: string[] = [];
    for (const l of lines) {
      if (t.match.test(plain(l)) && !found.some((f) => plain(f) === plain(l))) found.push(l);
      if (found.length === 4) break;
    }
    if (found.length) out[t.key] = found.join("\n");
  }
  return out;
}

/** The model reads the listing and answers each topic in Greek (null when the listing does not say). */
async function aiSuggest(provider: ChatProvider, text: string) {
  const topics = INTERVIEW_TOPICS.map((t) => `- ${t.key}: ${t.question}`).join("\n");
  const res = await provider.complete({
    tools: [],
    messages: [
      {
        role: "system",
        content:
          "Read the text of a vacation-rental listing and answer each topic for the host, in Greek, using ONLY what the listing says. " +
          'Reply with a JSON object {"<topic key>": "<answer>"}; leave out topics the listing does not mention. ' +
          "checkInTime / checkOutTime: a single time HH:MM. Keep each answer short and practical.\n\nTopics:\n" + topics,
      },
      { role: "user", content: text.slice(0, 15_000) },
    ],
  });
  const json = (res.content ?? "").match(/\{[\s\S]*\}/)?.[0];
  if (!json) return null;
  const parsed = z.record(z.string(), z.unknown()).parse(JSON.parse(json));
  return Object.fromEntries(
    Object.entries(parsed).filter((e): e is [string, string] => TOPIC_KEYS.includes(e[0]) && typeof e[1] === "string" && e[1].trim().length > 0).map(([k, v]) => [k, v.trim().slice(0, 2000)]),
  );
}

const importInput = z
  .object({
    propertyId: z.string().min(1),
    url: z.preprocess((v) => (v === "" ? undefined : v), z.url("Μη έγκυρος σύνδεσμος").optional()),
    text: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().min(50, "Επικολλήστε περισσότερο κείμενο από τη σελίδα").max(100_000).optional()),
  })
  .refine((d) => d.url || d.text, { message: "Δώστε σύνδεσμο ή επικολλήστε το κείμενο της σελίδας", path: ["text"] });

/**
 * Reads a listing (from its link, or from text the manager pasted) and
 * suggests answers. Nothing is saved: the manager reviews them first.
 */
export async function suggestFromListing(ctx: OrgContext, input: unknown, provider: ChatProvider | null = getProvider()) {
  const data = importInput.parse(input);
  await interviewProperty(ctx, data.propertyId);
  if (await rateLimited(`listing:${ctx.organizationId}`, 20, 3_600_000)) throw new AppError("BAD_REQUEST", "Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.");

  let text = data.text ?? "";
  if (!text && data.url) {
    const url = new URL(data.url);
    if (!LISTING_HOSTS.test(url.hostname)) throw new AppError("VALIDATION", "Δώστε σύνδεσμο από Booking.com ή Airbnb, ή επικολλήστε το κείμενο της σελίδας.", [{ path: "url", message: "Booking.com ή Airbnb" }]);
    const page = await fetchPublicText(url.toString(), {
      maxBytes: 5_000_000,
      timeoutMs: 15_000,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Vrachychronia/1.0)", "Accept-Language": "el,en;q=0.8", Accept: "text/html" },
    }).catch((e: unknown) => {
      if (e instanceof BlockedUrlError) throw new AppError("VALIDATION", "Ο σύνδεσμος δεν επιτρέπεται.", [{ path: "url", message: "Μη επιτρεπτός σύνδεσμος" }]);
      return { ok: false as const, status: 0, text: "" };
    });
    text = page.ok ? htmlToText(page.text) : "";
    // Booking.com and Airbnb often answer automated requests with a challenge page or a JavaScript shell.
    if (text.length < 400) return { readPage: false, suggestions: [] };
  }

  let found: Record<string, string> | null = null;
  if (provider) found = await aiSuggest(provider, text).catch(() => null);
  found ??= suggestFromText(text);
  const suggestions = INTERVIEW_TOPICS.filter((t) => found![t.key]).map((t) => ({ key: t.key, label: t.label, question: t.question, answer: found![t.key] }));
  return { readPage: true, suggestions };
}

const applyInput = z.object({
  propertyId: z.string().min(1),
  answers: z.array(z.object({ topic: z.enum(TOPIC_KEYS), answer: z.string().trim().min(1).max(2000) })).max(INTERVIEW_TOPICS.length),
});

/** Saves the reviewed suggestions from a listing (an answer already given is replaced). */
export async function applySuggestions(ctx: OrgContext, input: unknown) {
  const data = applyInput.parse(input);
  const p = await interviewProperty(ctx, data.propertyId);
  const fields: Record<string, string> = {};
  for (const a of data.answers) {
    const topic = topicOf(a.topic);
    if (topic.field) {
      try {
        fields[topic.field] = checkFieldAnswer(topic, a.answer);
      } catch {
        // A time the listing wrote in another way: ask it in the interview instead.
      }
      continue;
    }
    if (topic.key === "access" && /\b\d{4,}\b/.test(a.answer)) continue;
    const content = `${topic.label}: ${a.answer}`;
    const row = { content, language: detectLanguage(content) ?? "el", active: true, source: "IMPORT" as const };
    const existing = await db.aIMemory.findFirst({ where: { organizationId: ctx.organizationId, propertyId: p.id, kind: "GUEST_INFO", topic: topic.key } });
    if (existing) await db.aIMemory.update({ where: { id: existing.id }, data: row });
    else await db.aIMemory.create({ data: { ...row, organizationId: ctx.organizationId, propertyId: p.id, kind: "GUEST_INFO", topic: topic.key, createdByUserId: ctx.userId } });
  }
  const saved = new Set(data.answers.map((a) => a.topic));
  await db.property.update({ where: { id: p.id }, data: { ...fields, interviewSkipped: p.interviewSkipped.filter((k) => !saved.has(k)) } });
  return interviewState(ctx, p.id);
}
