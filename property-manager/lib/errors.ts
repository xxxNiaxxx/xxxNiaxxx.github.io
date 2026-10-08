/** Errors thrown by services; route handlers map them to HTTP responses. */
export class AppError extends Error {
  constructor(
    public readonly code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "VALIDATION" | "BAD_REQUEST",
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

const NOT_FOUND_MESSAGES: Record<string, string> = {
  Property: "Το ακίνητο δεν βρέθηκε",
  Guest: "Ο επισκέπτης δεν βρέθηκε",
  Reservation: "Η κράτηση δεν βρέθηκε",
  Task: "Η εργασία δεν βρέθηκε",
  "Team member": "Το μέλος της ομάδας δεν βρέθηκε",
  Transaction: "Η κίνηση δεν βρέθηκε",
  Conversation: "Η συνομιλία δεν βρέθηκε",
  Action: "Η ενέργεια δεν βρέθηκε",
  Memory: "Η γνώση δεν βρέθηκε",
  Invitation: "Η πρόσκληση δεν βρέθηκε",
};
export const notFound = (what: string) => new AppError("NOT_FOUND", NOT_FOUND_MESSAGES[what] ?? "Δεν βρέθηκε");
export const conflict = (message: string, details?: unknown) => new AppError("CONFLICT", message, details);
export const badRequest = (message: string, details?: unknown) => new AppError("BAD_REQUEST", message, details);
