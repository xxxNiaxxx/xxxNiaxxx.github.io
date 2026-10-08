/**
 * Validates the content workbook and publishes it to the app.
 *   npm run content:import                 (reads content/politis-content.xlsx)
 *   npm run content:import -- path/to/file.xlsx
 *
 * Writes:
 *   src/data/content/content.json   — bundled with the app (used instead of mock data when not empty)
 *   supabase/seed.sql               — same content for the Supabase tables
 * Nothing is written if any error is found.
 */
import ExcelJS from 'exceljs';
import { writeFileSync } from 'node:fs';
import { categoryLabels, benefitStatusLabels, profileFieldLabels } from '../../src/lib/labels.ts';
import type { Benefit, BenefitRule, Category, Procedure, ProcedureStep, ProfileField, RuleOperator } from '../../src/types/models.ts';
import {
  BENEFIT_COLUMNS,
  type Column,
  DEFAULT_WORKBOOK,
  EXAMPLE_PREFIX,
  FIELD_VALUES,
  OPERATOR_LABELS,
  PROCEDURE_COLUMNS,
  RULE_COLUMNS,
  SHEETS,
  STEP_COLUMNS,
} from './schema.ts';

const CONTENT_JSON = 'src/data/content/content.json';
const SEED_SQL = 'supabase/seed.sql';

const file = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? DEFAULT_WORKBOOK;
const errors: string[] = [];
const warnings: string[] = [];

type Row = Record<string, string> & { __row: number };

// ---------- reading ----------
function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return formatDate(value);
  if (typeof value === 'object') {
    if ('richText' in value) return value.richText.map((r) => r.text).join('');
    if ('hyperlink' in value) return String(value.hyperlink ?? value.text ?? '');
    if ('result' in value) return cellText(value.result as ExcelJS.CellValue);
    if ('text' in value) return String((value as { text: unknown }).text);
    return '';
  }
  return String(value);
}

function formatDate(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

function readSheet(wb: ExcelJS.Workbook, name: string, columns: Column[]): Row[] {
  const ws = wb.getWorksheet(name);
  if (!ws) {
    errors.push(`Λείπει το φύλλο «${name}».`);
    return [];
  }
  // Map columns by header text (tolerates reordering; the trailing " *" is optional).
  const headerIndex = new Map<string, number>();
  ws.getRow(1).eachCell((cell, col) => headerIndex.set(cellText(cell.value).replace(/\s*\*$/, '').trim(), col));
  const missing = columns.filter((c) => !headerIndex.has(c.header));
  if (missing.length) {
    errors.push(`Φύλλο «${name}»: λείπουν οι στήλες ${missing.map((c) => `«${c.header}»`).join(', ')}.`);
    return [];
  }
  const rows: Row[] = [];
  ws.eachRow((row, r) => {
    if (r === 1) return;
    const out = { __row: r } as Row;
    let any = false;
    for (const c of columns) {
      const text = cellText(row.getCell(headerIndex.get(c.header)!).value).trim();
      out[c.key] = text;
      if (text) any = true;
    }
    if (any) rows.push(out);
  });
  return rows;
}

// ---------- validation helpers ----------
const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
interface EnumMap<T extends string> {
  byLabel: Record<string, T>;
  labels: string[];
}
const reverse = <T extends string>(labels: Record<T, string>): EnumMap<T> => ({
  byLabel: Object.fromEntries(Object.entries(labels).map(([k, v]) => [String(v).toLowerCase(), k as T])),
  labels: Object.values(labels) as string[],
});
const CATEGORY = reverse(categoryLabels);
const STATUS = reverse(benefitStatusLabels);
const FIELD = reverse(profileFieldLabels);
const OPERATOR = reverse(OPERATOR_LABELS);

function where(sheet: string, row: Row, col: Column) {
  return `Φύλλο «${sheet}», γραμμή ${row.__row}, στήλη «${col.header}»`;
}

function checkRequired(sheet: string, row: Row, columns: Column[]) {
  for (const c of columns) if (c.required && !row[c.key]) errors.push(`${where(sheet, row, c)}: είναι υποχρεωτικό.`);
}

function col(columns: Column[], key: string): Column {
  return columns.find((c) => c.key === key)!;
}

function parseDate(sheet: string, row: Row, column: Column): string | undefined {
  const v = row[column.key];
  if (!v) return undefined;
  const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/) ?? v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    errors.push(`${where(sheet, row, column)}: η ημερομηνία «${v}» δεν είναι στη μορφή ηη/μμ/εεεε.`);
    return undefined;
  }
  const [d, mo, y] = v.includes('-') && m[1]!.length === 4 ? [m[3], m[2], m[1]] : [m[1], m[2], m[3]];
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (date.getUTCDate() !== Number(d) || date.getUTCMonth() !== Number(mo) - 1) {
    errors.push(`${where(sheet, row, column)}: η ημερομηνία «${v}» δεν υπάρχει.`);
    return undefined;
  }
  return date.toISOString().slice(0, 10);
}

function parseUrl(sheet: string, row: Row, column: Column): string {
  const v = row[column.key] ?? '';
  if (!v) return '';
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    errors.push(`${where(sheet, row, column)}: ο σύνδεσμος «${v}» δεν είναι έγκυρος.`);
    return v;
  }
  if (url.protocol !== 'https:') errors.push(`${where(sheet, row, column)}: ο σύνδεσμος πρέπει να αρχίζει με https://.`);
  if (/(^|\.)example\.(com|org|net)$/.test(url.hostname)) errors.push(`${where(sheet, row, column)}: χρειάζεται ο πραγματικός επίσημος σύνδεσμος.`);
  return v;
}

function parseEnum<T extends string>(sheet: string, row: Row, column: Column, map: EnumMap<T>): T | undefined {
  const v = row[column.key];
  if (!v) return undefined;
  const found = map.byLabel[v.toLowerCase()];
  if (!found) errors.push(`${where(sheet, row, column)}: η τιμή «${v}» δεν είναι στη λίστα. Επιτρέπονται: ${map.labels.join(', ')}.`);
  return found;
}

function parseYesNo(sheet: string, row: Row, column: Column): boolean {
  const v = (row[column.key] ?? '').toLowerCase();
  if (v === 'ναι' || v === 'ναί') return true;
  if (v === 'όχι' || v === 'οχι') return false;
  if (v) errors.push(`${where(sheet, row, column)}: γράψτε «Ναι» ή «Όχι».`);
  return true;
}

const lines = (v: string | undefined) => (v ?? '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
const list = (v: string | undefined) => (v ?? '').split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);

function checkId(sheet: string, row: Row, column: Column, seen: Set<string>): string {
  const id = row[column.key] ?? '';
  if (!id) return id;
  if (!ID_RE.test(id)) errors.push(`${where(sheet, row, column)}: ο κωδικός «${id}» πρέπει να έχει μόνο λατινικά πεζά, αριθμούς και παύλες.`);
  if (seen.has(id)) errors.push(`${where(sheet, row, column)}: ο κωδικός «${id}» υπάρχει ήδη.`);
  seen.add(id);
  return id;
}

const isExample = (id: string | undefined) => (id ?? '').startsWith(EXAMPLE_PREFIX);

// ---------- main ----------
const wb = new ExcelJS.Workbook();
try {
  await wb.xlsx.readFile(file);
} catch {
  console.error(`Δεν βρέθηκε ή δεν ανοίγει το αρχείο «${file}». Αν είναι ανοιχτό στο Excel, αποθηκεύστε το και δοκιμάστε ξανά.`);
  process.exit(1);
}

const benefitRows = readSheet(wb, SHEETS.benefits, BENEFIT_COLUMNS).filter((r) => !isExample(r.id));
const ruleRows = readSheet(wb, SHEETS.rules, RULE_COLUMNS).filter((r) => !isExample(r.benefitId));
const procedureRows = readSheet(wb, SHEETS.procedures, PROCEDURE_COLUMNS).filter((r) => !isExample(r.id));
const stepRows = readSheet(wb, SHEETS.steps, STEP_COLUMNS).filter((r) => !isExample(r.procedureId));

// Procedures + steps
const procedureIds = new Set<string>();
const procedures: Procedure[] = procedureRows.map((r) => {
  const S = SHEETS.procedures;
  checkRequired(S, r, PROCEDURE_COLUMNS);
  const id = checkId(S, r, col(PROCEDURE_COLUMNS, 'id'), procedureIds);
  const officialUrl = parseUrl(S, r, col(PROCEDURE_COLUMNS, 'officialUrl'));
  const lastVerified = parseDate(S, r, col(PROCEDURE_COLUMNS, 'lastVerified')) ?? '';
  return {
    id,
    title: r.title!,
    actionTitle: r.actionTitle!.replace(/[;;?]\s*$/, ''),
    description: r.description!,
    category: parseEnum<Category>(S, r, col(PROCEDURE_COLUMNS, 'category'), CATEGORY) ?? 'family',
    authority: r.authority!,
    officialUrl,
    estimatedTime: r.estimatedTime!,
    cost: r.cost!,
    online: parseYesNo(S, r, col(PROCEDURE_COLUMNS, 'online')),
    requiredDocuments: lines(r.requiredDocuments),
    steps: [],
    keywords: list(r.keywords),
    source: { id: `src_${id}`, authority: r.authority!, url: officialUrl, lastVerified, isMock: false },
    isMock: false,
  };
});

const stepsByProcedure = new Map<string, ProcedureStep[]>();
for (const r of stepRows) {
  const S = SHEETS.steps;
  checkRequired(S, r, STEP_COLUMNS);
  const pid = r.procedureId!;
  if (pid && !procedureIds.has(pid)) errors.push(`${where(S, r, col(STEP_COLUMNS, 'procedureId'))}: δεν υπάρχει διαδικασία με κωδικό «${pid}».`);
  const order = Number(r.order);
  if (r.order && (!Number.isInteger(order) || order < 1)) errors.push(`${where(S, r, col(STEP_COLUMNS, 'order'))}: η σειρά πρέπει να είναι αριθμός (1, 2, 3…).`);
  const steps = stepsByProcedure.get(pid) ?? [];
  if (steps.some((s) => s.order === order)) errors.push(`${where(S, r, col(STEP_COLUMNS, 'order'))}: υπάρχει ήδη βήμα ${order} για τη διαδικασία «${pid}».`);
  steps.push({ id: `${pid}_s${order}`, order, title: r.title!, description: r.description || undefined });
  stepsByProcedure.set(pid, steps);
}
for (const p of procedures) {
  p.steps = (stepsByProcedure.get(p.id) ?? []).sort((a, b) => a.order - b.order);
  if (p.steps.length === 0) errors.push(`Η διαδικασία «${p.id}» δεν έχει βήματα στο φύλλο «${SHEETS.steps}».`);
}

// Benefits + rules
const benefitIds = new Set<string>();
const benefits: Benefit[] = benefitRows.map((r) => {
  const S = SHEETS.benefits;
  checkRequired(S, r, BENEFIT_COLUMNS);
  const id = checkId(S, r, col(BENEFIT_COLUMNS, 'id'), benefitIds);
  const officialUrl = parseUrl(S, r, col(BENEFIT_COLUMNS, 'officialUrl'));
  const lastVerified = parseDate(S, r, col(BENEFIT_COLUMNS, 'lastVerified')) ?? '';
  const procedureId = r.procedureId || undefined;
  if (procedureId && !procedureIds.has(procedureId)) {
    errors.push(`${where(S, r, col(BENEFIT_COLUMNS, 'procedureId'))}: δεν υπάρχει διαδικασία με κωδικό «${procedureId}».`);
  }
  return {
    id,
    title: r.title!,
    summary: r.summary!,
    description: r.description!,
    category: parseEnum<Category>(S, r, col(BENEFIT_COLUMNS, 'category'), CATEGORY) ?? 'family',
    authority: r.authority!,
    officialUrl,
    lastVerified,
    status: parseEnum(S, r, col(BENEFIT_COLUMNS, 'status'), STATUS) ?? 'open',
    deadline: parseDate(S, r, col(BENEFIT_COLUMNS, 'deadline')),
    procedureId,
    eligibilityRules: [],
    requiredChecks: lines(r.requiredChecks),
    keywords: list(r.keywords),
    source: { id: `src_${id}`, authority: r.authority!, url: officialUrl, lastVerified, isMock: false },
    isMock: false,
  };
});

ruleRows.forEach((r, i) => {
  const S = SHEETS.rules;
  checkRequired(S, r, RULE_COLUMNS);
  const benefit = benefits.find((b) => b.id === r.benefitId);
  if (r.benefitId && !benefit) {
    errors.push(`${where(S, r, col(RULE_COLUMNS, 'benefitId'))}: δεν υπάρχει παροχή με κωδικό «${r.benefitId}».`);
  }
  const field = parseEnum<ProfileField>(S, r, col(RULE_COLUMNS, 'field'), FIELD);
  const operator = parseEnum<RuleOperator>(S, r, col(RULE_COLUMNS, 'operator'), OPERATOR);
  if (!field || !operator || !r.value) return;
  const allowed = FIELD_VALUES[field];
  const lookup = Object.fromEntries(Object.entries(allowed).map(([k, v]) => [k.toLowerCase(), v]));
  const parts = operator === 'in' || operator === 'notIn' ? list(r.value) : [r.value];
  const values: (string | number)[] = [];
  for (const p of parts) {
    const v = lookup[p.toLowerCase()] ?? (field === 'children' && /^[0-3]$/.test(p) ? Number(p) : undefined);
    if (v === undefined) {
      errors.push(`${where(S, r, col(RULE_COLUMNS, 'value'))}: η τιμή «${p}» δεν ταιριάζει με «${profileFieldLabels[field]}». Επιτρέπονται: ${Object.keys(allowed).join(', ')}.`);
    } else values.push(v);
  }
  if ((operator === 'gte' || operator === 'lte') && field === 'region') {
    errors.push(`${where(S, r, col(RULE_COLUMNS, 'operator'))}: η περιοχή δεν συγκρίνεται με «τουλάχιστον/το πολύ». Χρησιμοποιήστε «είναι ένα από».`);
  }
  if (!benefit || values.length !== parts.length) return;
  const rule: BenefitRule = {
    id: `${benefit.id}_r${i + 1}`,
    field,
    operator,
    value: operator === 'in' || operator === 'notIn' ? values : values[0]!,
    required: parseYesNo(S, r, col(RULE_COLUMNS, 'required')),
    description: r.description!,
  };
  benefit.eligibilityRules.push(rule);
});
for (const b of benefits) {
  if (b.eligibilityRules.length === 0) warnings.push(`Η παροχή «${b.id}» δεν έχει κριτήρια: θα εμφανίζεται ως «Χρειάζεται έλεγχος» και δεν θα προτείνεται στην αρχική.`);
}

// ---------- report ----------
if (errors.length) {
  console.error(`\n✗ Βρέθηκαν ${errors.length} προβλήματα. Δεν έγινε καμία αλλαγή στην εφαρμογή.\n`);
  errors.forEach((e) => console.error(`  • ${e}`));
  if (warnings.length) {
    console.error('\nΠροειδοποιήσεις:');
    warnings.forEach((w) => console.error(`  • ${w}`));
  }
  process.exit(1);
}

// ---------- write ----------
const generatedAt = new Date().toISOString();
writeFileSync(CONTENT_JSON, JSON.stringify({ generatedAt, benefits, procedures }, null, 2) + '\n');
writeFileSync(SEED_SQL, toSql(benefits, procedures, generatedAt));

console.log(`\n✓ Εισαγωγή ολοκληρώθηκε: ${benefits.length} παροχές, ${procedures.length} διαδικασίες.`);
if (benefits.length === 0 && procedures.length === 0) console.log('  Δεν υπάρχει περιεχόμενο (μόνο παραδείγματα), οπότε η εφαρμογή θα συνεχίσει να δείχνει τα δοκιμαστικά δεδομένα.');
warnings.forEach((w) => console.log(`  ! ${w}`));
console.log(`  Ενημερώθηκαν: ${CONTENT_JSON}, ${SEED_SQL}`);

// ---------- SQL ----------
function q(v: string | undefined | null): string {
  return v === undefined || v === null || v === '' ? 'null' : `'${v.replace(/'/g, "''")}'`;
}
function arr(v: string[]): string {
  return v.length ? `array[${v.map(q).join(', ')}]::text[]` : `'{}'::text[]`;
}
function toSql(bs: Benefit[], ps: Procedure[], at: string): string {
  const out: string[] = [
    `-- Generated by \`npm run content:import\` on ${at}. Do not edit by hand.`,
    'begin;',
    'delete from public.benefit_rules;',
    'delete from public.benefits;',
    'delete from public.procedure_steps;',
    'delete from public.procedures;',
    'delete from public.sources where is_mock = false;',
  ];
  for (const x of [...ps, ...bs]) {
    out.push(`insert into public.sources (id, authority, url, last_verified, is_mock) values (${q(x.source.id)}, ${q(x.source.authority)}, ${q(x.source.url)}, ${q(x.source.lastVerified)}, false) on conflict (id) do update set authority = excluded.authority, url = excluded.url, last_verified = excluded.last_verified;`);
  }
  for (const p of ps) {
    out.push(`insert into public.procedures (id, title, action_title, description, category, authority, official_url, estimated_time, cost, required_documents, online, keywords, source_id, is_mock) values (${[q(p.id), q(p.title), q(p.actionTitle), q(p.description), q(p.category), q(p.authority), q(p.officialUrl), q(p.estimatedTime), q(p.cost), arr(p.requiredDocuments), String(p.online), arr(p.keywords), q(p.source.id), 'false'].join(', ')});`);
    for (const s of p.steps) out.push(`insert into public.procedure_steps (id, procedure_id, step_order, title, description) values (${q(s.id)}, ${q(p.id)}, ${s.order}, ${q(s.title)}, ${q(s.description)});`);
  }
  for (const b of bs) {
    out.push(`insert into public.benefits (id, title, summary, description, category, authority, official_url, last_verified, status, deadline, procedure_id, required_checks, keywords, source_id, is_mock) values (${[q(b.id), q(b.title), q(b.summary), q(b.description), q(b.category), q(b.authority), q(b.officialUrl), q(b.lastVerified), q(b.status), q(b.deadline), q(b.procedureId), arr(b.requiredChecks), arr(b.keywords), q(b.source.id), 'false'].join(', ')});`);
    for (const r of b.eligibilityRules) out.push(`insert into public.benefit_rules (id, benefit_id, field, operator, value, required, description) values (${q(r.id)}, ${q(b.id)}, ${q(r.field)}, ${q(r.operator)}, ${q(JSON.stringify(r.value))}::jsonb, ${r.required}, ${q(r.description)});`);
  }
  out.push('commit;', '');
  return out.join('\n');
}
