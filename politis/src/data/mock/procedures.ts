/**
 * ⚠️ MOCK / DEMO DATA — NOT REAL GOVERNMENT PROCEDURES.
 *
 * Steps, times and costs are illustrative placeholders. Always verify against the
 * official source before presenting a procedure as production content.
 */
import type { Category, Procedure } from '@/types/models';
import { MOCK_AUTHORITIES as A, mockSource, mockUrl } from './sources';

const VERIFIED = '2026-09-20';

type StepInput = [title: string, description?: string];

interface ProcedureInput {
  id: string;
  title: string;
  actionTitle: string;
  description: string;
  category: Category;
  authority: string;
  path: string;
  estimatedTime: string;
  cost: string;
  online?: boolean;
  requiredDocuments: string[];
  steps: StepInput[];
  keywords: string[];
}

function procedure(p: ProcedureInput): Procedure {
  return {
    id: p.id,
    title: p.title,
    actionTitle: p.actionTitle,
    description: p.description,
    category: p.category,
    authority: p.authority,
    officialUrl: mockUrl(p.path),
    estimatedTime: p.estimatedTime,
    cost: p.cost,
    online: p.online ?? true,
    requiredDocuments: p.requiredDocuments,
    steps: p.steps.map(([title, description], i) => ({ id: `${p.id}_s${i + 1}`, order: i + 1, title, description })),
    source: mockSource(p.id, p.authority, p.path, VERIFIED),
    keywords: p.keywords,
    isMock: true,
  };
}

const COST_FREE_ONLINE = 'Χωρίς κόστος (ηλεκτρονικά)';
const COST_CHECK = 'Ενδέχεται να υπάρχει παράβολο — δες την επίσημη πηγή';

const ONLINE_LOGIN_STEPS: StepInput[] = [
  ['Άνοιξε την επίσημη υπηρεσία.', 'Πάτησε «Άνοιγμα επίσημης υπηρεσίας» παρακάτω.'],
  ['Συνδέσου.', 'Χρησιμοποίησε τους προσωπικούς σου κωδικούς απευθείας στην επίσημη σελίδα. Η εφαρμογή δεν τους ζητά ποτέ.'],
];

export function buildMockProcedures(): Procedure[] {
  return [
    procedure({
      id: 'proc_family_support_application',
      title: 'Αίτηση για οικογενειακή ενίσχυση',
      actionTitle: 'αίτηση για οικογενειακή ενίσχυση',
      description: 'Ηλεκτρονική αίτηση για την οικογενειακή ενίσχυση παιδιών. Γίνεται μία φορά τον χρόνο.',
      category: 'family',
      authority: A.welfare,
      path: 'procedures/family-support-application',
      estimatedTime: '15–20 λεπτά',
      cost: COST_FREE_ONLINE,
      requiredDocuments: ['Στοιχεία των παιδιών', 'Αριθμός λογαριασμού (IBAN) για την πίστωση', 'Στοιχεία της τελευταίας φορολογικής δήλωσης'],
      steps: [...ONLINE_LOGIN_STEPS, ['Συμπλήρωσε τα στοιχεία.', 'Έλεγξε ότι τα παιδιά και το εισόδημα εμφανίζονται σωστά.'], ['Υπέβαλε την αίτηση.', 'Αποθήκευσε τον αριθμό πρωτοκόλλου.']],
      keywords: ['παιδιά', 'οικογένεια', 'επίδομα', 'αίτηση'],
    }),
    procedure({
      id: 'proc_address_change',
      title: 'Αλλαγή διεύθυνσης κατοικίας',
      actionTitle: 'αλλαγή διεύθυνσης',
      description: 'Ενημέρωση της διεύθυνσης κατοικίας σου στις δημόσιες υπηρεσίες, ώστε να λαμβάνεις σωστά την αλληλογραφία σου.',
      category: 'housing',
      authority: A.citizen,
      path: 'procedures/address-change',
      estimatedTime: '10 λεπτά',
      cost: COST_FREE_ONLINE,
      requiredDocuments: ['Νέα διεύθυνση με ταχυδρομικό κώδικα', 'Αποδεικτικό κατοικίας (π.χ. μισθωτήριο ή λογαριασμός)'],
      steps: [...ONLINE_LOGIN_STEPS, ['Συμπλήρωσε τη νέα διεύθυνση.'], ['Υπέβαλε την αλλαγή.', 'Η ενημέρωση μπορεί να χρειαστεί λίγες ημέρες.']],
      keywords: ['διεύθυνση', 'μετακόμιση', 'κατοικία', 'αλλαγή'],
    }),
    procedure({
      id: 'proc_unemployment_registration',
      title: 'Εγγραφή στο μητρώο ανέργων',
      actionTitle: 'εγγραφή στο μητρώο ανέργων',
      description: 'Η εγγραφή στο μητρώο ανέργων είναι το πρώτο βήμα για προγράμματα στήριξης και επιδοτήσεις ανεργίας.',
      category: 'unemployment',
      authority: A.employment,
      path: 'procedures/unemployment-registration',
      estimatedTime: '20 λεπτά',
      cost: COST_FREE_ONLINE,
      requiredDocuments: ['Βεβαίωση λύσης εργασιακής σχέσης', 'Στοιχεία επικοινωνίας', 'Αριθμός λογαριασμού (IBAN)'],
      steps: [...ONLINE_LOGIN_STEPS, ['Συμπλήρωσε το προφίλ σου.', 'Εκπαίδευση, εμπειρία και δεξιότητες.'], ['Υπέβαλε την εγγραφή.'], ['Κράτησε την κάρτα ανεργίας.', 'Θα τη χρειαστείς για επόμενες αιτήσεις.']],
      keywords: ['άνεργος', 'ανεργία', 'μητρώο', 'εγγραφή', 'κάρτα ανεργίας'],
    }),
    procedure({
      id: 'proc_lease_declaration',
      title: 'Δήλωση μισθωτηρίου',
      actionTitle: 'δήλωση μισθωτηρίου',
      description: 'Ηλεκτρονική δήλωση ή αποδοχή μισθωτηρίου κατοικίας. Απαραίτητη για προγράμματα στέγασης.',
      category: 'housing',
      authority: A.tax,
      path: 'procedures/lease-declaration',
      estimatedTime: '10–15 λεπτά',
      cost: COST_FREE_ONLINE,
      requiredDocuments: ['Στοιχεία ακινήτου', 'Διάρκεια και ποσό μίσθωσης'],
      steps: [...ONLINE_LOGIN_STEPS, ['Βρες τη δήλωση που σε αφορά.', 'Ως ενοικιαστής/τρια αποδέχεσαι τη δήλωση του ιδιοκτήτη.'], ['Επιβεβαίωσε τα στοιχεία.'], ['Υπέβαλε ή αποδέξου τη δήλωση.']],
      keywords: ['μισθωτήριο', 'ενοίκιο', 'μίσθωση', 'στέγαση'],
    }),
    procedure({
      id: 'proc_housing_application',
      title: 'Αίτηση στεγαστικής στήριξης',
      actionTitle: 'αίτηση στεγαστικής στήριξης',
      description: 'Αίτηση για προγράμματα στεγαστικής στήριξης νέων και ενοικιαστών.',
      category: 'housing',
      authority: A.welfare,
      path: 'procedures/housing-application',
      estimatedTime: '20 λεπτά',
      cost: COST_FREE_ONLINE,
      requiredDocuments: ['Δηλωμένο μισθωτήριο', 'Στοιχεία εισοδήματος', 'Αριθμός λογαριασμού (IBAN)'],
      steps: [...ONLINE_LOGIN_STEPS, ['Συμπλήρωσε τα στοιχεία κατοικίας.'], ['Υπέβαλε την αίτηση.']],
      keywords: ['στέγαση', 'ενοίκιο', 'νέοι', 'αίτηση'],
    }),
    procedure({
      id: 'proc_student_application',
      title: 'Αίτηση φοιτητικής ενίσχυσης',
      actionTitle: 'αίτηση φοιτητικής ενίσχυσης',
      description: 'Ετήσια αίτηση για τη στεγαστική ενίσχυση φοιτητών.',
      category: 'education',
      authority: A.education,
      path: 'procedures/student-application',
      estimatedTime: '15 λεπτά',
      cost: COST_FREE_ONLINE,
      requiredDocuments: ['Βεβαίωση σπουδών', 'Μισθωτήριο κατοικίας', 'Στοιχεία οικογενειακού εισοδήματος'],
      steps: [...ONLINE_LOGIN_STEPS, ['Επιβεβαίωσε τη φοιτητική σου ιδιότητα.'], ['Συμπλήρωσε τα στοιχεία κατοικίας.'], ['Υπέβαλε την αίτηση.']],
      keywords: ['φοιτητής', 'σπουδές', 'πανεπιστήμιο', 'αίτηση'],
    }),
    procedure({
      id: 'proc_family_certificate',
      title: 'Έκδοση πιστοποιητικού οικογενειακής κατάστασης',
      actionTitle: 'έκδοση πιστοποιητικού οικογενειακής κατάστασης',
      description: 'Το πιστοποιητικό οικογενειακής κατάστασης ζητείται σε πολλές αιτήσεις παροχών.',
      category: 'family',
      authority: A.municipality,
      path: 'procedures/family-certificate',
      estimatedTime: '5 λεπτά',
      cost: COST_FREE_ONLINE,
      requiredDocuments: ['Κανένα επιπλέον έγγραφο για ηλεκτρονική έκδοση'],
      steps: [...ONLINE_LOGIN_STEPS, ['Επίλεξε το πιστοποιητικό.'], ['Κατέβασε το έγγραφο.', 'Αποθήκευσέ το για να το επισυνάψεις σε αιτήσεις.']],
      keywords: ['πιστοποιητικό', 'οικογενειακή κατάσταση', 'έγγραφο', 'δήμος'],
    }),
    procedure({
      id: 'proc_newborn_registration',
      title: 'Δήλωση γέννησης παιδιού',
      actionTitle: 'δήλωση γέννησης',
      description: 'Καταχώριση της γέννησης παιδιού και έκδοση των βασικών εγγράφων του.',
      category: 'family',
      authority: A.municipality,
      path: 'procedures/newborn-registration',
      estimatedTime: '30 λεπτά',
      cost: COST_CHECK,
      online: false,
      requiredDocuments: ['Βεβαίωση γέννησης από το μαιευτήριο', 'Ταυτότητες γονέων'],
      steps: [['Συγκέντρωσε τα έγγραφα.'], ['Κλείσε ραντεβού στην αρμόδια υπηρεσία.', 'Ορισμένες υπηρεσίες δέχονται και ηλεκτρονική δήλωση.'], ['Υπέβαλε τη δήλωση.'], ['Παρέλαβε τη ληξιαρχική πράξη.']],
      keywords: ['γέννηση', 'μωρό', 'νεογέννητο', 'ληξιαρχείο'],
    }),
    procedure({
      id: 'proc_training_application',
      title: 'Αίτηση σε πρόγραμμα κατάρτισης',
      actionTitle: 'αίτηση σε πρόγραμμα κατάρτισης',
      description: 'Επιλογή σεμιναρίου και υποβολή αίτησης συμμετοχής.',
      category: 'work',
      authority: A.employment,
      path: 'procedures/training-application',
      estimatedTime: '15 λεπτά',
      cost: COST_FREE_ONLINE,
      requiredDocuments: ['Τίτλος σπουδών', 'Βιογραφικό (προαιρετικά)'],
      steps: [...ONLINE_LOGIN_STEPS, ['Διάλεξε πρόγραμμα κατάρτισης.'], ['Υπέβαλε την αίτηση.']],
      keywords: ['κατάρτιση', 'σεμινάριο', 'δεξιότητες', 'εργασία'],
    }),
    procedure({
      id: 'proc_energy_application',
      title: 'Αίτηση ενίσχυσης για το ρεύμα',
      actionTitle: 'αίτηση ενίσχυσης για το ρεύμα',
      description: 'Αίτηση για επιδότηση μέρους του λογαριασμού ηλεκτρικής ενέργειας.',
      category: 'housing',
      authority: A.welfare,
      path: 'procedures/energy-application',
      estimatedTime: '10 λεπτά',
      cost: COST_FREE_ONLINE,
      requiredDocuments: ['Πρόσφατος λογαριασμός ρεύματος', 'Αριθμός παροχής'],
      steps: [...ONLINE_LOGIN_STEPS, ['Συμπλήρωσε τον αριθμό παροχής.'], ['Υπέβαλε την αίτηση.']],
      keywords: ['ρεύμα', 'ενέργεια', 'λογαριασμός', 'επιδότηση'],
    }),
    procedure({
      id: 'proc_vehicle_transfer',
      title: 'Μεταβίβαση αυτοκινήτου',
      actionTitle: 'μεταβίβαση αυτοκινήτου',
      description: 'Μεταβίβαση της κυριότητας οχήματος από τον πωλητή στον αγοραστή.',
      category: 'vehicle',
      authority: A.transport,
      path: 'procedures/vehicle-transfer',
      estimatedTime: '30–40 λεπτά',
      cost: COST_CHECK,
      requiredDocuments: ['Άδεια κυκλοφορίας', 'Ασφαλιστήριο οχήματος', 'Βεβαίωση τεχνικού ελέγχου (αν απαιτείται)'],
      steps: [...ONLINE_LOGIN_STEPS, ['Ο πωλητής ξεκινά τη μεταβίβαση.'], ['Ο αγοραστής την αποδέχεται.'], ['Πλήρωσε τυχόν παράβολα.'], ['Παρέλαβε τη νέα άδεια κυκλοφορίας.']],
      keywords: ['αυτοκίνητο', 'όχημα', 'μεταβίβαση', 'πώληση', 'αγορά'],
    }),
    procedure({
      id: 'proc_residence_certificate',
      title: 'Βεβαίωση μόνιμης κατοικίας',
      actionTitle: 'έκδοση βεβαίωσης μόνιμης κατοικίας',
      description: 'Βεβαίωση που αποδεικνύει τον τόπο μόνιμης κατοικίας σου.',
      category: 'housing',
      authority: A.municipality,
      path: 'procedures/residence-certificate',
      estimatedTime: '10 λεπτά',
      cost: COST_FREE_ONLINE,
      requiredDocuments: ['Αποδεικτικό κατοικίας (π.χ. λογαριασμός κοινής ωφέλειας)'],
      steps: [...ONLINE_LOGIN_STEPS, ['Συμπλήρωσε την αίτηση.'], ['Παρέλαβε τη βεβαίωση.']],
      keywords: ['βεβαίωση', 'κατοικία', 'δήμος', 'νησί'],
    }),
    procedure({
      id: 'proc_tax_return',
      title: 'Υποβολή φορολογικής δήλωσης',
      actionTitle: 'υποβολή φορολογικής δήλωσης',
      description: 'Ετήσια δήλωση εισοδήματος. Σε πολλές περιπτώσεις τα στοιχεία είναι ήδη προσυμπληρωμένα.',
      category: 'tax',
      authority: A.tax,
      path: 'procedures/tax-return',
      estimatedTime: '20–45 λεπτά',
      cost: COST_FREE_ONLINE,
      requiredDocuments: ['Βεβαιώσεις αποδοχών', 'Αποδείξεις δαπανών', 'Στοιχεία εξαρτώμενων μελών'],
      steps: [...ONLINE_LOGIN_STEPS, ['Έλεγξε τα προσυμπληρωμένα στοιχεία.'], ['Πρόσθεσε ό,τι λείπει.', 'Π.χ. εξαρτώμενα μέλη, ενοίκιο, δαπάνες.'], ['Υπέβαλε τη δήλωση.'], ['Κατέβασε το εκκαθαριστικό.']],
      keywords: ['φόρος', 'φορολογία', 'δήλωση', 'εκκαθαριστικό'],
    }),
  ];
}
