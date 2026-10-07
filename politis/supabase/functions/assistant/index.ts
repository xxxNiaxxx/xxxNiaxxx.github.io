// Supabase Edge Function: `assistant`
//
// Holds the LLM API key server-side (never shipped to the app).
// Deploy:  supabase functions deploy assistant
// Secrets: supabase secrets set ANTHROPIC_API_KEY=... [ASSISTANT_MODEL=claude-opus-5-5]
//
// Contract: the LLM may only (a) write an informational answer in Greek and (b) pick
// relevant benefit/procedure ids from the catalog it is given. Eligibility statuses are
// computed by the app's deterministic engine and passed in read-only; the model must not
// decide eligibility itself, and the client recomputes it anyway.
import Anthropic from 'npm:@anthropic-ai/sdk';

interface CatalogBenefit { id: string; title: string; summary: string; eligibility: string }
interface CatalogProcedure { id: string; title: string }
interface RequestBody {
  message: string;
  catalog: { benefits: CatalogBenefit[]; procedures: CatalogProcedure[] };
  pendingTasks: { title: string; dueDate?: string }[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Είσαι ο βοηθός της εφαρμογής Politis, ενός ενημερωτικού ψηφιακού βοηθού για πολίτες στην Ελλάδα.
Δεν είσαι κρατική υπηρεσία και δεν εκπροσωπείς κανέναν δημόσιο φορέα.

Κανόνες:
- Απαντάς πάντα στα ελληνικά, σύντομα, φιλικά και πρακτικά.
- Ποτέ μη λες ότι ο χρήστης «δικαιούται» επίσημα κάτι. Χρησιμοποίησε διατυπώσεις όπως «φαίνεται ότι», «πιθανόν», «χρειάζεται έλεγχος».
- Η επιλεξιμότητα κάθε παροχής δίνεται στο πεδίο eligibility από ντετερμινιστική μηχανή κανόνων. Μην την αλλάζεις και μην τη συμπεραίνεις μόνος σου.
- Προτείνεις μόνο ids που υπάρχουν στον κατάλογο που σου δίνεται. Μην επινοείς προγράμματα, ποσά, προθεσμίες ή συνδέσμους.
- Αν δεν ξέρεις, πες το και πρότεινε στον χρήστη να συμβουλευτεί την επίσημη πηγή.
- Μη ζητάς ποτέ κωδικούς Taxisnet, τραπεζικά στοιχεία, ΑΦΜ ή ΑΜΚΑ.`;

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    benefitIds: { type: 'array', items: { type: 'string' } },
    procedureIds: { type: 'array', items: { type: 'string' } },
  },
  required: ['answer', 'benefitIds', 'procedureIds'],
  additionalProperties: false,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'assistant_not_configured' }, 503);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (typeof body?.message !== 'string' || body.message.length === 0 || body.message.length > 1000) {
    return json({ error: 'bad_request' }, 400);
  }

  const client = new Anthropic({ apiKey });
  const model = Deno.env.get('ASSISTANT_MODEL') ?? 'claude-opus-5-5';

  try {
    const response = await client.beta.messages.create({
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      // Refusal fallback routing (server-side).
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: OUTPUT_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: `Κατάλογος (JSON):\n${JSON.stringify(body.catalog)}\n\nΕκκρεμείς εργασίες χρήστη (JSON):\n${JSON.stringify(body.pendingTasks ?? [])}\n\nΕρώτηση χρήστη:\n${body.message}`,
        },
      ],
    } as Parameters<typeof client.beta.messages.create>[0]);

    if (response.stop_reason === 'refusal') return json({ error: 'refused' }, 422);

    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return json({ error: 'empty_response' }, 502);
    const parsed = JSON.parse(text.text);

    // Only allow ids from the provided catalog.
    const benefitIds = new Set(body.catalog.benefits.map((b) => b.id));
    const procedureIds = new Set(body.catalog.procedures.map((p) => p.id));
    return json({
      answer: String(parsed.answer ?? ''),
      benefitIds: (parsed.benefitIds ?? []).filter((id: string) => benefitIds.has(id)),
      procedureIds: (parsed.procedureIds ?? []).filter((id: string) => procedureIds.has(id)),
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'rate_limited' }, 429);
    if (error instanceof Anthropic.APIError) {
      console.error('assistant upstream error', error.status);
      return json({ error: 'upstream_error' }, 502);
    }
    console.error('assistant error', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'internal_error' }, 500);
  }
});
