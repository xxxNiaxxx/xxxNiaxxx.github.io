import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ActionCard } from "@/components/action-card";
import { api, ApiError } from "@/lib/api";
import type { AIAction, ChatMessage, ChatResponse } from "@/lib/types";
import { colors } from "@/theme";

const SUGGESTIONS = ["What needs my attention today?", "Who checks in tomorrow?", "How much did I make this month?", "Which property performs best?"];

/** Renders **bold** without any HTML. */
function Rich({ text, color }: { text: string; color: string }) {
  return (
    <Text style={{ color, fontSize: 15, lineHeight: 21 }}>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? <Text key={i} style={{ fontWeight: "700" }}>{part.slice(2, -2)}</Text> : part.replace(/_([^_]+)_/g, "$1"),
      )}
    </Text>
  );
}

export default function AI() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [actions, setActions] = useState<AIAction[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"llm" | "offline" | null>(null);
  const scroll = useRef<ScrollView>(null);
  const handledQ = useRef<string | undefined>(undefined);

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    setInput("");
    setError(null);
    setSending(true);
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "user", content, createdAt: new Date().toISOString() }]);
    try {
      const res = await api<ChatResponse>("/api/ai/chat", { body: { conversationId, message: content } });
      setConversationId(res.conversationId);
      setMode(res.mode);
      setMessages((m) => [...m, res.message]);
      setActions(res.actions);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "The assistant is unavailable right now.");
      setMessages((m) => m.slice(0, -1));
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (params.q && handledQ.current !== params.q) {
      handledQ.current = params.q;
      void send(params.q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.q]);

  // Each action is shown after the assistant reply of the turn that proposed it.
  const actionsFor = (i: number) => {
    const m = messages[i];
    if (m.role !== "assistant") return [];
    const prev = messages[i - 1];
    return actions.filter((a) => a.createdAt <= m.createdAt && (!prev || prev.id.startsWith("tmp-") || a.createdAt >= prev.createdAt));
  };
  const shown = new Set(messages.flatMap((_, i) => actionsFor(i).map((a) => a.id)));
  const updateAction = (a: AIAction) => setActions((xs) => xs.map((x) => (x.id === a.id ? a : x)));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })} keyboardShouldPersistTaps="handled">
        {messages.length === 0 && !sending ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
            <View style={{ backgroundColor: colors.accentSoft, padding: 14, borderRadius: 18 }}>
              <Ionicons name="sparkles" size={26} color={colors.accent} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text, marginTop: 14 }}>What can I help with?</Text>
            <Text style={{ color: colors.mutedText, textAlign: "center", marginTop: 6, paddingHorizontal: 20 }}>
              I answer from your live data and always ask before sending anything.
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 20 }}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} onPress={() => send(s)} style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={{ fontSize: 13, color: colors.mutedText }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <>
            {mode && (
              <Text style={{ alignSelf: "center", fontSize: 11, color: colors.mutedText }}>
                {mode === "llm" ? "Connected to AI model" : "Offline assistant mode"}
              </Text>
            )}
            {messages.map((m, i) => (
              <View key={m.id} style={{ gap: 10 }}>
                <View style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", backgroundColor: m.role === "user" ? colors.primary : colors.surface, borderRadius: 18, borderWidth: m.role === "user" ? 0 : 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10 }}>
                  <Rich text={m.content} color={m.role === "user" ? colors.onPrimary : colors.text} />
                </View>
                {actionsFor(i).map((a) => <ActionCard key={a.id} action={a} onChange={updateAction} />)}
              </View>
            ))}
            {actions.filter((a) => !shown.has(a.id)).map((a) => <ActionCard key={a.id} action={a} onChange={updateAction} />)}
            {sending && <ActivityIndicator style={{ alignSelf: "flex-start", marginLeft: 12 }} color={colors.accent} />}
          </>
        )}
        {error && <Text style={{ color: colors.danger, backgroundColor: colors.dangerSoft, padding: 12, borderRadius: 10 }}>{error}</Text>}
      </ScrollView>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask your AI manager…"
          placeholderTextColor={colors.subtleText}
          multiline
          style={{ flex: 1, maxHeight: 120, minHeight: 42, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingTop: 11, paddingBottom: 11, fontSize: 15, color: colors.text, backgroundColor: colors.background }}
        />
        <Pressable onPress={() => send(input)} disabled={!input.trim() || sending} accessibilityLabel="Send"
          style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", opacity: !input.trim() || sending ? 0.3 : 1 }}>
          <Ionicons name="arrow-up" size={20} color={colors.onPrimary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
