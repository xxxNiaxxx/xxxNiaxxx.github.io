/**
 * Public, client-safe configuration only. Secrets (LLM keys, Supabase service role key)
 * must live server-side (Supabase Edge Function secrets) and never be read here.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
const assistantMode = process.env.EXPO_PUBLIC_ASSISTANT_MODE?.trim() === 'remote' ? 'remote' : 'mock';

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  isSupabaseConfigured: supabaseUrl.length > 0 && supabaseAnonKey.length > 0,
  assistantMode: assistantMode as 'mock' | 'remote',
  analyticsEnabled: process.env.EXPO_PUBLIC_ANALYTICS_ENABLED !== 'false',
} as const;
