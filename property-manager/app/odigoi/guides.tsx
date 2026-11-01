import Link from "next/link";
import {
  BUSINESS_THRESHOLD_PROPERTIES,
  DEFAULT_COMMISSION_RATES,
  DEFAULT_PAYMENT_FEE_RATES,
  DETACHED_AREA_THRESHOLD_SQM,
  FLAT_DEDUCTION_RATE,
  LATE_STAY_DECLARATION_FINE,
  PRESENCE_FEE_RATE,
  SHORT_TERM_MAX_NIGHTS_EXCLUSIVE,
  VAT_RATE_ACCOMMODATION,
  climateFeePerNight,
  rentalIncomeTax,
  rentalScale,
} from "@/lib/tax/gr";

/*
 * Public guides for what hosts search on Google (/odigoi). Every rate and
 * deadline comes from lib/tax/gr.ts, so a law change there updates the text.
 */

export type Guide = {
  slug: string;
  title: string;
  /** Meta description: what Google shows under the title. */
  description: string;
  /** One line on the list of guides. */
  summary: string;
  body: () => React.ReactNode;
};

const YEAR = 2026;
const pct = (r: number) => `${(r * 100).toLocaleString("el-GR", { maximumFractionDigits: 2 })}%`;
const eur = (n: number) => `${n.toLocaleString("el-GR", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })} €`;
const fee = (month: string, kind: "APARTMENT" | "DETACHED_HOUSE") => climateFeePerNight(`${YEAR}-${month}-15`, { kind, areaSqm: kind === "DETACHED_HOUSE" ? 100 : 50 });

function Cta({ slug, children }: { slug: string; children?: React.ReactNode }) {
  return (
    <div className="my-6 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
      <p className="!text-foreground">{children ?? "Το Βραχυχρόνια.ai τα υπολογίζει μόνο του για κάθε κράτηση και συμπληρώνει τη δήλωση στην ΑΑΔΕ με ένα κουμπί, χωρίς να δώσετε τους κωδικούς σας Taxisnet."}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`/waitlist?utm_source=guide-${slug}`} className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground no-underline">Δοκιμάστε το δωρεάν</Link>
        <Link href="/ypologistis" className="rounded-lg border border-border bg-surface px-3 py-1.5 font-medium text-foreground no-underline">Υπολογιστής καθαρών</Link>
      </div>
    </div>
  );
}

const scale = rentalScale(YEAR);
const example = 10_000;

export const GUIDES: Guide[] = [
  {
    slug: "dilosi-vraxyxronias-diamonis",
    title: "Δήλωση Βραχυχρόνιας Διαμονής στην ΑΑΔΕ: βήμα-βήμα",
    description: `Πώς υποβάλλετε τη Δήλωση Βραχυχρόνιας Διαμονής στο Μητρώο της ΑΑΔΕ για κρατήσεις Airbnb και Booking: προθεσμία, πεδία της φόρμας, πρόστιμο ${LATE_STAY_DECLARATION_FINE} €.`,
    summary: "Προθεσμία, τι γράφετε σε κάθε πεδίο και τα συνηθισμένα λάθη.",
    body: () => (
      <>
        <p>
          Για κάθε διαμονή σε κατάλυμα βραχυχρόνιας μίσθωσης (έως {SHORT_TERM_MAX_NIGHTS_EXCLUSIVE - 1} νύχτες) υποβάλλετε μία <strong>Δήλωση
          Βραχυχρόνιας Διαμονής</strong> στο Μητρώο Ακινήτων Βραχυχρόνιας Διαμονής της ΑΑΔΕ, όποια πλατφόρμα κι αν έφερε την κράτηση: Airbnb,
          Booking.com ή απευθείας.
        </p>
        <h2>Μέχρι πότε</h2>
        <p>
          Μέχρι την <strong>20ή του επόμενου μήνα από την αναχώρηση</strong> του επισκέπτη. Για παράδειγμα, αναχώρηση 28 Οκτωβρίου → δήλωση έως
          20 Νοεμβρίου. Για ακύρωση με χρέωση, μετρά ο μήνας της ακύρωσης. Η εκπρόθεσμη δήλωση έχει πρόστιμο {LATE_STAY_DECLARATION_FINE} € για
          κάθε δήλωση. Η ΑΑΔΕ δίνει κάποιες φορές παράταση: για τις δηλώσεις του Σεπτεμβρίου 2026, η προθεσμία πήγε στις 13 Νοεμβρίου 2026.
        </p>
        <h2>Βήμα-βήμα</h2>
        <ol className="ml-5 space-y-1 text-muted-foreground [&>li]:!list-decimal">
          <li>Μπείτε στο Μητρώο Ακινήτων Βραχυχρόνιας Διαμονής της ΑΑΔΕ με τους κωδικούς σας Taxisnet.</li>
          <li>Διαλέξτε το ακίνητο (τον ΑΜΑ του) και πατήστε «Υποβολή Νέας Δήλωσης».</li>
          <li>Συμπληρώστε τα πεδία (παρακάτω) και πατήστε «Υποβολή».</li>
        </ol>
        <h2>Τι γράφετε σε κάθε πεδίο</h2>
        <ul>
          <li><strong>Άφιξη, αναχώρηση:</strong> οι ημερομηνίες της κράτησης.</li>
          <li><strong>Συνολικό συμφωνηθέν μίσθωμα:</strong> το ποσό της διαμονής, <em>χωρίς</em> το ΤΑΚΚ. Στο καθεστώς επιχείρησης, χωρίς ΦΠΑ και χωρίς το τέλος {pct(PRESENCE_FEE_RATE)}.</li>
          <li><strong>Τρόπος πληρωμής:</strong> για Airbnb και Booking συνήθως «Λογαριασμός Πληρωμών Ημεδαπής».</li>
          <li><strong>Ηλεκτρονική πλατφόρμα:</strong> Airbnb, Booking.com ή άλλη.</li>
          <li><strong>Αλλοδαπός:</strong> αν ο επισκέπτης δεν έχει ελληνικό ΑΦΜ.</li>
          <li><strong>ΑΦΜ</strong> για Έλληνες ή <strong>ονοματεπώνυμο και αριθμός διαβατηρίου / ταυτότητας Ε.Ε.</strong> για αλλοδαπούς.</li>
          <li><strong>Σημειώσεις:</strong> βολεύει να γράφετε τον αριθμό κράτησης, για να βρίσκετε μετά ποια δήλωση είναι ποια.</li>
        </ul>
        <h2>Τα συνηθισμένα λάθη</h2>
        <ul>
          <li>Μίσθωμα μαζί με το ΤΑΚΚ ή με τον ΦΠΑ.</li>
          <li>Ξεχασμένες ακυρώσεις με χρέωση: δηλώνονται κι αυτές.</li>
          <li>Διαμονή που περνά από μήνα σε μήνα: η δήλωση είναι μία, με προθεσμία από την αναχώρηση.</li>
        </ul>
        <Cta slug="dilosi">
          Στο Βραχυχρόνια.ai κάθε κράτηση έχει έτοιμη τη δήλωση, με τη σειρά της φόρμας. Ανοίγετε εσείς τη φόρμα της ΑΑΔΕ, πατάτε ένα κουμπί
          και τα πεδία γεμίζουν. Εσείς ελέγχετε και υποβάλλετε, και οι κωδικοί σας Taxisnet δεν περνούν ποτέ από εμάς.
        </Cta>
      </>
    ),
  },
  {
    slug: "takk-telos-anthektikotitas",
    title: `ΤΑΚΚ ${YEAR}: πόσο είναι το τέλος ανθεκτικότητας στη βραχυχρόνια μίσθωση`,
    description: `Το Τέλος Ανθεκτικότητας στην Κλιματική Κρίση (ΤΑΚΚ) για Airbnb και Booking: ${eur(fee("07", "APARTMENT"))} τη νύχτα Απρίλιο–Οκτώβριο, ${eur(fee("01", "APARTMENT"))} Νοέμβριο–Μάρτιο. Πότε και πώς αποδίδεται.`,
    summary: "Πόσο είναι ανά νύχτα, ποιοι πληρώνουν περισσότερο, πότε αποδίδεται.",
    body: () => (
      <>
        <p>
          Το Τέλος Ανθεκτικότητας στην Κλιματική Κρίση (ΤΑΚΚ) το πληρώνει ο επισκέπτης για κάθε νύχτα, και το αποδίδετε εσείς στο κράτος.
          Δεν είναι εισόδημά σας και δεν φορολογείται.
        </p>
        <h2>Πόσο είναι</h2>
        <ul>
          <li><strong>Απρίλιος–Οκτώβριος:</strong> {eur(fee("07", "APARTMENT"))} τη νύχτα ({eur(fee("07", "DETACHED_HOUSE"))} για μονοκατοικία άνω των {DETACHED_AREA_THRESHOLD_SQM} τ.μ.).</li>
          <li><strong>Νοέμβριος–Μάρτιος:</strong> {eur(fee("01", "APARTMENT"))} τη νύχτα ({eur(fee("01", "DETACHED_HOUSE"))} για μονοκατοικία άνω των {DETACHED_AREA_THRESHOLD_SQM} τ.μ.).</li>
        </ul>
        <p>
          Μετρά ο μήνας κάθε νύχτας: διαμονή 30 Οκτωβρίου – 2 Νοεμβρίου έχει δύο νύχτες με τη θερινή χρέωση (30 και 31/10) και μία με
          τη χειμερινή (1/11), που μπαίνουν σε δύο διαφορετικές μηνιαίες δηλώσεις. Οι δωρεάν διαμονές δεν έχουν ΤΑΚΚ.
        </p>
        <h2>Πότε αποδίδεται</h2>
        <p>
          Με μηνιαία δήλωση, για τις νύχτες κάθε μήνα, μέχρι την <strong>τελευταία μέρα του επόμενου μήνα</strong>. Οι πλατφόρμες δεν το
          αποδίδουν για εσάς, ακόμη κι αν το εισπράττουν από τον επισκέπτη.
        </p>
        <h2>Στη δήλωση διαμονής</h2>
        <p>Στη Δήλωση Βραχυχρόνιας Διαμονής το μίσθωμα γράφεται <em>χωρίς</em> το ΤΑΚΚ.</p>
        <Cta slug="takk">Το Βραχυχρόνια.ai μετρά το ΤΑΚΚ κάθε κράτησης ανά μήνα και σας δείχνει πόσο αποδίδετε και μέχρι πότε.</Cta>
      </>
    ),
  },
  {
    slug: "foros-airbnb-booking",
    title: `Φόρος από Airbnb και Booking το ${YEAR}: η κλίμακα και ένα παράδειγμα`,
    description: `Πώς φορολογείται το εισόδημα από βραχυχρόνια μίσθωση για ιδιώτες (Ε2) το ${YEAR}: κλίμακα ${scale.map((b) => pct(b.rate)).join(" / ")}, έκπτωση ${pct(FLAT_DEDUCTION_RATE)}, παράδειγμα.`,
    summary: `Η κλίμακα ${YEAR}, τι αφαιρείται και τι όχι, παράδειγμα με νούμερα.`,
    body: () => {
      const taxable = example * (1 - FLAT_DEDUCTION_RATE);
      const tax = rentalIncomeTax(YEAR, taxable);
      let lower = 0;
      return (
        <>
          <p>
            Αν είστε ιδιώτης (έως {BUSINESS_THRESHOLD_PROPERTIES - 1} ακίνητα με ΑΜΑ), το εισόδημα από βραχυχρόνια μίσθωση δηλώνεται στο
            έντυπο Ε2 και φορολογείται ως εισόδημα από ακίνητα.
          </p>
          <h2>Η κλίμακα για τα εισοδήματα του {YEAR}</h2>
          <ul>
            {scale.map((b) => {
              const from = lower;
              lower = b.upTo;
              return (
                <li key={b.rate}>
                  {b.upTo === Infinity ? `πάνω από ${eur(from)}` : `${eur(from)} – ${eur(b.upTo)}`}: <strong>{pct(b.rate)}</strong>
                </li>
              );
            })}
          </ul>
          <p>Η κλίμακα εφαρμόζεται στο σύνολο των ενοικίων της χρονιάς, από όλα τα ακίνητα (και από μακροχρόνιες μισθώσεις).</p>
          <h2>Τι αφαιρείται</h2>
          <ul>
            <li>Φορολογείται το μίσθωμα μείον {pct(FLAT_DEDUCTION_RATE)} (έκπτωση για έξοδα).</li>
            <li>Η προμήθεια της πλατφόρμας <em>δεν</em> αφαιρείται.</li>
            <li>Το ΤΑΚΚ δεν είναι εισόδημα: δεν φορολογείται.</li>
          </ul>
          <h2>Παράδειγμα</h2>
          <p>
            Μισθώματα {eur(example)} τη χρονιά → φορολογητέο {eur(taxable)} → φόρος περίπου <strong>{eur(tax)}</strong>. Το καθαρό
            είναι ακόμη λιγότερο, γιατί πριν από τον φόρο έχει ήδη φύγει η προμήθεια της πλατφόρμας.
          </p>
          <p className="text-xs">Δεν είναι φορολογική συμβουλή· για τη δική σας περίπτωση ρωτήστε τον λογιστή σας.</p>
          <Cta slug="foros">Το Βραχυχρόνια.ai υπολογίζει τον φόρο κάθε κράτησης με τον μέσο συντελεστή της χρονιάς σας και σας δείχνει τι μένει καθαρό.</Cta>
        </>
      );
    },
  },
  {
    slug: "idiotis-i-epixeirisi-fpa",
    title: "Βραχυχρόνια μίσθωση: ιδιώτης ή επιχείρηση; Πότε μπαίνει ΦΠΑ",
    description: `Από το ${BUSINESS_THRESHOLD_PROPERTIES}ο ακίνητο η βραχυχρόνια μίσθωση γίνεται επιχείρηση: έναρξη εργασιών, ΦΠΑ ${pct(VAT_RATE_ACCOMMODATION)} και τέλος διαμονής ${pct(PRESENCE_FEE_RATE)}. Τι αλλάζει στη δήλωση και στα καθαρά.`,
    summary: `Τι αλλάζει από το ${BUSINESS_THRESHOLD_PROPERTIES}ο ακίνητο: έναρξη, ΦΠΑ, δήλωση.`,
    body: () => (
      <>
        <p>
          Με έως {BUSINESS_THRESHOLD_PROPERTIES - 1} ακίνητα με ΑΜΑ, ένας ιδιώτης δηλώνει τα μισθώματα στο Ε2, χωρίς ΦΠΑ. Από το{" "}
          <strong>{BUSINESS_THRESHOLD_PROPERTIES}ο ακίνητο</strong> ο νόμος θεωρεί τη δραστηριότητα επιχειρηματική.
        </p>
        <h2>Τι αλλάζει ως επιχείρηση</h2>
        <ul>
          <li>Χρειάζεται έναρξη εργασιών στην ΑΑΔΕ.</li>
          <li>Η τιμή περιλαμβάνει <strong>ΦΠΑ {pct(VAT_RATE_ACCOMMODATION)}</strong> και <strong>τέλος διαμονής παρεπιδημούντων {pct(PRESENCE_FEE_RATE)}</strong>, που αποδίδετε κάθε μήνα.</li>
          <li>Φορολογείται το κέρδος (μίσθωμα μείον έξοδα, μαζί και η προμήθεια) με την κλίμακα των επιχειρήσεων, και υπάρχουν εισφορές ΕΦΚΑ.</li>
          <li>Στη Δήλωση Βραχυχρόνιας Διαμονής το μίσθωμα γράφεται χωρίς ΦΠΑ και χωρίς το τέλος {pct(PRESENCE_FEE_RATE)}.</li>
        </ul>
        <h2>Παράδειγμα τιμής</h2>
        <p>
          Από μια τιμή {eur(100)} (χωρίς ΤΑΚΚ), περίπου {eur(Math.round((100 / ((1 + PRESENCE_FEE_RATE) * (1 + VAT_RATE_ACCOMMODATION))) * 100) / 100)} είναι
          το μίσθωμα και το υπόλοιπο ΦΠΑ και τέλος διαμονής.
        </p>
        <p className="text-xs">Δεν είναι φορολογική συμβουλή· για την έναρξη και τον ΦΠΑ μιλήστε με τον λογιστή σας.</p>
        <Cta slug="fpa">Στο Βραχυχρόνια.ai η εφαρμογή αναγνωρίζει από τον αριθμό των ΑΜΑ αν είστε ιδιώτης ή επιχείρηση και χωρίζει μόνη της ΦΠΑ, τέλος και μίσθωμα σε κάθε κράτηση.</Cta>
      </>
    ),
  },
  {
    slug: "kathara-apo-airbnb-booking",
    title: "Πόσα σας μένουν καθαρά από Airbnb και Booking",
    description: `Από την τιμή της κράτησης στα καθαρά: προμήθεια Airbnb ${DEFAULT_COMMISSION_RATES.AIRBNB}%, Booking ${DEFAULT_COMMISSION_RATES.BOOKING_COM}% + ${DEFAULT_PAYMENT_FEE_RATES.BOOKING_COM}% πληρωμές, ΤΑΚΚ, φόρος. Με παράδειγμα και δωρεάν υπολογιστή.`,
    summary: "Προμήθειες, ΤΑΚΚ, φόρος: από την τιμή της κράτησης στο καθαρό.",
    body: () => (
      <>
        <p>Η τιμή που βλέπει ο επισκέπτης δεν είναι αυτό που σας μένει. Ανάμεσα μπαίνουν τέσσερα πράγματα:</p>
        <ul>
          <li><strong>Προμήθεια πλατφόρμας:</strong> Airbnb περίπου {DEFAULT_COMMISSION_RATES.AIRBNB}% (host-only fee), Booking.com περίπου {DEFAULT_COMMISSION_RATES.BOOKING_COM}%.</li>
          <li><strong>Χρέωση πληρωμών:</strong> στο Booking.com, όταν εισπράττει εκείνο (Payments by Booking), περίπου {DEFAULT_PAYMENT_FEE_RATES.BOOKING_COM}% ακόμη.</li>
          <li><strong>ΤΑΚΚ:</strong> {eur(fee("07", "APARTMENT"))} τη νύχτα το καλοκαίρι, {eur(fee("01", "APARTMENT"))} τον χειμώνα, που αποδίδετε στο κράτος.</li>
          <li><strong>Φόρος εισοδήματος:</strong> από {pct(scale[0].rate)} και πάνω, στο μίσθωμα (η προμήθεια δεν αφαιρείται για τους ιδιώτες).</li>
        </ul>
        <p>Και μετά τα δικά σας έξοδα: καθαρισμός, λογαριασμοί, αναλώσιμα, συντήρηση.</p>
        <p>
          Τα ποσοστά αλλάζουν κατά καιρούς (π.χ. το Airbnb πέρασε σε προμήθεια μόνο από τον οικοδεσπότη) και διαφέρουν ανά συμβόλαιο. Ελέγξτε
          τα δικά σας στο αρχείο κρατήσεων της πλατφόρμας.
        </p>
        <Cta slug="kathara">
          Βάλτε τα δικά σας νούμερα στον δωρεάν υπολογιστή, χωρίς εγγραφή. Ή αφήστε το Βραχυχρόνια.ai να το κάνει για κάθε κράτηση, από το
          αρχείο του Airbnb και του Booking.
        </Cta>
      </>
    ),
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
