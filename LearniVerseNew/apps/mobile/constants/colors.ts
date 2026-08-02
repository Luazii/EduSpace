/** EduSpace brand colour palette — mirrors web design tokens */
export const Colors = {
  // Primary (sky)
  primary: "#0284c7",
  primaryDark: "#0369a1",
  primaryLight: "#38bdf8",
  primaryBg: "#e0f2fe",

  // Secondary (violet)
  secondary: "#7c3aed",
  secondaryDark: "#6d28d9",
  secondaryLight: "#a78bfa",
  secondaryBg: "#ede9fe",

  // Surfaces
  surface: "#ffffff",
  surfaceMuted: "#f8fafc",
  surfaceContainer: "#f1f5f9",
  surfaceBorder: "#e2e8f0",

  // On-surface text
  onSurface: "#0f172a",
  onSurfaceMuted: "#64748b",
  onSurfaceSubtle: "#94a3b8",

  // Status colours
  success: "#059669",
  successBg: "#d1fae5",
  warning: "#d97706",
  warningBg: "#fef3c7",
  danger: "#e11d48",
  dangerBg: "#fee2e2",
  info: "#0284c7",
  infoBg: "#e0f2fe",

  // Brand navy
  navy: "#0f172a",
  navyMid: "#1e293b",

  // Misc
  white: "#ffffff",
  black: "#000000",
  transparent: "transparent",
} as const;

export type ColorKey = keyof typeof Colors;
