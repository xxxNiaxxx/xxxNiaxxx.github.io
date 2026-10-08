import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "@/components/ui";
import { formatDay } from "@/lib/format";
import { colors, radius } from "@/theme";

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {children}
      {error ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{error}</Text> : hint ? <Text style={{ color: colors.mutedText, fontSize: 12, marginTop: 4 }}>{hint}</Text> : null}
    </View>
  );
}

export function TextField({ label, error, hint, multiline, style, ...props }: TextInputProps & { label: string; error?: string; hint?: string }) {
  return (
    <Field label={label} error={error} hint={hint}>
      <TextInput
        placeholderTextColor={colors.subtleText}
        multiline={multiline}
        style={[styles.input, multiline && { height: 90, paddingTop: 10, textAlignVertical: "top" }, error && { borderColor: colors.danger }, props.editable === false && { backgroundColor: colors.muted }, style]}
        {...props}
      />
    </Field>
  );
}

/** Text field for numbers; keeps the raw text while typing. */
export function NumberField({ value, onChange, ...props }: Omit<TextInputProps, "value" | "onChange"> & { label: string; error?: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return <TextField keyboardType="decimal-pad" value={value} onChangeText={(t) => onChange(t.replace(",", "."))} {...props} />;
}

function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} onPress={onClose} />
      <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: "75%", paddingBottom: insets.bottom + 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={[styles.sectionTitle, { flex: 1 }]}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Κλείσιμο"><Ionicons name="close" size={22} color={colors.mutedText} /></Pressable>
        </View>
        {children}
      </View>
    </Modal>
  );
}

export interface Option {
  value: string;
  label: string;
  detail?: string;
  /** Options with the same group are listed under one heading. */
  group?: string;
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = "Επιλέξτε…",
  error,
  hint,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <Field label={label} error={error} hint={hint}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
        onPress={() => setOpen(true)}
        style={[styles.input, { flexDirection: "row", alignItems: "center" }, error && { borderColor: colors.danger }]}
      >
        <Text style={{ flex: 1, fontSize: 15, color: current ? colors.text : colors.subtleText }} numberOfLines={1}>{current?.label ?? placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.mutedText} />
      </Pressable>
      <Sheet visible={open} title={label} onClose={() => setOpen(false)}>
        <ScrollView>
          {options.map((o, i) => (
            <View key={`${o.value}-${i}`}>
              {o.group && o.group !== options[i - 1]?.group && (
                <Text style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, fontSize: 12, fontWeight: "700", color: colors.mutedText, textTransform: "uppercase" }}>{o.group}</Text>
              )}
              <Pressable
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, backgroundColor: pressed ? colors.muted : "transparent" })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, color: colors.text, fontWeight: o.value === value ? "700" : "400" }}>{o.label}</Text>
                  {o.detail ? <Text style={styles.rowSub}>{o.detail}</Text> : null}
                </View>
                {o.value === value && <Ionicons name="checkmark" size={20} color={colors.accent} />}
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </Sheet>
    </Field>
  );
}

const MONTH_NAMES = ["Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"];
const pad = (n: number) => String(n).padStart(2, "0");
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Date picker (YYYY-MM-DD) with a month grid — no native module needed. */
export function DateField({
  label,
  value,
  onChange,
  min,
  error,
  hint,
  clearable,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  error?: string;
  hint?: string;
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const start = value || min || todayISO();
  const [month, setMonth] = useState({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) });
  const first = new Date(Date.UTC(month.y, month.m - 1, 1));
  const days = new Date(Date.UTC(month.y, month.m, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // Monday first
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const shift = (delta: number) => setMonth(({ y, m }) => ({ y: m + delta > 12 ? y + 1 : m + delta < 1 ? y - 1 : y, m: ((m + delta + 11) % 12) + 1 }));
  const today = todayISO();

  return (
    <Field label={label} error={error} hint={hint}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          const s = value || min || todayISO();
          setMonth({ y: Number(s.slice(0, 4)), m: Number(s.slice(5, 7)) });
          setOpen(true);
        }}
        style={[styles.input, { flexDirection: "row", alignItems: "center" }, error && { borderColor: colors.danger }]}
      >
        <Text style={{ flex: 1, fontSize: 15, color: value ? colors.text : colors.subtleText }}>{value ? `${formatDay(value)} ${value.slice(0, 4)}` : "Επιλέξτε ημερομηνία"}</Text>
        <Ionicons name="calendar-outline" size={18} color={colors.mutedText} />
      </Pressable>
      <Sheet visible={open} title={label} onClose={() => setOpen(false)}>
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Pressable onPress={() => shift(-1)} hitSlop={12} accessibilityLabel="Προηγούμενος μήνας"><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
            <Text style={{ flex: 1, textAlign: "center", fontWeight: "700", fontSize: 16, color: colors.text }}>{MONTH_NAMES[month.m - 1]} {month.y}</Text>
            <Pressable onPress={() => shift(1)} hitSlop={12} accessibilityLabel="Επόμενος μήνας"><Ionicons name="chevron-forward" size={22} color={colors.text} /></Pressable>
          </View>
          <View style={{ flexDirection: "row" }}>
            {["Δ", "Τ", "Τ", "Π", "Π", "Σ", "Κ"].map((d, i) => (
              <Text key={i} style={{ width: `${100 / 7}%`, textAlign: "center", color: colors.mutedText, fontSize: 12, fontWeight: "600" }}>{d}</Text>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
            {cells.map((d, i) => {
              if (d === null) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, height: 44 }} />;
              const iso = `${month.y}-${pad(month.m)}-${pad(d)}`;
              const disabled = !!min && iso < min;
              const selected = iso === value;
              return (
                <Pressable
                  key={iso}
                  disabled={disabled}
                  onPress={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  style={{ width: `${100 / 7}%`, height: 44, alignItems: "center", justifyContent: "center" }}
                >
                  <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: selected ? colors.primary : "transparent", borderWidth: iso === today && !selected ? 1 : 0, borderColor: colors.accent }}>
                    <Text style={{ color: selected ? colors.onPrimary : disabled ? colors.subtleText : colors.text, fontWeight: selected ? "700" : "400" }}>{d}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          {clearable && value ? (
            <Pressable onPress={() => { onChange(""); setOpen(false); }} style={{ alignSelf: "center", marginTop: 8, padding: 8 }}>
              <Text style={{ color: colors.danger, fontWeight: "600" }}>Καθαρισμός</Text>
            </Pressable>
          ) : null}
        </View>
      </Sheet>
    </Field>
  );
}

export function CheckRow({ label, detail, value, onChange }: { label: string; detail?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: value }} onPress={() => onChange(!value)} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 6 }}>
      <Ionicons name={value ? "checkbox" : "square-outline"} size={22} color={value ? colors.accent : colors.subtleText} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, color: colors.text, fontWeight: "500" }}>{label}</Text>
        {detail ? <Text style={styles.rowSub}>{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Pill tabs (like the web app's tab bar). */
export function Segmented<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {options.map((o) => (
        <Pressable
          key={o.key}
          onPress={() => onChange(o.key)}
          style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: value === o.key ? colors.primary : colors.border, backgroundColor: value === o.key ? colors.primary : colors.surface }}
        >
          <Text style={{ fontWeight: "600", fontSize: 13, color: value === o.key ? colors.onPrimary : colors.mutedText }}>{o.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/** A tappable list row with a chevron. */
export function LinkRow({ title, subtitle, right, onPress, first }: { title: string; subtitle?: string; right?: React.ReactNode; onPress: () => void; first?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, first && { borderTopWidth: 0 }, pressed && { opacity: 0.6 }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {right}
      <Ionicons name="chevron-forward" size={18} color={colors.subtleText} />
    </Pressable>
  );
}

export function SearchBox({ value, onChange, placeholder = "Αναζήτηση…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <View style={[styles.input, { flexDirection: "row", alignItems: "center", gap: 8 }]}>
      <Ionicons name="search" size={18} color={colors.subtleText} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.subtleText} style={{ flex: 1, fontSize: 15, color: colors.text, height: "100%" }} autoCorrect={false} />
      {value ? <Pressable onPress={() => onChange("")} hitSlop={10} accessibilityLabel="Καθαρισμός"><Ionicons name="close-circle" size={18} color={colors.subtleText} /></Pressable> : null}
    </View>
  );
}

/** Password input with a show/hide eye button. */
export function PasswordField({ label, value, onChangeText, onSubmitEditing, autoComplete = "password" }: { label: string; value: string; onChangeText: (v: string) => void; onSubmitEditing?: () => void; autoComplete?: TextInputProps["autoComplete"] }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label}>
      <View style={[styles.input, { flexDirection: "row", alignItems: "center", paddingRight: 0 }]}>
        <TextInput value={value} onChangeText={onChangeText} secureTextEntry={!visible} autoComplete={autoComplete} autoCapitalize="none" autoCorrect={false}
          onSubmitEditing={onSubmitEditing} style={{ flex: 1, fontSize: 15, color: colors.text, height: "100%" }} />
        <Pressable onPress={() => setVisible((v) => !v)} hitSlop={8} accessibilityRole="button" accessibilityLabel={visible ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού"}
          style={{ paddingHorizontal: 12, height: "100%", justifyContent: "center" }}>
          <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={20} color={colors.mutedText} />
        </Pressable>
      </View>
    </Field>
  );
}
