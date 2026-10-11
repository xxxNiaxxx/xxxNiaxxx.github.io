/** Days an approval (sign-up) link stays valid. */
export const ACCESS_DAYS = 14;

/** Phone number for wa.me / sms links: digits with the country code (Greek numbers get +30). */
export function internationalPhone(phone: string | null | undefined) {
  if (!phone) return null;
  let d = phone.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (/^(69\d{8}|2\d{9})$/.test(d)) d = `30${d}`;
  d = d.replace(/\D/g, "");
  return d.length >= 10 && d.length <= 15 ? d : null;
}

/**
 * The message that goes with an approval link sent by Messenger, Viber,
 * WhatsApp or SMS, from the team: about what the host gets, without the usual
 * objections (cost, card, time), and an open door to reply.
 */
export function approvalMessage(name: string, url: string) {
  const first = name.trim().split(/\s+/)[0] || name;
  return [
    `Γεια σας ${first}! 😊`,
    "Από την ομάδα του Βραχυχρόνια.ai: η πρόσβασή σας είναι έτοιμη!",
    "Σε 5 λεπτά ανεβάζετε το αρχείο κρατήσεων της Booking ή του Airbnb και βλέπετε πόσα σας μένουν πραγματικά καθαρά και τη δήλωση της ΑΑΔΕ έτοιμη. Χωρίς Excel και χωρίς άγχος στο τέλος του μήνα.",
    "Είναι δωρεάν μέχρι το τέλος του 2026, χωρίς κάρτα, και δουλεύει και από το κινητό.",
    `Ο προσωπικός σας σύνδεσμος (ισχύει ${ACCESS_DAYS} ημέρες):\n${url}`,
    "Ό,τι απορία έχετε, γράψτε μας εδώ. Θα χαρούμε πολύ να ακούσουμε τη γνώμη σας!",
  ].join("\n\n");
}

/** Where hosts get their bookings (waitlist form). Shared by the form, the admin page and the service. */
export const WAITLIST_PLATFORM_GROUPS = [
  {
    label: "Πλατφόρμες",
    options: [
      ["BOOKING_COM", "Booking.com"],
      ["AIRBNB", "Airbnb"],
      ["VRBO", "Vrbo"],
      ["EXPEDIA", "Expedia / Hotels.com"],
      ["AGODA", "Agoda"],
      ["TRIP_COM", "Trip.com"],
      ["GOOGLE", "Google (Ενοικιάσεις διακοπών)"],
      ["HOLIDU", "Holidu"],
      ["HOMETOGO", "HomeToGo"],
    ],
  },
  {
    label: "Άλλα κανάλια",
    options: [
      ["DIRECT", "Απευθείας (τηλέφωνο, email, σταθεροί πελάτες)"],
      ["OWN_SITE", "Δικό μου site"],
      ["SOCIAL", "Facebook / Instagram"],
      ["TRAVEL_AGENCY", "Ταξιδιωτικά γραφεία / tour operators"],
      ["OTHER", "Άλλο"],
    ],
  },
] as const;

export type WaitlistPlatform = (typeof WAITLIST_PLATFORM_GROUPS)[number]["options"][number][0];

export const WAITLIST_PLATFORMS: Record<string, string> = Object.fromEntries(
  WAITLIST_PLATFORM_GROUPS.flatMap((g) => g.options.map(([value, label]) => [value, label.replace(/ \(.*\)$/, "")])),
);

export const WAITLIST_PLATFORM_VALUES = Object.keys(WAITLIST_PLATFORMS) as [WaitlistPlatform, ...WaitlistPlatform[]];

/**
 * A first personal message to someone who just joined the waitlist, from the
 * team: thanks, why the app exists, and one question about what troubles
 * them most, so the conversation starts with listening rather than selling.
 */
export function interestMessage(name: string) {
  const first = name.trim().split(/\s+/)[0] || name;
  return [
    `Γεια σας ${first}! 😊`,
    "Από την ομάδα του Βραχυχρόνια.ai: σας ευχαριστούμε πολύ που δείξατε ενδιαφέρον!",
    "Το φτιάξαμε από οικοδεσπότες για οικοδεσπότες, για να βλέπετε εύκολα πόσα σας μένουν καθαρά από τη Booking και το Airbnb και να έχετε τη δήλωση της ΑΑΔΕ έτοιμη κάθε μήνα.",
    "Για να σας βοηθήσουμε όσο καλύτερα γίνεται: τι σας δυσκολεύει περισσότερο σήμερα; Η δήλωση στην ΑΑΔΕ, το ΤΑΚΚ, να ξέρετε τα καθαρά, ή κάτι άλλο;",
    "Σας στέλνουμε πολύ σύντομα τον σύνδεσμο για να μπείτε. Είναι δωρεάν μέχρι το τέλος του 2026, χωρίς κάρτα.",
  ].join("\n\n");
}
