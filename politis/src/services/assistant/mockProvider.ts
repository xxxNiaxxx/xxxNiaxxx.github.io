/**
 * Deterministic MOCK assistant — used when no LLM backend is configured.
 * Same input → same output. Uses keyword intents + the eligibility engine.
 */
import { daysUntil, formatDayMonth } from '@/lib/dates';
import { recommendBenefits } from '@/lib/eligibility';
import { normalizeGreek, searchContent } from '@/lib/search';
import type { AssistantProvider } from './types';
import { buildResponse } from './buildResponse';

const DISCLAIMER = 'Οι πληροφορίες είναι ενημερωτικές — η τελική απόφαση λαμβάνεται από τον αρμόδιο φορέα.';

export const mockAssistantProvider: AssistantProvider = {
  name: 'mock',
  async ask(message, context, catalog) {
    await new Promise((r) => setTimeout(r, 600));
    const q = normalizeGreek(message);
    const respond = (answer: string, benefitIds: string[] = [], procedureIds: string[] = []) =>
      buildResponse(answer, benefitIds, procedureIds, context, catalog, true);

    // 1. «Τι πρέπει να κάνω αυτή την εβδομάδα;»
    if (q.includes('εβδομαδα') || q.includes('να κανω') || q.includes('εκκρεμ') || q.includes('προθεσμ')) {
      const upcoming = context.pendingTasks
        .filter((t) => t.dueDate && daysUntil(t.dueDate) <= 7)
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
      if (upcoming.length === 0) {
        return respond('Αυτή την εβδομάδα δεν έχεις εκκρεμείς προθεσμίες. 🎉 Μπορείς να δεις τις παροχές που μπορεί να σε αφορούν στην αρχική οθόνη.');
      }
      const lines = upcoming.map((t) => {
        const d = daysUntil(t.dueDate!);
        const when = d < 0 ? 'έχει λήξει' : `έως ${formatDayMonth(t.dueDate!)}`;
        return `• ${t.title} (${when})`;
      });
      return respond(`Αυτή την εβδομάδα χρειάζονται την προσοχή σου ${upcoming.length === 1 ? 'ένα πράγμα' : `${upcoming.length} πράγματα`}:\n\n${lines.join('\n')}\n\nΘα τα βρεις όλα στις «Εργασίες».`);
    }

    // 2. Address change
    if (q.includes('διευθυνσ') || q.includes('μετακομ')) {
      return respond(
        'Για την αλλαγή διεύθυνσης χρειάζεσαι τη νέα διεύθυνση και ένα αποδεικτικό κατοικίας. Η διαδικασία γίνεται ηλεκτρονικά σε λίγα λεπτά. Δες τα βήματα παρακάτω.',
        [],
        ['proc_address_change'],
      );
    }

    // 3. Children / family
    if (q.includes('παιδ') || q.includes('οικογεν') || q.includes('μωρο') || q.includes('γεννησ')) {
      const family = catalog.benefits.filter((b) => b.category === 'family' && b.status !== 'closed').map((b) => b.id);
      return respond(
        `Υπάρχουν προγράμματα που αφορούν οικογένειες με παιδιά. Παρακάτω θα δεις πόσο πιθανό φαίνεται να σε αφορά το καθένα, με βάση τα στοιχεία σου. ${DISCLAIMER}`,
        family,
        ['proc_family_certificate'],
      );
    }

    // 4. «Τι δικαιούμαι;»
    if (q.includes('δικαιουμαι') || q.includes('δικαιωμα') || q.includes('με αφορα') || q.includes('παροχ')) {
      const recs = recommendBenefits(catalog.benefits, context.profile);
      if (recs.length === 0) {
        return respond('Δεν βρήκαμε κάτι που να ταιριάζει στα στοιχεία σου αυτή τη στιγμή. Συμπλήρωσε περισσότερα στοιχεία στο προφίλ σου για καλύτερα αποτελέσματα.');
      }
      return respond(
        `Με βάση τα στοιχεία σου, φαίνεται ότι ${recs.length === 1 ? 'ένα πρόγραμμα μπορεί' : `${recs.length} προγράμματα μπορεί`} να σε αφορούν. Κάνε έναν γρήγορο έλεγχο επιλεξιμότητας για το καθένα. ${DISCLAIMER}`,
        recs.map((r) => r.benefit.id),
      );
    }

    // 5. Generic keyword search
    const results = searchContent(message, catalog.benefits, catalog.procedures);
    if (results.length > 0) {
      const benefitIds = results.filter((r) => r.kind === 'benefit').map((r) => r.item.id);
      const procedureIds = results.filter((r) => r.kind === 'procedure').map((r) => r.item.id);
      return respond(`Βρήκα πληροφορίες που μπορεί να σε βοηθήσουν. ${DISCLAIMER}`, benefitIds, procedureIds);
    }

    return respond(
      'Δεν είμαι σίγουρος ότι κατάλαβα. Μπορείς να με ρωτήσεις για παροχές, διαδικασίες ή προθεσμίες — π.χ. «Τι δικαιούμαι;» ή «Πώς κάνω αλλαγή διεύθυνσης;».',
    );
  },
};
