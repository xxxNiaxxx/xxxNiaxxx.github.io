/**
 * ⚠️ MOCK / DEMO DATA — NOT REAL GOVERNMENT PROGRAMS.
 *
 * Titles, rules and dates are illustrative only, written to exercise the eligibility
 * engine and the UI. They do not describe actual programs, amounts or criteria.
 */
import type { Benefit, BenefitRule } from '@/types/models';
import { daysFromNow } from '@/lib/dates';
import { MOCK_AUTHORITIES as A, mockSource, mockUrl } from './sources';

const VERIFIED = '2026-09-15';

function rule(id: string, r: Omit<BenefitRule, 'id'>): BenefitRule {
  return { id, ...r };
}

function benefit(b: Omit<Benefit, 'officialUrl' | 'source' | 'lastVerified' | 'isMock'> & { path: string }): Benefit {
  const { path, ...rest } = b;
  return {
    ...rest,
    officialUrl: mockUrl(path),
    lastVerified: VERIFIED,
    source: mockSource(b.id, b.authority, path, VERIFIED),
    isMock: true,
  };
}

export function buildMockBenefits(): Benefit[] {
  return [
    benefit({
      id: 'ben_child_support',
      title: 'Οικογενειακή ενίσχυση για παιδιά',
      summary: 'Μηνιαία οικονομική στήριξη για οικογένειες με εξαρτώμενα παιδιά.',
      description:
        'Πρόγραμμα οικονομικής στήριξης για νοικοκυριά με ένα ή περισσότερα εξαρτώμενα παιδιά. Η ενίσχυση εξαρτάται από το οικογενειακό εισόδημα και τον αριθμό των παιδιών.',
      category: 'family',
      authority: A.welfare,
      path: 'benefits/family-support',
      status: 'open',
      deadline: daysFromNow(9),
      procedureId: 'proc_family_support_application',
      eligibilityRules: [
        rule('r1', { field: 'children', operator: 'gte', value: 1, required: true, description: 'Έχεις τουλάχιστον ένα παιδί' }),
        rule('r2', { field: 'incomeRange', operator: 'in', value: ['low', 'lower_middle', 'middle'], required: true, description: 'Το οικογενειακό εισόδημα είναι εντός των ορίων' }),
      ],
      requiredChecks: ['Τα παιδιά είναι δηλωμένα ως εξαρτώμενα', 'Υποβληθείσα φορολογική δήλωση του προηγούμενου έτους', 'Νόμιμη και μόνιμη διαμονή στην Ελλάδα'],
      keywords: ['παιδί', 'παιδιά', 'οικογένεια', 'επίδομα', 'ενίσχυση'],
    }),
    benefit({
      id: 'ben_rent_support',
      title: 'Επιστροφή μέρους του ενοικίου',
      summary: 'Ετήσια επιστροφή μέρους του ενοικίου κύριας κατοικίας.',
      description:
        'Πρόγραμμα που επιστρέφει μέρος του ενοικίου κύριας κατοικίας σε ενοικιαστές με εισόδημα εντός ορίων. Η επιστροφή γίνεται αυτόματα, εφόσον τα μισθωτήρια είναι δηλωμένα σωστά.',
      category: 'housing',
      authority: A.tax,
      path: 'benefits/rent-refund',
      status: 'open',
      deadline: daysFromNow(21),
      procedureId: 'proc_lease_declaration',
      eligibilityRules: [
        rule('r1', { field: 'housingStatus', operator: 'eq', value: 'renter', required: true, description: 'Μένεις σε ενοίκιο' }),
        rule('r2', { field: 'incomeRange', operator: 'in', value: ['low', 'lower_middle', 'middle'], required: true, description: 'Το εισόδημά σου είναι εντός των ορίων' }),
      ],
      requiredChecks: ['Το μισθωτήριο είναι δηλωμένο ηλεκτρονικά', 'Το ενοίκιο πληρώνεται με τραπεζικό μέσο'],
      keywords: ['ενοίκιο', 'στέγαση', 'σπίτι', 'μίσθωση', 'επιστροφή'],
    }),
    benefit({
      id: 'ben_unemployment_allowance',
      title: 'Τακτική επιδότηση ανεργίας',
      summary: 'Μηνιαία στήριξη για όσους έχασαν πρόσφατα τη δουλειά τους.',
      description:
        'Οικονομική στήριξη για άτομα που έμειναν άνεργα χωρίς δική τους υπαιτιότητα και έχουν τον απαιτούμενο χρόνο ασφάλισης. Η αίτηση γίνεται μετά την εγγραφή στο μητρώο ανέργων.',
      category: 'unemployment',
      authority: A.employment,
      path: 'benefits/unemployment-allowance',
      status: 'open',
      procedureId: 'proc_unemployment_registration',
      eligibilityRules: [
        rule('r1', { field: 'employmentStatus', operator: 'eq', value: 'unemployed', required: true, description: 'Είσαι άνεργος/η' }),
        rule('r2', { field: 'ageRange', operator: 'notIn', value: ['65+'], required: false, description: 'Είσαι σε ηλικία εργασίας' }),
      ],
      requiredChecks: ['Επαρκείς ημέρες ασφάλισης', 'Η λύση της σύμβασης δεν έγινε με δική σου πρωτοβουλία', 'Εγγραφή στο μητρώο ανέργων'],
      keywords: ['άνεργος', 'ανεργία', 'επίδομα', 'απόλυση', 'δουλειά'],
    }),
    benefit({
      id: 'ben_youth_housing',
      title: 'Στεγαστική στήριξη νέων',
      summary: 'Ενίσχυση για νέους έως 34 ετών που νοικιάζουν κατοικία.',
      description:
        'Πρόγραμμα που στηρίζει νέους ενοικιαστές με ετήσια οικονομική ενίσχυση για το κόστος στέγασης.',
      category: 'housing',
      authority: A.welfare,
      path: 'benefits/youth-housing',
      status: 'open',
      deadline: daysFromNow(4),
      procedureId: 'proc_housing_application',
      eligibilityRules: [
        rule('r1', { field: 'ageRange', operator: 'in', value: ['18-24', '25-34'], required: true, description: 'Είσαι έως 34 ετών' }),
        rule('r2', { field: 'housingStatus', operator: 'eq', value: 'renter', required: true, description: 'Μένεις σε ενοίκιο' }),
        rule('r3', { field: 'incomeRange', operator: 'in', value: ['low', 'lower_middle'], required: true, description: 'Το εισόδημά σου είναι εντός των ορίων' }),
      ],
      requiredChecks: ['Δηλωμένο μισθωτήριο στο όνομά σου', 'Κανένα ακίνητο κατοικίας στην ιδιοκτησία σου'],
      keywords: ['νέοι', 'ενοίκιο', 'στέγαση', 'σπίτι'],
    }),
    benefit({
      id: 'ben_student_support',
      title: 'Φοιτητική στεγαστική ενίσχυση',
      summary: 'Ετήσια ενίσχυση για φοιτητές που σπουδάζουν μακριά από τον τόπο κατοικίας τους.',
      description:
        'Οικονομική ενίσχυση για φοιτητές που νοικιάζουν κατοικία σε άλλη πόλη για τις σπουδές τους.',
      category: 'education',
      authority: A.education,
      path: 'benefits/student-housing',
      status: 'upcoming',
      deadline: daysFromNow(30),
      procedureId: 'proc_student_application',
      eligibilityRules: [
        rule('r1', { field: 'employmentStatus', operator: 'eq', value: 'student', required: true, description: 'Είσαι φοιτητής/τρια' }),
        rule('r2', { field: 'housingStatus', operator: 'eq', value: 'renter', required: true, description: 'Νοικιάζεις κατοικία για τις σπουδές σου' }),
        rule('r3', { field: 'incomeRange', operator: 'in', value: ['low', 'lower_middle', 'middle'], required: true, description: 'Το οικογενειακό εισόδημα είναι εντός των ορίων' }),
      ],
      requiredChecks: ['Ενεργή φοιτητική ιδιότητα', 'Πρόοδος στις σπουδές'],
      keywords: ['φοιτητής', 'σπουδές', 'πανεπιστήμιο', 'εκπαίδευση', 'στέγαση'],
    }),
    benefit({
      id: 'ben_large_family_card',
      title: 'Κάρτα πολύτεκνης οικογένειας',
      summary: 'Εκπτώσεις και προνόμια για οικογένειες με τρία ή περισσότερα παιδιά.',
      description:
        'Κάρτα που δίνει πρόσβαση σε εκπτώσεις σε μεταφορές, πολιτισμό και υπηρεσίες για πολύτεκνες οικογένειες.',
      category: 'family',
      authority: A.welfare,
      path: 'benefits/large-family-card',
      status: 'open',
      procedureId: 'proc_family_certificate',
      eligibilityRules: [
        rule('r1', { field: 'children', operator: 'gte', value: 3, required: true, description: 'Έχεις τρία ή περισσότερα παιδιά' }),
      ],
      requiredChecks: ['Πιστοποιητικό οικογενειακής κατάστασης σε ισχύ'],
      keywords: ['πολύτεκνοι', 'παιδιά', 'οικογένεια', 'κάρτα', 'εκπτώσεις'],
    }),
    benefit({
      id: 'ben_newborn_support',
      title: 'Ενίσχυση γέννησης παιδιού',
      summary: 'Εφάπαξ οικονομική στήριξη μετά τη γέννηση παιδιού.',
      description:
        'Εφάπαξ ενίσχυση για γονείς μετά τη γέννηση ή την υιοθεσία παιδιού. Η αίτηση γίνεται μέσα σε συγκεκριμένο διάστημα από τη γέννηση.',
      category: 'family',
      authority: A.welfare,
      path: 'benefits/newborn-support',
      status: 'open',
      procedureId: 'proc_newborn_registration',
      eligibilityRules: [
        rule('r1', { field: 'children', operator: 'gte', value: 1, required: true, description: 'Έχεις τουλάχιστον ένα παιδί' }),
        rule('r2', { field: 'ageRange', operator: 'in', value: ['18-24', '25-34', '35-44', '45-54'], required: false, description: 'Η ηλικία σου ταιριάζει με το πρόγραμμα' }),
      ],
      requiredChecks: ['Η γέννηση έγινε μέσα στο τελευταίο διάστημα που ορίζει το πρόγραμμα', 'Καταχωρισμένη ληξιαρχική πράξη γέννησης'],
      keywords: ['γέννηση', 'μωρό', 'νεογέννητο', 'παιδί', 'οικογένεια'],
    }),
    benefit({
      id: 'ben_job_training',
      title: 'Πρόγραμμα κατάρτισης και επανειδίκευσης',
      summary: 'Δωρεάν σεμινάρια ψηφιακών και επαγγελματικών δεξιοτήτων.',
      description:
        'Δωρεάν προγράμματα κατάρτισης για άνεργους και εργαζόμενους που θέλουν να αποκτήσουν νέες δεξιότητες, με πιστοποίηση στο τέλος.',
      category: 'work',
      authority: A.employment,
      path: 'benefits/job-training',
      status: 'open',
      deadline: daysFromNow(14),
      procedureId: 'proc_training_application',
      eligibilityRules: [
        rule('r1', { field: 'employmentStatus', operator: 'in', value: ['unemployed', 'employed', 'self_employed'], required: true, description: 'Είσαι εργαζόμενος/η ή άνεργος/η' }),
        rule('r2', { field: 'ageRange', operator: 'notIn', value: ['65+'], required: true, description: 'Είσαι σε ηλικία εργασίας' }),
      ],
      requiredChecks: ['Ολοκλήρωση υποχρεωτικής εκπαίδευσης'],
      keywords: ['κατάρτιση', 'σεμινάρια', 'δεξιότητες', 'εργασία', 'ανεργία', 'εκπαίδευση'],
    }),
    benefit({
      id: 'ben_energy_support',
      title: 'Ενίσχυση για το κόστος ενέργειας',
      summary: 'Επιδότηση μέρους του λογαριασμού ρεύματος για νοικοκυριά με χαμηλό εισόδημα.',
      description:
        'Πρόγραμμα που καλύπτει μέρος του κόστους ηλεκτρικής ενέργειας κύριας κατοικίας για νοικοκυριά με εισόδημα εντός ορίων.',
      category: 'housing',
      authority: A.welfare,
      path: 'benefits/energy-support',
      status: 'open',
      deadline: daysFromNow(2),
      procedureId: 'proc_energy_application',
      eligibilityRules: [
        rule('r1', { field: 'incomeRange', operator: 'in', value: ['low', 'lower_middle'], required: true, description: 'Το εισόδημα του νοικοκυριού είναι εντός των ορίων' }),
        rule('r2', { field: 'housingStatus', operator: 'in', value: ['renter', 'owner'], required: true, description: 'Ο λογαριασμός ρεύματος είναι στο όνομά σου' }),
      ],
      requiredChecks: ['Ο λογαριασμός ρεύματος αφορά κύρια κατοικία'],
      keywords: ['ρεύμα', 'ενέργεια', 'λογαριασμός', 'επιδότηση', 'στέγαση'],
    }),
    benefit({
      id: 'ben_ev_subsidy',
      title: 'Επιδότηση αγοράς ηλεκτρικού οχήματος',
      summary: 'Επιδότηση για την αγορά ηλεκτρικού αυτοκινήτου ή δικύκλου.',
      description:
        'Πρόγραμμα που επιδοτεί μέρος της τιμής αγοράς καινούργιου ηλεκτρικού οχήματος. Επιπλέον ενίσχυση ενδέχεται να υπάρχει για νέους και οικογένειες.',
      category: 'vehicle',
      authority: A.transport,
      path: 'benefits/ev-subsidy',
      status: 'open',
      procedureId: 'proc_vehicle_transfer',
      eligibilityRules: [
        rule('r1', { field: 'ageRange', operator: 'gte', value: '18-24', required: true, description: 'Είσαι ενήλικας' }),
        rule('r2', { field: 'children', operator: 'gte', value: 1, required: false, description: 'Πιθανή επιπλέον ενίσχυση για οικογένειες' }),
      ],
      requiredChecks: ['Δίπλωμα οδήγησης σε ισχύ', 'Αγορά από εξουσιοδοτημένο πωλητή'],
      keywords: ['αυτοκίνητο', 'ηλεκτρικό', 'όχημα', 'επιδότηση', 'δίπλωμα'],
    }),
    benefit({
      id: 'ben_island_transport',
      title: 'Έκπτωση ακτοπλοϊκών εισιτηρίων για κατοίκους νησιών',
      summary: 'Μειωμένα εισιτήρια για μόνιμους κατοίκους νησιωτικών περιοχών.',
      description:
        'Πρόγραμμα που μειώνει το κόστος ακτοπλοϊκών μετακινήσεων για μόνιμους κατοίκους νησιών.',
      category: 'vehicle',
      authority: A.transport,
      path: 'benefits/island-transport',
      status: 'open',
      procedureId: 'proc_residence_certificate',
      eligibilityRules: [
        rule('r1', { field: 'region', operator: 'in', value: ['north_aegean', 'south_aegean', 'ionian_islands', 'crete'], required: true, description: 'Μένεις σε νησιωτική περιοχή' }),
      ],
      requiredChecks: ['Βεβαίωση μόνιμης κατοικίας'],
      keywords: ['νησί', 'πλοίο', 'εισιτήρια', 'μετακίνηση', 'ακτοπλοΐα'],
    }),
    benefit({
      id: 'ben_tax_dependents',
      title: 'Φορολογική έκπτωση για εξαρτώμενα μέλη',
      summary: 'Μειωμένος φόρος για φορολογούμενους με εξαρτώμενα παιδιά.',
      description:
        'Η φορολογική δήλωση λαμβάνει υπόψη τα εξαρτώμενα μέλη και μπορεί να μειώσει τον φόρο που αναλογεί.',
      category: 'tax',
      authority: A.tax,
      path: 'benefits/tax-dependents',
      status: 'upcoming',
      procedureId: 'proc_tax_return',
      eligibilityRules: [
        rule('r1', { field: 'children', operator: 'gte', value: 1, required: true, description: 'Έχεις τουλάχιστον ένα παιδί' }),
        rule('r2', { field: 'employmentStatus', operator: 'in', value: ['employed', 'self_employed', 'retired'], required: true, description: 'Έχεις φορολογητέο εισόδημα' }),
      ],
      requiredChecks: ['Τα παιδιά δηλώνονται ως εξαρτώμενα στη φορολογική δήλωση'],
      keywords: ['φόρος', 'φορολογία', 'δήλωση', 'παιδιά', 'έκπτωση'],
    }),
    benefit({
      id: 'ben_seniors_program',
      title: 'Πρόγραμμα κοινωνικού τουρισμού',
      summary: 'Επιδοτούμενες διακοπές για συνταξιούχους και άτομα άνω των 65.',
      description:
        'Πρόγραμμα επιδοτούμενων διακοπών εκτός τουριστικής περιόδου για συνταξιούχους.',
      category: 'health',
      authority: A.welfare,
      path: 'benefits/social-tourism',
      status: 'closed',
      eligibilityRules: [
        rule('r1', { field: 'employmentStatus', operator: 'eq', value: 'retired', required: true, description: 'Είσαι συνταξιούχος' }),
      ],
      requiredChecks: ['Ενεργή ασφαλιστική ικανότητα'],
      keywords: ['συνταξιούχος', 'διακοπές', 'τουρισμός'],
    }),
  ];
}
