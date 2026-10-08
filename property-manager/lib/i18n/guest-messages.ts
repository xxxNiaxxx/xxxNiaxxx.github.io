import type { GuestLanguage } from "./guest-language";

/**
 * Guest message templates used by the offline assistant (the LLM writes its own
 * text in the guest's language). Dates are formatted in the guest's locale.
 */
export type MessageKind = "checkin" | "thanks" | "general" | "noStay";

interface Vars {
  name: string;
  property: string;
  checkIn: string;
  checkOut: string;
}

const LOCALES: Record<GuestLanguage, string> = {
  el: "el-GR", en: "en-GB", de: "de-DE", fr: "fr-FR", it: "it-IT", es: "es-ES",
  pt: "pt-PT", nl: "nl-NL", pl: "pl-PL", cs: "cs-CZ", sv: "sv-SE", sr: "sr-Latn-RS",
};

export function formatGuestDate(iso: string, lang: GuestLanguage) {
  return new Intl.DateTimeFormat(LOCALES[lang], { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

type Templates = Record<MessageKind, (v: Vars) => string>;

const T: Record<GuestLanguage, Templates> = {
  el: {
    checkin: (v) => `Γεια σας ${v.name},\n\nΣας περιμένουμε στο ${v.property} στις ${v.checkIn}. Το check-in είναι από τις 15:00. Το πρωί της άφιξής σας θα σας στείλουμε τον κωδικό της πόρτας και οδηγίες — απαντήστε μας με την ώρα που υπολογίζετε να φτάσετε.\n\nΚαλό ταξίδι!`,
    thanks: (v) => `Γεια σας ${v.name},\n\nΣας ευχαριστούμε που μείνατε στο ${v.property}! Ελπίζουμε να περάσατε υπέροχα. Αν σας άρεσε η διαμονή, μια κριτική θα μας βοηθούσε πολύ.\n\nΜε εκτίμηση`,
    general: (v) => `Γεια σας ${v.name},\n\nΕπικοινωνούμε για τη διαμονή σας στο ${v.property} (${v.checkIn} – ${v.checkOut}). Πείτε μας αν χρειάζεστε οτιδήποτε.\n\nΜε εκτίμηση`,
    noStay: (v) => `Γεια σας ${v.name},\n\nΣας ευχαριστούμε που μείνατε μαζί μας. Είμαστε στη διάθεσή σας για οτιδήποτε χρειαστείτε.\n\nΜε εκτίμηση`,
  },
  en: {
    checkin: (v) => `Hi ${v.name},\n\nWe're looking forward to welcoming you at ${v.property} on ${v.checkIn}. Check-in is from 15:00. We'll send you the door code and directions on the morning of your arrival — just reply here with your expected arrival time.\n\nSee you soon!`,
    thanks: (v) => `Hi ${v.name},\n\nThank you for staying at ${v.property}! We hope you had a wonderful time. If you enjoyed your stay, we'd really appreciate a review.\n\nWarm regards`,
    general: (v) => `Hi ${v.name},\n\nJust checking in about your stay at ${v.property} (${v.checkIn} – ${v.checkOut}). Let us know if there's anything you need.\n\nBest regards`,
    noStay: (v) => `Hi ${v.name},\n\nThank you for being our guest. Let us know if there's anything we can help with.\n\nBest regards`,
  },
  de: {
    checkin: (v) => `Hallo ${v.name},\n\nwir freuen uns, Sie am ${v.checkIn} in der Unterkunft ${v.property} begrüßen zu dürfen. Der Check-in ist ab 15:00 Uhr möglich. Am Morgen Ihrer Anreise schicken wir Ihnen den Türcode und eine Wegbeschreibung — antworten Sie uns gern mit Ihrer voraussichtlichen Ankunftszeit.\n\nGute Reise!`,
    thanks: (v) => `Hallo ${v.name},\n\nvielen Dank für Ihren Aufenthalt in ${v.property}! Wir hoffen, Sie hatten eine wunderbare Zeit. Wenn es Ihnen gefallen hat, würden wir uns sehr über eine Bewertung freuen.\n\nHerzliche Grüße`,
    general: (v) => `Hallo ${v.name},\n\nwir melden uns wegen Ihres Aufenthalts in ${v.property} (${v.checkIn} – ${v.checkOut}). Lassen Sie uns wissen, wenn Sie etwas brauchen.\n\nViele Grüße`,
    noStay: (v) => `Hallo ${v.name},\n\nvielen Dank, dass Sie unser Gast waren. Melden Sie sich jederzeit, wenn wir Ihnen helfen können.\n\nViele Grüße`,
  },
  fr: {
    checkin: (v) => `Bonjour ${v.name},\n\nNous avons hâte de vous accueillir à ${v.property} le ${v.checkIn}. L'arrivée est possible à partir de 15h00. Le matin de votre arrivée, nous vous enverrons le code de la porte et l'itinéraire — n'hésitez pas à nous indiquer votre heure d'arrivée prévue.\n\nÀ très bientôt !`,
    thanks: (v) => `Bonjour ${v.name},\n\nMerci d'avoir séjourné à ${v.property} ! Nous espérons que vous avez passé un excellent séjour. S'il vous a plu, un avis nous ferait très plaisir.\n\nBien cordialement`,
    general: (v) => `Bonjour ${v.name},\n\nNous revenons vers vous au sujet de votre séjour à ${v.property} (${v.checkIn} – ${v.checkOut}). N'hésitez pas à nous dire si vous avez besoin de quoi que ce soit.\n\nCordialement`,
    noStay: (v) => `Bonjour ${v.name},\n\nMerci d'avoir été notre hôte. Nous restons à votre disposition pour toute question.\n\nCordialement`,
  },
  it: {
    checkin: (v) => `Ciao ${v.name},\n\nnon vediamo l'ora di accoglierti a ${v.property} il ${v.checkIn}. Il check-in è dalle 15:00. La mattina del tuo arrivo ti invieremo il codice della porta e le indicazioni — rispondi pure con l'orario di arrivo previsto.\n\nA presto!`,
    thanks: (v) => `Ciao ${v.name},\n\ngrazie per aver soggiornato a ${v.property}! Speriamo che tu abbia trascorso un soggiorno splendido. Se ti è piaciuto, una recensione ci farebbe davvero piacere.\n\nUn caro saluto`,
    general: (v) => `Ciao ${v.name},\n\nti scriviamo riguardo al tuo soggiorno a ${v.property} (${v.checkIn} – ${v.checkOut}). Facci sapere se hai bisogno di qualcosa.\n\nCordiali saluti`,
    noStay: (v) => `Ciao ${v.name},\n\ngrazie per essere stato nostro ospite. Siamo a disposizione per qualsiasi necessità.\n\nCordiali saluti`,
  },
  es: {
    checkin: (v) => `Hola ${v.name},\n\nTenemos muchas ganas de recibirte en ${v.property} el ${v.checkIn}. El check-in es a partir de las 15:00. La mañana de tu llegada te enviaremos el código de la puerta y cómo llegar; respóndenos con tu hora de llegada prevista.\n\n¡Hasta pronto!`,
    thanks: (v) => `Hola ${v.name},\n\n¡Gracias por alojarte en ${v.property}! Esperamos que lo hayas pasado de maravilla. Si te gustó la estancia, te agradeceríamos mucho una reseña.\n\nUn cordial saludo`,
    general: (v) => `Hola ${v.name},\n\nTe escribimos sobre tu estancia en ${v.property} (${v.checkIn} – ${v.checkOut}). Avísanos si necesitas cualquier cosa.\n\nUn saludo`,
    noStay: (v) => `Hola ${v.name},\n\nGracias por haber sido nuestro huésped. Estamos a tu disposición para lo que necesites.\n\nUn saludo`,
  },
  pt: {
    checkin: (v) => `Olá ${v.name},\n\nEstamos ansiosos por recebê-lo em ${v.property} no dia ${v.checkIn}. O check-in é a partir das 15:00. Na manhã da sua chegada enviaremos o código da porta e as indicações — responda-nos com a hora prevista de chegada.\n\nAté breve!`,
    thanks: (v) => `Olá ${v.name},\n\nObrigado por ter ficado em ${v.property}! Esperamos que tenha tido uma estadia maravilhosa. Se gostou, agradecíamos muito uma avaliação.\n\nCom os melhores cumprimentos`,
    general: (v) => `Olá ${v.name},\n\nEscrevemos a propósito da sua estadia em ${v.property} (${v.checkIn} – ${v.checkOut}). Diga-nos se precisar de alguma coisa.\n\nCumprimentos`,
    noStay: (v) => `Olá ${v.name},\n\nObrigado por ter sido nosso hóspede. Estamos ao dispor para o que precisar.\n\nCumprimentos`,
  },
  nl: {
    checkin: (v) => `Hallo ${v.name},\n\nWe kijken ernaar uit je op ${v.checkIn} te verwelkomen in ${v.property}. Inchecken kan vanaf 15:00 uur. Op de ochtend van je aankomst sturen we je de deurcode en een routebeschrijving — laat ons gerust weten hoe laat je verwacht aan te komen.\n\nTot snel!`,
    thanks: (v) => `Hallo ${v.name},\n\nBedankt voor je verblijf in ${v.property}! We hopen dat je een geweldige tijd hebt gehad. Als het je bevallen is, stellen we een review zeer op prijs.\n\nHartelijke groeten`,
    general: (v) => `Hallo ${v.name},\n\nWe nemen contact op over je verblijf in ${v.property} (${v.checkIn} – ${v.checkOut}). Laat het ons weten als je iets nodig hebt.\n\nMet vriendelijke groet`,
    noStay: (v) => `Hallo ${v.name},\n\nBedankt dat je onze gast was. We helpen je graag als je iets nodig hebt.\n\nMet vriendelijke groet`,
  },
  pl: {
    checkin: (v) => `Dzień dobry ${v.name},\n\nCzekamy na Państwa w ${v.property} dnia ${v.checkIn}. Zameldowanie jest możliwe od 15:00. Rano w dniu przyjazdu wyślemy kod do drzwi i wskazówki dojazdu — prosimy o informację o przewidywanej godzinie przyjazdu.\n\nDo zobaczenia!`,
    thanks: (v) => `Dzień dobry ${v.name},\n\nDziękujemy za pobyt w ${v.property}! Mamy nadzieję, że był udany. Jeśli się podobało, będziemy wdzięczni za opinię.\n\nSerdecznie pozdrawiamy`,
    general: (v) => `Dzień dobry ${v.name},\n\nPiszemy w sprawie Państwa pobytu w ${v.property} (${v.checkIn} – ${v.checkOut}). Prosimy dać znać, jeśli czegoś potrzebujecie.\n\nPozdrawiamy`,
    noStay: (v) => `Dzień dobry ${v.name},\n\nDziękujemy, że byli Państwo naszymi gośćmi. Chętnie pomożemy w razie potrzeby.\n\nPozdrawiamy`,
  },
  cs: {
    checkin: (v) => `Dobrý den, ${v.name},\n\ntěšíme se na Vás v ${v.property} dne ${v.checkIn}. Check-in je možný od 15:00. Ráno v den příjezdu Vám pošleme kód ke dveřím a popis cesty — dejte nám prosím vědět, kdy plánujete dorazit.\n\nŠťastnou cestu!`,
    thanks: (v) => `Dobrý den, ${v.name},\n\nděkujeme za pobyt v ${v.property}! Doufáme, že se Vám u nás líbilo. Pokud ano, budeme moc rádi za recenzi.\n\nS pozdravem`,
    general: (v) => `Dobrý den, ${v.name},\n\nozýváme se ohledně Vašeho pobytu v ${v.property} (${v.checkIn} – ${v.checkOut}). Dejte nám vědět, pokud budete cokoli potřebovat.\n\nS pozdravem`,
    noStay: (v) => `Dobrý den, ${v.name},\n\nděkujeme, že jste byli našimi hosty. Rádi Vám kdykoli pomůžeme.\n\nS pozdravem`,
  },
  sv: {
    checkin: (v) => `Hej ${v.name},\n\nVi ser fram emot att välkomna dig till ${v.property} den ${v.checkIn}. Incheckning sker från kl. 15.00. På morgonen den dag du anländer skickar vi dörrkoden och vägbeskrivning — svara gärna med din beräknade ankomsttid.\n\nVälkommen!`,
    thanks: (v) => `Hej ${v.name},\n\nTack för att du bodde på ${v.property}! Vi hoppas att du hade det underbart. Om du trivdes skulle vi uppskatta ett omdöme mycket.\n\nVänliga hälsningar`,
    general: (v) => `Hej ${v.name},\n\nVi hör av oss angående din vistelse på ${v.property} (${v.checkIn} – ${v.checkOut}). Säg till om du behöver något.\n\nVänliga hälsningar`,
    noStay: (v) => `Hej ${v.name},\n\nTack för att du var vår gäst. Hör av dig om vi kan hjälpa till med något.\n\nVänliga hälsningar`,
  },
  sr: {
    checkin: (v) => `Zdravo ${v.name},\n\nRadujemo se što ćemo vas dočekati u ${v.property} ${v.checkIn}. Prijava je od 15:00. Ujutru na dan dolaska poslaćemo vam šifru za vrata i uputstva — javite nam kada očekujete da stignete.\n\nSrećan put!`,
    thanks: (v) => `Zdravo ${v.name},\n\nHvala što ste boravili u ${v.property}! Nadamo se da ste se lepo proveli. Ako vam se dopalo, bili bismo zahvalni na recenziji.\n\nSrdačan pozdrav`,
    general: (v) => `Zdravo ${v.name},\n\nJavljamo se povodom vašeg boravka u ${v.property} (${v.checkIn} – ${v.checkOut}). Recite nam ako vam bilo šta treba.\n\nPozdrav`,
    noStay: (v) => `Zdravo ${v.name},\n\nHvala što ste bili naš gost. Tu smo ako vam bilo šta zatreba.\n\nPozdrav`,
  },
};

export function guestMessageTemplate(
  kind: MessageKind,
  lang: GuestLanguage,
  vars: { name: string; property?: string; checkIn?: string; checkOut?: string },
) {
  const v: Vars = {
    name: vars.name,
    property: vars.property ?? "",
    checkIn: vars.checkIn ? formatGuestDate(vars.checkIn, lang) : "",
    checkOut: vars.checkOut ? formatGuestDate(vars.checkOut, lang) : "",
  };
  return T[lang][vars.property ? kind : "noStay"](v);
}
