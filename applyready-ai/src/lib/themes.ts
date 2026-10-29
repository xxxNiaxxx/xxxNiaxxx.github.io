export const freeThemes = ["classic", "modern", "minimal"] as const;
export const premiumThemes = ["executive", "creative"] as const;
export const allThemes = [...freeThemes, ...premiumThemes] as const;

export type FreeTheme = (typeof freeThemes)[number];
export type PremiumTheme = (typeof premiumThemes)[number];
export type Theme = (typeof allThemes)[number];

export type ThemeSpec = {
  /** "serif" or "sans": picks the bundled DejaVu family for PDF. */
  family: "serif" | "sans";
  /** Font names for DOCX (Word substitutes if missing; all cover Greek). */
  docxFont: string;
  /** Hex colours without '#'. */
  ink: string;
  accent: string;
  muted: string;
  /** Header band colour (used when header is "band"). */
  band: string;
  /** Header style: centred name with rule, coloured band, or plain. */
  header: "centered" | "band" | "plain" | "sidebar";
  headingCase: "upper" | "normal";
  headingRule: boolean;
  nameSize: number;
  bodySize: number;
};

export const themeSpecs: Record<Theme, ThemeSpec> = {
  classic: {
    family: "serif", docxFont: "Georgia", ink: "1F2328", accent: "1F2328", muted: "57606A", band: "1F2328",
    header: "centered", headingCase: "upper", headingRule: true, nameSize: 22, bodySize: 10.5,
  },
  modern: {
    family: "sans", docxFont: "Calibri", ink: "172033", accent: "3C5EE8", muted: "5B6478", band: "3C5EE8",
    header: "band", headingCase: "normal", headingRule: false, nameSize: 22, bodySize: 10,
  },
  minimal: {
    family: "sans", docxFont: "Arial", ink: "2B2B2B", accent: "8A8F98", muted: "8A8F98", band: "8A8F98",
    header: "plain", headingCase: "upper", headingRule: false, nameSize: 18, bodySize: 9.5,
  },
  executive: {
    family: "serif", docxFont: "Cambria", ink: "14213D", accent: "B08D57", muted: "4A5568", band: "14213D",
    header: "band", headingCase: "upper", headingRule: true, nameSize: 24, bodySize: 10.5,
  },
  creative: {
    family: "sans", docxFont: "Segoe UI", ink: "1D2B2A", accent: "0F9D8A", muted: "4F6B68", band: "0F9D8A",
    header: "sidebar", headingCase: "normal", headingRule: false, nameSize: 22, bodySize: 10,
  },
};

export function isPremiumTheme(theme: Theme): theme is PremiumTheme {
  return (premiumThemes as readonly string[]).includes(theme);
}
