/**
 * Where a reservation came from. Shared by server and browser code; the
 * order is the order of the choices in forms.
 */
export const RESERVATION_SOURCES = [
  "BOOKING_COM",
  "AIRBNB",
  "VRBO",
  "EXPEDIA",
  "AGODA",
  "TRIP_COM",
  "HOLIDU",
  "HOMETOGO",
  "TRAVEL_AGENCY",
  "DIRECT",
  "MANUAL",
  "OTHER",
] as const;
export type ReservationSourceKey = (typeof RESERVATION_SOURCES)[number];

export const SOURCE_LABELS: Record<string, string> = {
  BOOKING_COM: "Booking.com",
  AIRBNB: "Airbnb",
  VRBO: "Vrbo",
  EXPEDIA: "Expedia / Hotels.com",
  AGODA: "Agoda",
  TRIP_COM: "Trip.com",
  HOLIDU: "Holidu",
  HOMETOGO: "HomeToGo",
  TRAVEL_AGENCY: "Ταξιδιωτικό γραφείο",
  DIRECT: "Απευθείας",
  MANUAL: "Χειροκίνητη",
  OTHER: "Άλλη",
} satisfies Record<ReservationSourceKey, string>;

/** Sources that take a commission (a % is set per organization in the tax settings). */
export const COMMISSION_SOURCES = RESERVATION_SOURCES.filter((s) => s !== "DIRECT" && s !== "MANUAL");

/** Platforms whose calendar (iCal) can be imported. */
export const CALENDAR_SOURCES = ["AIRBNB", "BOOKING_COM", "VRBO", "EXPEDIA", "AGODA", "TRIP_COM", "HOLIDU", "HOMETOGO", "OTHER"] as const;
