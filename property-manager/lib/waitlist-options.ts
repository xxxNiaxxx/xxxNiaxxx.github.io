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
