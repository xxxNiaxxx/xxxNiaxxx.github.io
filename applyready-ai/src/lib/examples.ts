import type { Language } from "./languages";

/**
 * A fictional seasonal-hotel example for "Try an example" (and for screen
 * recordings in marketing). Everything here is invented; no real person or hotel.
 * The job ad is in English, as many hotel ads in Greece are.
 */
const cvEl = `Ελένη Δημητρίου
Χανιά · eleni.example@email.com · 69XX XXX XXX

## Εμπειρία
Ρεσεψιονίστ, Ξενοδοχείο «Θάλασσα» 4*, Χανιά (Μάιος–Οκτώβριος 2023, 2024)
- Check-in και check-out, περίπου 120 δωμάτια
- Κρατήσεις μέσω τηλεφώνου και email
- Εξυπηρέτηση επισκεπτών στα αγγλικά

Σερβιτόρα, Ταβέρνα «Λιμάνι», Χανιά (Ιούνιος–Σεπτέμβριος 2022)
- Σέρβις σε 15 τραπέζια, ταμείο

## Σπουδές
Τουριστικές Επιχειρήσεις, ΙΕΚ Χανίων (2022)

## Γλώσσες
Ελληνικά (μητρική), Αγγλικά (B2), Γερμανικά (A2)

## Δεξιότητες
Microsoft Excel, εξυπηρέτηση πελατών, ομαδική δουλειά σε βάρδιες`;

const cvEn = `Eleni Dimitriou
Chania · eleni.example@email.com · +30 69XX XXX XXX

## Experience
Receptionist, "Thalassa" Hotel 4*, Chania (May–October 2023, 2024)
- Check-in and check-out, about 120 rooms
- Bookings by phone and email
- Guest service in English

Waitress, "Limani" Tavern, Chania (June–September 2022)
- Service for 15 tables, cash desk

## Education
Tourism Business, Chania Vocational Institute (2022)

## Languages
Greek (native), English (B2), German (A2)

## Skills
Microsoft Excel, customer service, shift teamwork`;

const job = `Front Desk Agent – Seasonal 2027 (April–October)
5* beach resort, Chania, Crete

We are looking for a friendly Front Desk Agent to join our reception team for the 2027 season.

Responsibilities:
- Guest check-in / check-out and room allocation
- Handling reservations, requests and complaints
- Working with Opera PMS
- Cooperation with housekeeping and guest relations

Requirements:
- Previous front office experience in a hotel
- Very good English; German is a strong plus
- Customer service mindset and teamwork
- Knowledge of Opera PMS is an advantage

We offer accommodation, meals and training.`;

export function exampleFor(language: Language): { cv: string; job: string } {
  return { cv: language === "el" ? cvEl : cvEn, job };
}
