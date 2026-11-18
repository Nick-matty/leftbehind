#!/usr/bin/env node
/**
 * Builds the web layer of the design system from tokens.json.
 *
 *   dist/tokens.css            light + dark CSS custom properties
 *   dist/tailwind-preset.js    Tailwind theme extension (ESM)
 *   dist/tailwind-preset.d.ts  types for the preset
 *
 * Never edit dist/ by hand: change tokens.json and run `npm run build`.
 * The Flutter layer reads tokens.json directly and is built separately.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(join(root, "tokens.json"), "utf8"));
const out = join(root, "dist");
mkdirSync(out, { recursive: true });

const px = (n) => `${n}px`;
const rem = (n) => `${Number(n.toFixed(4))}rem`;

/** semantic JSON key -> CSS custom property (shadcn-compatible names). */
const SEMANTIC = {
  bg: "background",
  bgSunken: "background-sunken",
  surface: "surface",
  surfaceRaised: "surface-raised",
  border: "border",
  borderStrong: "border-strong",
  text: "foreground",
  textMuted: "muted-foreground",
  textSubtle: "subtle-foreground",
  primary: "primary",
  primaryHover: "primary-hover",
  primaryPressed: "primary-pressed",
  onPrimary: "primary-foreground",
  accent: "accent",
  onAccent: "accent-foreground",
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
  star: "star",
  overlayScrimStart: "overlay-scrim-start",
  overlayScrimEnd: "overlay-scrim-end",
};

const BANNER = `/*
 * LeftBehind design tokens — GENERATED FILE, do not edit.
 * Source: packages/design-tokens/tokens.json · generator: build.mjs
 */`;

function themeVars(theme) {
  const lines = [];
  for (const [key, prop] of Object.entries(SEMANTIC)) {
    const value = theme[key];
    if (value === undefined) continue;
    lines.push(`  --${prop}: ${value};`);
  }
  return lines.join("\n");
}

const { radius, layout, size, border, motion, z } = tokens;

const staticVars = [
  `  --radius: ${px(radius.md)};`,
  ...Object.entries(radius).map(([k, v]) => `  --radius-${k}: ${px(v)};`),
  `  --content-max-width: ${px(layout.contentMaxWidth)};`,
  `  --prose-max-width: ${px(layout.proseMaxWidth)};`,
  `  --gutter-mobile: ${px(layout.gutter.mobile)};`,
  `  --gutter-tablet: ${px(layout.gutter.tablet)};`,
  `  --gutter-desktop: ${px(layout.gutter.desktop)};`,
  `  --section-rhythm-mobile: ${px(layout.sectionRhythm.mobile)};`,
  `  --section-rhythm-desktop: ${px(layout.sectionRhythm.desktop)};`,
  `  --admin-sidebar-width: ${px(layout.adminSidebarWidth)};`,
  `  --header-height: ${px(size.topBarHeight)};`,
  `  --bottom-nav-height: ${px(size.bottomNavHeight)};`,
  `  --control-height: ${px(size.controlHeight.web)};`,
  `  --control-height-sm: ${px(size.controlHeightSm)};`,
  `  --touch-target: ${px(size.touchTargetMin)};`,
  `  --border-hairline: ${px(border.hairline)};`,
  `  --border-focus: ${px(border.focus)};`,
  `  --duration-fast: ${motion.duration.fast}ms;`,
  `  --duration-base: ${motion.duration.base}ms;`,
  `  --duration-moderate: ${motion.duration.moderate}ms;`,
  `  --duration-slow: ${motion.duration.slow}ms;`,
  `  --ease-standard: ${motion.easing.standard};`,
  `  --ease-enter: ${motion.easing.enter};`,
  `  --ease-exit: ${motion.easing.exit};`,
  `  --z-sticky: ${z.sticky};`,
  `  --z-overlay: ${z.overlay};`,
  `  --z-sheet: ${z.sheet};`,
  `  --z-modal: ${z.modal};`,
  `  --z-toast: ${z.toast};`,
].join("\n");

const css = `${BANNER}

:root {
  color-scheme: light;

${themeVars(tokens.color.semantic.light)}

  /* layout, radius, motion — theme independent */
${staticVars}
}

/* System preference, unless the document pins a theme. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;

${themeVars(tokens.color.semantic.dark)
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}
  }
}

/* Explicit dark: <html class="dark"> or <html data-theme="dark">. */
.dark,
[data-theme="dark"] {
  color-scheme: dark;

${themeVars(tokens.color.semantic.dark)}
}
`;

writeFileSync(join(out, "tokens.css"), css);

/* ------------------------------------------------------------------ preset */

const shade = (key) => key;

const colors = {
  transparent: "transparent",
  current: "currentColor",
  inherit: "inherit",
  white: tokens.color.white,
  paper: tokens.color.paper,
  background: "var(--background)",
  "background-sunken": "var(--background-sunken)",
  surface: "var(--surface)",
  "surface-raised": "var(--surface-raised)",
  foreground: "var(--foreground)",
  "muted-foreground": "var(--muted-foreground)",
  "subtle-foreground": "var(--subtle-foreground)",
  border: "var(--border)",
  "border-strong": "var(--border-strong)",
  ring: "var(--primary)",
  primary: {
    DEFAULT: "var(--primary)",
    hover: "var(--primary-hover)",
    pressed: "var(--primary-pressed)",
    foreground: "var(--primary-foreground)",
  },
  accent: { DEFAULT: "var(--accent)", foreground: "var(--accent-foreground)" },
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",
  star: "var(--star)",
  brand: tokens.color.brand,
  clay: tokens.color.accent,
  ink: tokens.color.ink,
};

const fontSize = Object.fromEntries(
  Object.entries(tokens.typography.scale).map(([key, v]) => [
    key.replace(/\./g, "-"),
    [
      rem(v.sizeRem),
      {
        lineHeight: rem(v.lineRem),
        letterSpacing: v.tracking,
        fontWeight: String(v.weight),
        ...(v.transform === "uppercase" ? { textTransform: "uppercase" } : {}),
      },
    ],
  ]),
);

const d = motion.duration;
const e = motion.easing;

const preset = {
  darkMode: "class",
  theme: {
    extend: {
      colors,
      fontFamily: {
        display: [tokens.typography.family.display, "Georgia", "serif"],
        ui: [tokens.typography.family.ui, "system-ui", "sans-serif"],
        sans: [tokens.typography.family.ui, "system-ui", "sans-serif"],
        mono: [tokens.typography.family.mono, "monospace"],
      },
      fontSize,
      fontWeight: tokens.typography.weight,
      borderRadius: {
        none: "0px",
        xs: px(radius.xs),
        sm: px(radius.sm),
        DEFAULT: px(radius.md),
        md: px(radius.md),
        lg: px(radius.lg),
        xl: px(radius.xl),
        full: px(radius.full),
      },
      borderWidth: { hairline: px(border.hairline) },
      boxShadow: tokens.shadow,
      maxWidth: {
        content: px(layout.contentMaxWidth),
        prose: px(layout.proseMaxWidth),
        dialog: px(size.dialogMaxWidth),
      },
      width: {
        sidebar: px(layout.adminSidebarWidth),
        "sidebar-collapsed": px(layout.adminSidebarCollapsedWidth),
      },
      height: {
        header: px(size.topBarHeight),
        bottomnav: px(size.bottomNavHeight),
        control: px(size.controlHeight.web),
        "control-sm": px(size.controlHeightSm),
        "control-mobile": px(size.controlHeight.mobile),
        "admin-row": px(size.adminTableRowHeight),
      },
      minHeight: { touch: px(size.touchTargetMin) },
      minWidth: { touch: px(size.touchTargetMin) },
      spacing: {
        gutter: px(layout.gutter.desktop),
        "gutter-mobile": px(layout.gutter.mobile),
        "gutter-tablet": px(layout.gutter.tablet),
        section: px(layout.sectionRhythm.desktop),
        "section-mobile": px(layout.sectionRhythm.mobile),
      },
      transitionDuration: {
        fast: `${d.fast}ms`,
        base: `${d.base}ms`,
        moderate: `${d.moderate}ms`,
        slow: `${d.slow}ms`,
      },
      transitionTimingFunction: {
        standard: e.standard,
        enter: e.enter,
        exit: e.exit,
      },
      zIndex: {
        base: String(z.base),
        sticky: String(z.sticky),
        overlay: String(z.overlay),
        sheet: String(z.sheet),
        modal: String(z.modal),
        toast: String(z.toast),
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "sheet-in": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        skeleton: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.55" } },
      },
      animation: {
        "fade-in": `fade-in ${d.fast}ms ${e.enter}`,
        "toast-in": `toast-in ${d.base}ms ${e.enter}`,
        "sheet-in": `sheet-in ${d.moderate}ms ${e.standard}`,
        skeleton: `skeleton 1.2s ${e.standard} infinite`,
      },
    },
  },
};

const presetJs = `/*
 * LeftBehind Tailwind preset — GENERATED FILE, do not edit.
 * Source: packages/design-tokens/tokens.json · generator: build.mjs
 */
const preset = ${JSON.stringify(preset, null, 2)};

export default preset;
`;

const presetDts = `import type { Config } from "tailwindcss";

declare const preset: Partial<Config>;
export default preset;
`;

writeFileSync(join(out, "tailwind-preset.js"), presetJs);
writeFileSync(join(out, "tailwind-preset.d.ts"), presetDts);

/* Browsers need the token scales as plain CSS too (charts, inline styles). */
const scaleVars = [
  ...Object.entries(tokens.color.brand).map(([k, v]) => `  --brand-${shade(k)}: ${v};`),
  ...Object.entries(tokens.color.accent).map(([k, v]) => `  --clay-${k}: ${v};`),
  ...Object.entries(tokens.color.ink).map(([k, v]) => `  --ink-${k}: ${v};`),
].join("\n");

const patched = css.replace(
  ":root {\n  color-scheme: light;\n",
  `:root {\n  color-scheme: light;\n\n  /* raw scales */\n${scaleVars}\n`,
);
writeFileSync(join(out, "tokens.css"), patched);

console.log(
  `tokens: wrote tokens.css (${patched.length} bytes), tailwind-preset.js, tailwind-preset.d.ts`,
);
