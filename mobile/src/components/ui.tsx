import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius } from "@/theme";

export function Screen({
  children,
  refreshing,
  onRefresh,
  contentStyle,
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[{ padding: 16, paddingBottom: 32, gap: 16 }, contentStyle]}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, count, right }: { title: string; count?: number; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count !== undefined && <Text style={styles.count}>{count}</Text>}
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}

const tones = {
  neutral: [colors.muted, colors.mutedText],
  accent: [colors.accentSoft, colors.accent],
  success: [colors.successSoft, colors.success],
  warning: [colors.warningSoft, colors.warning],
  danger: [colors.dangerSoft, colors.danger],
  info: [colors.infoSoft, colors.info],
} as const;
export type Tone = keyof typeof tones;

export const statusTone: Record<string, Tone> = {
  PENDING: "warning",
  CONFIRMED: "success",
  CANCELLED: "neutral",
  COMPLETED: "info",
  TODO: "neutral",
  IN_PROGRESS: "accent",
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",
  PROPOSED: "warning",
  APPROVED: "info",
  EXECUTED: "success",
  REJECTED: "neutral",
  FAILED: "danger",
  SENT: "success",
  DRAFT: "neutral",
};

export function Badge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const [bg, fg] = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <View style={[styles.card, styles.stat]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

export function Button({
  title,
  variant = "primary",
  loading,
  small,
  style,
  ...props
}: PressableProps & { title: string; variant?: "primary" | "accent" | "outline" | "ghost" | "danger"; loading?: boolean; small?: boolean; style?: StyleProp<ViewStyle> }) {
  const v = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    accent: { bg: colors.accent, fg: "#fff", border: colors.accent },
    outline: { bg: colors.surface, fg: colors.text, border: colors.border },
    ghost: { bg: "transparent", fg: colors.mutedText, border: "transparent" },
    danger: { bg: colors.surface, fg: colors.danger, border: "#FCA5A5" },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading || props.disabled}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border, opacity: pressed || props.disabled ? 0.6 : 1 },
        style,
      ]}
      {...props}
    >
      {loading ? <ActivityIndicator color={v.fg} size="small" /> : <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: v.fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={{ paddingVertical: 20, alignItems: "center" }}>
      <Text style={{ color: colors.text, fontWeight: "600" }}>{title}</Text>
      {detail ? <Text style={{ color: colors.mutedText, marginTop: 4, textAlign: "center" }}>{detail}</Text> : null}
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.error}>
      <Text style={{ color: colors.danger, fontWeight: "600" }}>Δεν φόρτωσε</Text>
      <Text style={{ color: colors.danger, marginTop: 4 }}>{message}</Text>
      {onRetry && <Button title="Δοκιμάστε ξανά" variant="outline" small onPress={onRetry} style={{ marginTop: 10, alignSelf: "flex-start" }} />}
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40, backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

export const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: 16 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, letterSpacing: -0.2 },
  count: { fontSize: 12, color: colors.mutedText, backgroundColor: colors.muted, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999, overflow: "hidden" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, alignSelf: "flex-start" },
  badgeText: { fontSize: 11, fontWeight: "600" },
  stat: { flexBasis: "47%", flexGrow: 1, padding: 14 },
  statLabel: { fontSize: 13, color: colors.mutedText, fontWeight: "500" },
  statValue: { fontSize: 24, fontWeight: "700", color: colors.text, marginTop: 6, letterSpacing: -0.5 },
  statHint: { fontSize: 11, color: colors.mutedText, marginTop: 2 },
  button: { height: 44, paddingHorizontal: 16, borderRadius: radius.md, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  buttonSmall: { height: 34, paddingHorizontal: 12 },
  buttonText: { fontSize: 15, fontWeight: "600" },
  error: { backgroundColor: colors.dangerSoft, borderRadius: radius.lg, padding: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  rowSub: { fontSize: 13, color: colors.mutedText, marginTop: 2 },
  input: { height: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, fontSize: 15, backgroundColor: colors.surface, color: colors.text },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 6 },
});
