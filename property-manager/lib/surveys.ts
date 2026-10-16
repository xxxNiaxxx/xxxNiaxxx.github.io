/**
 * A one-question survey on the home page («Μια ερώτηση από την ομάδα»). The
 * answer is saved as a comment («Σχόλια» in the admin pages) with `page` set to
 * the survey id, which is also how we know the user already answered.
 */
export const PRICE_SURVEY = {
  id: "survey:price-2027",
  question: "Αν το Βραχυχρόνια.ai κόστιζε 12 € τον μήνα ανά κατάλυμα, μόνο για τους μήνες που έχει κρατήσεις, θα το κρατούσατε;",
  note: "Η εφαρμογή μένει δωρεάν ως τις 31/12/2026. Ρωτάμε για να τη φτιάξουμε σωστά για εσάς.",
  answers: ["Ναι", "Ίσως", "Όχι"] as const,
  followUp: "Τι θα έπρεπε να κάνει για να αξίζει; Τι σας λείπει;",
};
export type PriceSurveyAnswer = (typeof PRICE_SURVEY.answers)[number];

/** The comment text the team reads. */
export function surveyMessage(answer: PriceSurveyAnswer, comment: string) {
  const text = comment.trim();
  return `Ερώτηση τιμής (12 €/κατάλυμα/μήνα): ${answer}${text ? `\n\n${text}` : ""}`;
}
