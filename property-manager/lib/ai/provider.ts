/**
 * Minimal OpenAI-compatible chat-completions client (works with OpenAI,
 * Azure/OpenRouter/Groq/vLLM/Ollama and other compatible gateways).
 * Server-only: the API key never reaches the browser.
 */
export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; content: string; tool_call_id: string };

export interface ToolSpec {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface ChatProvider {
  readonly name: string;
  complete(req: { messages: ChatMessage[]; tools: ToolSpec[] }): Promise<Extract<ChatMessage, { role: "assistant" }>>;
}

export class OpenAICompatibleProvider implements ChatProvider {
  readonly name = "openai-compatible";
  constructor(
    private readonly opts: { apiKey: string; model: string; baseUrl: string; timeoutMs?: number },
  ) {}

  async complete({ messages, tools }: { messages: ChatMessage[]; tools: ToolSpec[] }) {
    const res = await fetch(`${this.opts.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.opts.apiKey}` },
      body: JSON.stringify({ model: this.opts.model, messages, ...(tools.length ? { tools, tool_choice: "auto" } : {}), temperature: 0.2 }),
      signal: AbortSignal.timeout(this.opts.timeoutMs ?? 60_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`AI provider returned ${res.status}: ${body.slice(0, 300)}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[];
    };
    const message = json.choices?.[0]?.message;
    if (!message) throw new Error("AI provider returned no message");
    return { role: "assistant" as const, content: message.content ?? null, tool_calls: message.tool_calls };
  }
}

/** The configured provider, or null when AI_API_KEY is not set (offline assistant). */
export function getProvider(): ChatProvider | null {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return null;
  return new OpenAICompatibleProvider({
    apiKey,
    model: process.env.AI_MODEL || "gpt-4o-mini",
    baseUrl: process.env.AI_BASE_URL || "https://api.openai.com/v1",
  });
}

/** Model calls per organization per day; the shared demo gets fewer. Past it, the offline assistant answers. */
const DAILY_AI_CALLS = { normal: 400, demo: 30 };

/**
 * The provider for this organization's request, or null (offline assistant)
 * when no key is set or the organization used its daily allowance, so a
 * shared or abused account cannot run up the AI bill.
 */
export async function providerFor(ctx: { organizationId: string }): Promise<ChatProvider | null> {
  const provider = getProvider();
  if (!provider) return null;
  const { db } = await import("@/lib/db");
  const { rateLimited } = await import("@/lib/request");
  const org = await db.organization.findUnique({ where: { id: ctx.organizationId }, select: { isDemo: true } });
  const limit = org?.isDemo ? DAILY_AI_CALLS.demo : DAILY_AI_CALLS.normal;
  return (await rateLimited(`ai:${ctx.organizationId}`, limit, 86_400_000)) ? null : provider;
}
