export const ACCENT_PRESETS = {
  red: { label: "Rouge encre", base: "#c81e1e", hover: "#e02424" },
  blue: { label: "Bleu nuit", base: "#2563eb", hover: "#3b82f6" },
  green: { label: "Vert émeraude", base: "#16a34a", hover: "#22c55e" },
  purple: { label: "Violet", base: "#7c3aed", hover: "#8b5cf6" },
  amber: { label: "Ambre", base: "#d97706", hover: "#f59e0b" },
  pink: { label: "Rose", base: "#db2777", hover: "#ec4899" },
} as const;

export type AccentColorKey = keyof typeof ACCENT_PRESETS;

export const DEFAULT_ACCENT: AccentColorKey = "red";

export function isAccentColorKey(value: string): value is AccentColorKey {
  return value in ACCENT_PRESETS;
}
