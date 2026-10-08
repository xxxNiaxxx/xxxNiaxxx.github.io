import { z } from "zod";
import { db } from "@/lib/db";
import { dateToISO, diffDaysISO } from "@/lib/dates";
import { notFound } from "@/lib/errors";
import { guestLanguage, type GuestLanguage } from "@/lib/i18n/guest-language";
import { formatGuestDate } from "@/lib/i18n/guest-messages";
import type { OrgContext } from "@/lib/permissions";
import { SOURCE_LABELS } from "@/lib/reservation-sources";
import { detectLanguage, guestInfoFor, memoriesForPrompt } from "./memory";
import { normalize } from "./offline";
import { getProvider, type ChatProvider } from "./provider";

const input = z.object({
  reservationId: z.string().min(1),
  guestMessage: z.string().trim().min(2, "Επικολλήστε το μήνυμα του επισκέπτη").max(5000),
});

const LANGUAGE_ENGLISH: Record<GuestLanguage, string> = {
  el: "Greek", en: "English", de: "German", fr: "French", it: "Italian", es: "Spanish",
  pt: "Portuguese", nl: "Dutch", pl: "Polish", cs: "Czech", sv: "Swedish", sr: "Serbian (Latin script)",
};

/** Phrases for the offline reply (no LLM): greeting, thanks, "we'll check", closing. */
const PHRASES: Record<GuestLanguage, [string, string, string, string]> = {
  el: ["Γεια σας", "Σας ευχαριστούμε για το μήνυμά σας!", "Θα το ελέγξουμε και θα σας απαντήσουμε σύντομα.", "Με εκτίμηση"],
  en: ["Hi", "Thank you for your message!", "We'll check and get back to you shortly.", "Best regards"],
  de: ["Hallo", "Vielen Dank für Ihre Nachricht!", "Wir prüfen das und melden uns in Kürze bei Ihnen.", "Viele Grüße"],
  fr: ["Bonjour", "Merci pour votre message !", "Nous vérifions et revenons vers vous très vite.", "Cordialement"],
  it: ["Ciao", "Grazie per il tuo messaggio!", "Controlliamo e ti rispondiamo a breve.", "Cordiali saluti"],
  es: ["Hola", "¡Gracias por tu mensaje!", "Lo comprobamos y te respondemos en breve.", "Un saludo"],
  pt: ["Olá", "Obrigado pela sua mensagem!", "Vamos verificar e respondemos em breve.", "Com os melhores cumprimentos"],
  nl: ["Hallo", "Bedankt voor uw bericht!", "We zoeken het uit en laten het u snel weten.", "Met vriendelijke groet"],
  pl: ["Dzień dobry", "Dziękujemy za wiadomość!", "Sprawdzimy to i wkrótce odpowiemy.", "Pozdrawiamy serdecznie"],
  cs: ["Dobrý den", "Děkujeme za vaši zprávu!", "Ověříme to a brzy se vám ozveme.", "S pozdravem"],
  sv: ["Hej", "Tack för ditt meddelande!", "Vi kollar upp det och återkommer snart.", "Vänliga hälsningar"],
  sr: ["Zdravo", "Hvala na poruci!", "Proverićemo i uskoro vam se javljamo.", "Srdačan pozdrav"],
};

/** Topics a guest asks about, with words (without accents) in the usual languages. */
const TOPICS: Record<string, string[]> = {
  wifi: ["wifi", "wi-fi", "internet", "wlan", "password", "passwort", "ιντερνετ", "ασυρματ"],
  parking: ["park", "παρκ", "stationnement", "aparcamiento", "parcheggio", "garage", "γκαραζ"],
  checkin: ["check-in", "check in", "checkin", "arriv", "αφιξ", "ερθουμε", "φτασουμε", "ankunft", "anreise", "llegada", "arrivo", "early", "νωριτερα", "key", "κλειδ", "schlussel", "cle", "chiave", "llave", "door", "πορτα"],
  checkout: ["check-out", "check out", "checkout", "αναχωρ", "depart", "abreise", "partenza", "salida", "late", "αργοτερα"],
  luggage: ["luggage", "bag", "αποσκευ", "βαλιτσ", "gepack", "bagage", "equipaje", "bagagli"],
  address: ["address", "διευθυνσ", "where is", "location", "directions", "πως θα", "adresse", "direccion", "indirizzo", "τοποθεσια"],
  towels: ["towel", "πετσετ", "sheet", "σεντον", "handtuch", "serviette", "asciugaman", "toalla"],
};

/** Common words, to tell which language a guest wrote in without an LLM. */
const STOPWORDS: Partial<Record<GuestLanguage, string[]>> = {
  en: ["the", "is", "what", "where", "when", "can", "we", "you", "please", "thanks", "thank", "hello", "hi", "and", "our", "there", "how"],
  de: ["der", "die", "das", "ist", "wir", "sie", "und", "bitte", "danke", "hallo", "wo", "wann", "können", "gibt", "es", "ich"],
  fr: ["le", "la", "les", "est", "nous", "vous", "et", "merci", "bonjour", "où", "quand", "pouvons", "il", "je", "pour"],
  it: ["il", "la", "è", "noi", "voi", "e", "grazie", "ciao", "buongiorno", "dove", "quando", "possiamo", "c'è", "per", "che"],
  es: ["el", "la", "es", "nosotros", "usted", "y", "gracias", "hola", "dónde", "cuándo", "podemos", "hay", "para", "que"],
  pt: ["o", "a", "é", "nós", "você", "e", "obrigado", "obrigada", "olá", "onde", "quando", "podemos", "há", "para"],
  nl: ["de", "het", "is", "wij", "we", "u", "en", "bedankt", "hallo", "waar", "wanneer", "kunnen", "er", "voor"],
};

/** Greek script, or the language whose common words clearly appear; null when unclear. */
export function detectMessageLanguage(text: string): GuestLanguage | null {
  const greek = detectLanguage(text);
  if (greek) return greek;
  const words = text.toLowerCase().split(/[^\p{L}']+/u).filter(Boolean);
  const scores = Object.entries(STOPWORDS)
    .map(([lang, list]) => [lang as GuestLanguage, words.filter((w) => list!.includes(w)).length] as const)
    .sort((a, b) => b[1] - a[1]);
  const [best, second] = scores;
  return best && best[1] >= 2 && best[1] > (second?.[1] ?? 0) ? best[0] : null;
}

function topicsOf(text: string) {
  const t = normalize(text);
  return Object.entries(TOPICS).filter(([, words]) => words.some((w) => t.includes(normalize(w)))).map(([topic]) => topic);
}

async function loadStay(ctx: OrgContext, reservationId: string) {
  const r = await db.reservation.findFirst({
    where: { id: reservationId, organizationId: ctx.organizationId },
    include: { guest: true, property: { select: { id: true, name: true, address: true, city: true, description: true } } },
  });
  if (!r) throw notFound("Reservation");
  return r;
}

/** Link to the conversation on the platform, when we can build one. */
export function platformConversationUrl(source: string, code: string | null) {
  if (source === "AIRBNB" && code && /^HM[A-Z0-9]+$/i.test(code)) return `https://www.airbnb.com/hosting/reservations/details/${code}`;
  if (source === "AIRBNB") return "https://www.airbnb.com/hosting/messages";
  if (source === "BOOKING_COM") return "https://admin.booking.com/";
  return null;
}

/**
 * Drafts a reply to a guest's message (pasted from Airbnb/Booking/email):
 * in the guest's language, with what the team taught the assistant about the
 * property (Wi-Fi, parking, check-in…). It never invents codes or facts: when
 * something is unknown, the draft says the host will check.
 */
export async function draftGuestReply(ctx: OrgContext, raw: unknown, provider: ChatProvider | null = getProvider()) {
  const data = input.parse(raw);
  const r = await loadStay(ctx, data.reservationId);
  const checkIn = dateToISO(r.checkIn);
  const checkOut = dateToISO(r.checkOut);
  const name = r.guest.firstName;
  const conversationUrl = platformConversationUrl(r.source, r.confirmationCode);
  // The language the guest wrote in; when unclear, the guest's language (preference/country).
  const language = detectMessageLanguage(data.guestMessage) ?? guestLanguage(r.guest);

  if (provider) {
    const org = await db.organization.findUniqueOrThrow({ where: { id: ctx.organizationId }, select: { name: true } });
    const info = await db.aIMemory.findMany({
      where: { organizationId: ctx.organizationId, kind: "GUEST_INFO", active: true, OR: [{ propertyId: r.propertyId }, { propertyId: null }] },
      orderBy: { createdAt: "asc" },
      take: 60,
    });
    const knowledge = await memoriesForPrompt(ctx);
    const out = await provider.complete({
      tools: [],
      messages: [
        {
          role: "system",
          content: [
            `You draft replies for the short-term rental host "${org.name}" to a guest's message. The host will review and send it.`,
            `Reply in the same language as the guest's message (if unclear, in ${LANGUAGE_ENGLISH[language]}). Be warm, short and concrete; plain text, no subject line, no markdown.`,
            "Use ONLY the facts below. Never invent Wi-Fi passwords, door codes, times, prices or policies. If the answer is not in the facts, say politely that you will check and get back to them.",
            `Address the guest by first name (${name}) and sign as ${org.name}.`,
            "",
            "Stay:",
            `- Property: ${r.property.name}${r.property.address ? `, ${r.property.address}` : ""}${r.property.city ? `, ${r.property.city}` : ""}`,
            `- Guest: ${r.guest.firstName} ${r.guest.lastName}, ${r.guestsCount} guest(s), booked on ${SOURCE_LABELS[r.source] ?? r.source}`,
            `- Check-in ${checkIn}, check-out ${checkOut} (${diffDaysISO(checkIn, checkOut)} nights), status ${r.status}`,
            r.property.description ? `- Property description: ${r.property.description.slice(0, 1500)}` : "",
            "",
            info.length ? `Information for guests about this property (translate as needed):\n${info.map((m) => `- ${m.content}`).join("\n")}` : "No guest information has been saved for this property yet.",
            knowledge ? `\nWhat the team taught the assistant:\n${knowledge}` : "",
          ].filter((l) => l !== "").join("\n"),
        },
        { role: "user", content: data.guestMessage },
      ],
    });
    const reply = out.content?.trim();
    if (reply) return { reply, offline: false, usedInfo: info.length, conversationUrl };
  }

  // Offline: greeting + the saved notes on the topics the guest asks about.
  const [hi, thanks, willCheck, bye] = PHRASES[language];
  const topics = topicsOf(data.guestMessage);
  const notes = await guestInfoFor(ctx, r.propertyId, language);
  const relevant = notes.filter((n) => topicsOf(n).some((t) => topics.includes(t)));
  const address = topics.includes("address") && r.property.address ? [`${r.property.name}: ${r.property.address}${r.property.city ? `, ${r.property.city}` : ""}`] : [];
  const answer = [...address, ...relevant];
  const dates = `${formatGuestDate(checkIn, language)} – ${formatGuestDate(checkOut, language)}`;
  const reply = [
    `${hi} ${name},`,
    thanks,
    answer.length ? answer.join("\n\n") : willCheck,
    `${bye}\n${r.property.name} (${dates})`,
  ].join("\n\n");
  return { reply, offline: true, usedInfo: answer.length, conversationUrl };
}
