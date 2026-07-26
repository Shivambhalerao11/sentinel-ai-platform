/**
 * Sentinel Design System — Global Tokens v1
 * Single source of truth for colors, spacing, shadows, radii, typography.
 * Import this wherever you need consistent values.
 */

export const DS = {
  // ─── Color Palette ──────────────────────────────────────────────────────────
  color: {
    // Core navy / deep blues
    navy:        "#07111E",   // deepest background
    navyMid:     "#0B1A2F",   // card backgrounds in dark mode
    navyLight:   "#0F2340",   // elevated surfaces
    blue:        "#163A70",   // primary interactive / sidebar
    blueMid:     "#1E4A8A",   // hover states
    blueLight:   "#2563EB",   // accent links / focus

    // Gold — Government identity
    gold:        "#D4AF37",   // primary gold
    goldLight:   "#F5E27A",   // highlight gold
    goldDark:    "#8B6914",   // shadow gold
    goldMuted:   "rgba(212,175,55,0.15)", // subtle gold tints

    // Saffron accent
    saffron:     "#C8520E",   // Indian saffron
    saffronLight:"#FF9933",   // lighter saffron

    // Indian Green accent
    green:       "#0A6E1E",   // Indian flag green
    greenLight:  "#16A34A",   // success / active
    greenMuted:  "rgba(10,110,30,0.12)",

    // Semantic
    critical:    "#DC2626",   // emergency / critical
    high:        "#D97706",   // high priority / warning
    routine:     "#2563EB",   // routine / info
    resolved:    "#16A34A",   // success / resolved

    // Neutrals
    white:       "#FFFFFF",
    warmWhite:   "#FDFBF5",   // warm ivory
    surface:     "#F8FAFC",   // light page background
    surfaceAlt:  "#F1F5F9",   // input backgrounds
    border:      "#E2E8F0",   // default borders
    borderDark:  "rgba(255,255,255,0.08)", // dark mode borders
    text:        "#0F172A",   // primary text
    textMuted:   "#475569",   // secondary text
    textFaint:   "#94A3B8",   // placeholder / disabled

    // Dark mode surfaces
    darkBg:      "#0B172A",
    darkSurface: "#0F1F35",
    darkCard:    "#132440",
    darkBorder:  "rgba(255,255,255,0.07)",
  },

  // ─── Dropdown Design System Tokens ──────────────────────────────────────────
  select: {
    bg:           "#0B1A2F",
    bgOption:     "#0F2340",
    bgHover:      "#163A70",
    text:         "#FFFFFF",
    textMuted:    "#94A3B8",
    border:       "rgba(255,255,255,0.15)",
    borderHover:  "rgba(212,175,55,0.5)",
    gold:         "#D4AF37",
    focusRing:    "rgba(212,175,55,0.25)",
    shadow:       "0 4px 16px rgba(0,0,0,0.3)",
  },

  // ─── Typography ──────────────────────────────────────────────────────────────
  font: {
    sans:  "'Inter', system-ui, -apple-system, sans-serif",
    mono:  "'JetBrains Mono', 'Fira Code', monospace",
  },

  // ─── Border Radius ───────────────────────────────────────────────────────────
  radius: {
    sm:   "6px",
    md:   "10px",
    lg:   "14px",
    xl:   "18px",
    "2xl":"24px",
    full: "9999px",
  },

  // ─── Shadows ─────────────────────────────────────────────────────────────────
  shadow: {
    xs:    "0 1px 2px rgba(0,0,0,0.06)",
    sm:    "0 2px 8px rgba(0,0,0,0.08)",
    md:    "0 4px 16px rgba(0,0,0,0.12)",
    lg:    "0 8px 32px rgba(0,0,0,0.18)",
    gold:  "0 0 24px rgba(212,175,55,0.2)",
    glow:  "0 0 40px rgba(212,175,55,0.12), 0 4px 16px rgba(0,0,0,0.3)",
    card:  "0 2px 12px rgba(7,17,30,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
    cardDark: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
  },

  // ─── Glassmorphism ───────────────────────────────────────────────────────────
  glass: {
    light: "rgba(255,255,255,0.7)",
    dark:  "rgba(7,17,30,0.75)",
    gold:  "rgba(212,175,55,0.06)",
    blur:  "blur(20px)",
    blurSm:"blur(12px)",
  },

  // ─── Animation durations ─────────────────────────────────────────────────────
  duration: {
    fast:   "150ms",
    normal: "250ms",
    slow:   "400ms",
    page:   "600ms",
  },

  // ─── Easing ──────────────────────────────────────────────────────────────────
  ease: {
    out:    "cubic-bezier(0.16, 1, 0.3, 1)",
    in:     "cubic-bezier(0.4, 0, 1, 1)",
    inOut:  "cubic-bezier(0.4, 0, 0.2, 1)",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },

  // ─── Spacing scale ───────────────────────────────────────────────────────────
  space: {
    1: "4px", 2: "8px", 3: "12px", 4: "16px",
    5: "20px", 6: "24px", 8: "32px", 10: "40px",
    12: "48px", 16: "64px",
  },
} as const;

// ─── CSS custom property injector ────────────────────────────────────────────
export const DS_CSS_VARS = `
  :root {
    --color-navy: ${DS.color.navy};
    --color-navy-mid: ${DS.color.navyMid};
    --color-blue: ${DS.color.blue};
    --color-gold: ${DS.color.gold};
    --color-gold-light: ${DS.color.goldLight};
    --color-gold-dark: ${DS.color.goldDark};
    --color-saffron: ${DS.color.saffron};
    --color-green: ${DS.color.green};
    --color-green-light: ${DS.color.greenLight};
    --color-critical: ${DS.color.critical};
    --color-high: ${DS.color.high};
    --color-text: ${DS.color.text};
    --color-text-muted: ${DS.color.textMuted};
    --color-surface: ${DS.color.surface};
    --color-border: ${DS.color.border};
    --shadow-card: ${DS.shadow.card};
    --shadow-gold: ${DS.shadow.gold};
    --radius-md: ${DS.radius.md};
    --radius-lg: ${DS.radius.lg};
    --radius-xl: ${DS.radius.xl};
  }
`;
