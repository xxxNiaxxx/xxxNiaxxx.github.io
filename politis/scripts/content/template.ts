/**
 * Creates the content workbook that editors fill in.
 *   npm run content:template            (refuses to overwrite an existing file)
 *   npm run content:template -- --force
 */
import ExcelJS from 'exceljs';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  BENEFIT_COLUMNS,
  type Column,
  DEFAULT_WORKBOOK,
  FIELD_VALUES,
  LISTS,
  OPERATOR_LABELS,
  PROCEDURE_COLUMNS,
  RULE_COLUMNS,
  SHEETS,
  STEP_COLUMNS,
} from './schema.ts';
import { profileFieldLabels } from '../../src/lib/labels.ts';
import type { ProfileField } from '../../src/types/models.ts';

const ROWS_WITH_DROPDOWNS = 400;
const BRAND = 'FF1D3F8F';
const EXAMPLE_FILL = 'FFFEF3E2';

const args = process.argv.slice(2);
const force = args.includes('--force');
const out = args.find((a) => !a.startsWith('--')) ?? DEFAULT_WORKBOOK;

if (existsSync(out) && !force) {
  console.error(`Το αρχείο ${out} υπάρχει ήδη. Για να το αντικαταστήσετε (χάνονται οι αλλαγές σας) τρέξτε με --force.`);
  process.exit(1);
}

const wb = new ExcelJS.Workbook();
wb.creator = 'Politis';

// ---- Instructions ----
const guide = wb.addWorksheet(SHEETS.guide, { properties: { tabColor: { argb: BRAND } } });
guide.getColumn(1).width = 110;
const lines: [string, boolean?][] = [
  ['Politis — Περιεχόμενο εφαρμογής', true],
  [''],
  ['Σε αυτό το αρχείο συμπληρώνετε τις παροχές και τις διαδικασίες που εμφανίζει η εφαρμογή.'],
  ['Κάθε πληροφορία πρέπει να προέρχεται από επίσημη πηγή. Συμπληρώστε τον επίσημο σύνδεσμο και την ημερομηνία που την ελέγξατε.'],
  [''],
  ['Φύλλα', true],
  ['• Παροχές: ένα πρόγραμμα ή επίδομα ανά γραμμή.'],
  ['• Κριτήρια: οι κανόνες επιλεξιμότητας κάθε παροχής, ένας ανά γραμμή. Μια παροχή μπορεί να έχει πολλά κριτήρια.'],
  ['• Διαδικασίες: πώς γίνεται μια αίτηση ή μια διαδικασία, μία ανά γραμμή.'],
  ['• Βήματα: τα βήματα κάθε διαδικασίας, ένα ανά γραμμή, με αριθμό σειράς.'],
  ['• Επιτρεπόμενες τιμές: οι τιμές που δέχονται οι στήλες με λίστα και η στήλη «Τιμή» των κριτηρίων.'],
  [''],
  ['Κανόνες', true],
  ['• Οι κωδικοί γράφονται με λατινικά πεζά, αριθμούς και παύλες (π.χ. epidoma-paidiou) και δεν αλλάζουν μετά τη δημοσίευση.'],
  ['• Οι γραμμές με κωδικό που αρχίζει από «example-» είναι παραδείγματα και αγνοούνται. Μπορείτε να τις σβήσετε.'],
  ['• Ημερομηνίες: ηη/μμ/εεεε (π.χ. 15/10/2026).'],
  ['• Σε κελιά με πολλά στοιχεία (έλεγχοι, δικαιολογητικά) γράψτε ένα ανά γραμμή με Alt+Enter.'],
  ['• Κριτήρια: «Υποχρεωτικό = Ναι» σημαίνει ότι αν δεν ισχύει, η εφαρμογή θα δείξει «Δεν φαίνεται να πληροίς τα βασικά κριτήρια».'],
  ['  Αν ο χρήστης δεν έχει δώσει το στοιχείο, θα δει «Χρειάζεται έλεγχος».'],
  ['• Η εφαρμογή δεν λέει ποτέ ότι κάποιος «δικαιούται» — μόνο ότι «φαίνεται ότι πληροί τα βασικά κριτήρια».'],
  [''],
  ['Εισαγωγή στην εφαρμογή', true],
  ['Στον φάκελο politis τρέξτε:  npm run content:import'],
  ['Αν κάτι λείπει ή είναι λάθος, θα δείτε μήνυμα με το φύλλο και τη γραμμή. Διορθώστε το και ξανατρέξτε την εντολή.'],
];
lines.forEach(([text, bold], i) => {
  const cell = guide.getCell(i + 1, 1);
  cell.value = text;
  cell.font = bold ? { bold: true, size: i === 0 ? 16 : 12, color: { argb: BRAND } } : { size: 11 };
  cell.alignment = { wrapText: true, vertical: 'top' };
});

// ---- Allowed values (ranges first; the sheet itself is added last) ----
const listColumns: [string, readonly string[]][] = [
  ['Κατηγορία', LISTS.category],
  ['Κατάσταση', LISTS.status],
  ['Στοιχείο χρήστη', LISTS.field],
  ['Συνθήκη', LISTS.operator],
  ['Ναι/Όχι', LISTS.yesNo],
  ...(Object.keys(FIELD_VALUES) as ProfileField[]).map((f) => [`Τιμές: ${profileFieldLabels[f]}`, Object.keys(FIELD_VALUES[f])] as [string, string[]]),
];
const colLetter = (n: number) => String.fromCharCode(64 + n);
const listRange: Record<string, string> = {};
listColumns.forEach(([header, values], c) => {
  listRange[header] = `'${SHEETS.lists}'!$${colLetter(c + 1)}$2:$${colLetter(c + 1)}$${values.length + 1}`;
});
const rangeFor: Record<NonNullable<Column['list']>, string> = {
  category: listRange['Κατηγορία']!,
  status: listRange['Κατάσταση']!,
  field: listRange['Στοιχείο χρήστη']!,
  operator: listRange['Συνθήκη']!,
  yesNo: listRange['Ναι/Όχι']!,
};

// ---- Data sheets ----
function dataSheet(name: string, columns: Column[], examples: Record<string, unknown>[]) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = columns.map((c) => ({ key: c.key, width: c.width }));
  columns.forEach((c, i) => {
    const cell = ws.getCell(1, i + 1);
    cell.value = c.required ? `${c.header} *` : c.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
    cell.alignment = { wrapText: true, vertical: 'middle' };
    if (c.note) cell.note = c.note;
    if (c.list) {
      for (let r = 2; r <= ROWS_WITH_DROPDOWNS; r++) {
        ws.getCell(r, i + 1).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [rangeFor[c.list]],
          showErrorMessage: true,
          errorTitle: 'Μη αποδεκτή τιμή',
          error: 'Διαλέξτε μια τιμή από τη λίστα.',
        };
      }
    }
  });
  ws.getRow(1).height = 32;
  for (const ex of examples) {
    const row = ws.addRow(ex);
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXAMPLE_FILL } };
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
  }
  return ws;
}

dataSheet(SHEETS.benefits, BENEFIT_COLUMNS, [
  {
    id: 'example-programma',
    title: 'ΠΑΡΑΔΕΙΓΜΑ — Όνομα προγράμματος',
    summary: 'Μία πρόταση που εξηγεί τι προσφέρει.',
    description: 'Λίγες προτάσεις για το τι είναι το πρόγραμμα και σε ποιους απευθύνεται, όπως τα γράφει η επίσημη πηγή.',
    category: LISTS.category[0],
    authority: 'Όνομα αρμόδιου φορέα',
    officialUrl: 'https://www.gov.gr/',
    lastVerified: '01/10/2026',
    status: LISTS.status[0],
    deadline: '31/12/2026',
    procedureId: 'example-aitisi',
    requiredChecks: 'Πρώτος έλεγχος που κάνει ο χρήστης\nΔεύτερος έλεγχος',
    keywords: 'παιδιά, οικογένεια, επίδομα',
  },
]);
dataSheet(SHEETS.rules, RULE_COLUMNS, [
  { benefitId: 'example-programma', field: profileFieldLabels.children, operator: OPERATOR_LABELS.gte, value: '1 παιδί', required: 'Ναι', description: 'Έχεις τουλάχιστον ένα παιδί' },
  { benefitId: 'example-programma', field: profileFieldLabels.incomeRange, operator: OPERATOR_LABELS.in, value: 'Έως 10.000 € τον χρόνο, 10.001 – 20.000 €', required: 'Ναι', description: 'Το εισόδημα είναι εντός των ορίων' },
]);
dataSheet(SHEETS.procedures, PROCEDURE_COLUMNS, [
  {
    id: 'example-aitisi',
    title: 'ΠΑΡΑΔΕΙΓΜΑ — Αίτηση για το πρόγραμμα',
    actionTitle: 'αίτηση για το πρόγραμμα',
    description: 'Τι κάνει αυτή η διαδικασία.',
    category: LISTS.category[0],
    authority: 'Όνομα αρμόδιου φορέα',
    officialUrl: 'https://www.gov.gr/',
    lastVerified: '01/10/2026',
    estimatedTime: '15 λεπτά',
    cost: 'Χωρίς κόστος',
    online: 'Ναι',
    requiredDocuments: 'Πρώτο δικαιολογητικό\nΔεύτερο δικαιολογητικό',
    keywords: 'αίτηση',
  },
]);
dataSheet(SHEETS.steps, STEP_COLUMNS, [
  { procedureId: 'example-aitisi', order: 1, title: 'Άνοιξε την επίσημη υπηρεσία.', description: '' },
  { procedureId: 'example-aitisi', order: 2, title: 'Συνδέσου.', description: 'Με τους κωδικούς σου, απευθείας στην επίσημη σελίδα.' },
  { procedureId: 'example-aitisi', order: 3, title: 'Υπέβαλε την αίτηση.', description: '' },
]);

// ---- Allowed values sheet (last tab) ----
const lists = wb.addWorksheet(SHEETS.lists);
listColumns.forEach(([header, values], c) => {
  const col = c + 1;
  lists.getColumn(col).width = Math.max(18, ...values.map((v) => v.length + 2));
  const head = lists.getCell(1, col);
  head.value = header;
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  values.forEach((v, r) => (lists.getCell(r + 2, col).value = v));
});
lists.getCell(listColumns.reduce((m, [, v]) => Math.max(m, v.length), 0) + 3, 1).value =
  `Συνθήκες: «${OPERATOR_LABELS.in}» και «${OPERATOR_LABELS.notIn}» δέχονται πολλές τιμές χωρισμένες με κόμμα. Οι υπόλοιπες δέχονται μία τιμή.`;

mkdirSync(dirname(out), { recursive: true });
await wb.xlsx.writeFile(out);
console.log(`Δημιουργήθηκε: ${out}`);
