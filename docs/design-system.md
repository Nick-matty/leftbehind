# LeftBehind — Design System

Codified tokens live in `packages/design-tokens/tokens.json` (single source for
web CSS variables and Flutter `ThemeData`). This document explains the intent
behind them and specifies component behaviour.

**Visual direction:** editorial travel journal meets modern cartography. Warm
paper surfaces, deep ink text, one sea-green brand colour, one clay accent,
serif display type over a neutral UI sans. Photography leads; chrome recedes.

**Prohibited (from the brief):** glassmorphism, translucency as decoration,
gradient meshes, floating blobs, oversized radii on every surface, emoji as
icons, mixed icon sets, "AI dashboard" purple-blue gradients.

---

## 1. Colour

### 1.1 Brand — sea green

| Token | Hex | Use |
| --- | --- | --- |
| `brand.50` | `#E9F5F2` | selected chips, subtle fills |
| `brand.100` | `#CDE9E3` | hover tint on light |
| `brand.200` | `#9FD5CB` | borders on brand surfaces |
| `brand.300` | `#63BCAE` | dark-mode interactive |
| `brand.400` | `#2E9E8D` | dark-mode hover/active |
| `brand.500` | `#16806F` | primary actions (light) |
| `brand.600` | `#0E6B5C` | primary hover, links on white (7:1) |
| `brand.700` | `#0B5549` | pressed state |
| `brand.800` | `#0A4038` | dark-mode section titles on tint |
| `brand.900` | `#072E28` | deep surfaces |

### 1.2 Accent — clay

| Token | Hex | Use |
| --- | --- | --- |
| `accent.100` | `#FBEBDF` | highlight background |
| `accent.300` | `#E7A97F` | decorative rules |
| `accent.500` | `#C5673D` | "new"/"featured" badges, chart series 2 |
| `accent.600` | `#A8542F` | accent text ≥ 18px only (4.2:1) |
| `accent.700` | `#7F3F23` | accent text on tinted surfaces |

### 1.3 Neutrals (warm ink)

`ink.900 #10151C`, `ink.800 #1A2029`, `ink.700 #2A3340`, `ink.600 #46525F`,
`ink.500 #66737F`, `ink.400 #8C97A2`, `ink.300 #B7BFC7`, `ink.200 #DCE1E6`,
`ink.100 #EDEFF2`, `paper #FBFAF7`, `white #FFFFFF`.

### 1.4 Semantic themes

| Role | Light | Dark |
| --- | --- | --- |
| `bg` | `#FBFAF7` | `#0E1319` |
| `bg.sunken` | `#F3F1EC` | `#0A0E13` |
| `surface` | `#FFFFFF` | `#161D26` |
| `surface.raised` | `#FFFFFF` | `#1E2733` |
| `border` | `#E4E0D8` | `#2A3441` |
| `border.strong` | `#CFC9BE` | `#3A4553` |
| `text` | `#10151C` | `#F2F5F8` |
| `text.muted` | `#5A6570` | `#A4AFBB` |
| `text.subtle` | `#7C8794` | `#7C8794` |
| `primary` | `#16806F` | `#63BCAE` |
| `primary.on` | `#FFFFFF` | `#08211C` |
| `accent` | `#C5673D` | `#E7A97F` |
| `success` | `#1F7A4C` | `#4CBF87` |
| `warning` | `#9A6412` | `#E0A64B` |
| `danger` | `#B3362F` | `#F0786F` |
| `info` | `#2B6CB0` | `#7FB4E8` |
| `star` | `#B07C22` | `#E3B45C` |

**Dark mode is not an inversion.** Rules:

1. Surfaces step up in lightness (`bg` → `surface` → `surface.raised`) instead of
   using shadows.
2. Brand shifts lighter (500 → 300) so interactive elements stay legible on ink.
3. Text is `#F2F5F8`, never pure white, to reduce halation.
4. Borders do the work that shadows do in light mode.
5. Images get a neutral scrim for label legibility, not a tinted overlay.

Contrast: all body text pairs meet WCAG AA (≥ 4.5:1); large display text ≥ 3:1.
`accent.600` is restricted to ≥ 18px.

---

## 2. Typography

Two families only:

- **Display / editorial:** Fraunces (variable, `opsz` 9–144), weights 500–700,
  tracking `-0.02em` at large sizes. Used for hero and section titles, never for
  UI controls.
- **UI / body:** Inter, 400/500/600, `font-variant-numeric: tabular-nums` for
  prices, ratings, distances and timestamps.

| Token | Size / line | Weight | Tracking | Web | Flutter |
| --- | --- | --- | --- | --- | --- |
| `display.lg` | 48 / 56 | 600 | -0.02em | 3rem | `displayLarge` 44 |
| `display.md` | 36 / 44 | 600 | -0.02em | 2.25rem | `displayMedium` 34 |
| `display.sm` | 28 / 36 | 600 | -0.015em | 1.75rem | `displaySmall` 28 |
| `title.lg` | 22 / 30 | 600 | -0.01em | 1.375rem | `headlineSmall` 22 |
| `title.md` | 18 / 26 | 600 | 0 | 1.125rem | `titleLarge` 18 |
| `body.lg` | 17 / 26 | 400 | 0 | 1.0625rem | `bodyLarge` 17 |
| `body.md` | 15 / 24 | 400 | 0 | 0.9375rem | `bodyMedium` 15 |
| `body.sm` | 13 / 20 | 400 | 0 | 0.8125rem | `bodySmall` 13 |
| `label` | 13 / 18 | 500 | +0.01em | 0.8125rem | `labelLarge` 13 |
| `overline` | 11 / 16 | 600 | +0.08em, uppercase | 0.6875rem | `labelSmall` 11 |

Rules: maximum two display sizes per screen; body copy ≤ 70ch; never centre long
paragraphs; numbers use tabular figures; no text below 11px/11dp.

---

## 3. Space, radius, elevation

- **Spacing:** 4-point base — `0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.
  Screen gutters: 16 (mobile), 24 (tablet), 32–48 (desktop). Section rhythm: 32
  mobile / 48 desktop.
- **Radius:** `xs 4`, `sm 6`, `md 10`, `lg 14`, `xl 20`, `full 999`.
  Buttons/inputs `md`; cards `lg`; sheets/dialogs `xl`; pills only for chips,
  avatars and count badges.
- **Borders:** 1px hairline (`border`), 2px focus ring in `brand.500` offset 2px.
- **Shadows (light only):** `sm 0 1px 2px rgba(16,21,28,.06)`,
  `md 0 4px 12px rgba(16,21,28,.08)`, `lg 0 12px 32px rgba(16,21,28,.12)`.
  Cards use `sm` + border, not floating stacks.
- **Elevation in dark mode:** no shadows; use `surface.raised` + `border.strong`.

---

## 4. Motion

| Token | Value |
| --- | --- |
| `duration.fast` | 120 ms — hovers, toggles |
| `duration.base` | 180 ms — buttons, chips, fades |
| `duration.moderate` | 260 ms — sheets, route transitions |
| `duration.slow` | 400 ms — map marker focus, hero reveal |
| `ease.standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `ease.enter` | `cubic-bezier(0, 0, 0.2, 1)` |
| `ease.exit` | `cubic-bezier(0.4, 0, 0, 1)` |
| `spring.sheet` | stiffness 260, damping 28 |

Principles: animate `opacity` and `transform` only; one focal animation per
screen; list items enter with a 40 ms stagger (max 6 items); respect
`prefers-reduced-motion` / `MediaQuery.disableAnimations` by dropping to 0 ms and
removing transforms; no parallax, no looping decoration, never animate layout
properties on scroll.

---

## 5. Iconography

- **Lucide** exclusively, stroke 1.75, sizes 16/20/24/28.
  Web: `lucide-react` (SVG). Flutter: `lucide_icons`.
- No emoji in UI. No mixing with Material icons except platform-mandated
  affordances (e.g. iOS share sheet).
- Every icon-only control needs an accessible label.

---

## 6. Components

| Component | Spec |
| --- | --- |
| Primary button | Height 48 mobile / 44 web, radius 10, `primary` fill, `primary.on` text, `label` type, 16px horizontal padding, pressed = `brand.700`, disabled = 40 % opacity, loading = inline spinner preserving width |
| Secondary button | Surface fill, 1px `border.strong`, `text` colour, same metrics |
| Ghost button | Text-only, `primary` colour, hover `brand.50` fill |
| Destructive button | `danger` outline; filled only inside a confirmation dialog |
| Input | Height 48/44, 1px `border`, radius 10, label above (never placeholder-only), helper text 13px `text.muted`, error border `danger` + 13px message, focus ring 2px brand |
| Search field | Leading search icon, clear button when non-empty, submit on Enter, 48 height, opens full-screen search sheet on mobile |
| Destination card | 4:3 image, `lg` radius, 12px text block: title `title.md`, subtitle `body.sm` muted (country · category), rating chip right-aligned; no glass, no floating shadow stack |
| Place card (horizontal) | 96×96 image `md` radius, title + city + rating row, 12px gap |
| Category chip | Height 32, radius full, icon 16 + label; unselected = surface + border; selected = `brand.50` fill, `brand.700` text, `brand.200` border |
| Bottom navigation | 56 + safe-area inset, 5 items (24 icons, 11px labels), active = `brand.500` icon + label, inactive = `text.subtle`; no blur, opaque surface with top border |
| Top app bar | 56 height, opaque, page title `title.md`, scrolls to elevated state with 1px border only |
| Map marker | 32 pin, `brand.500`; selected 40 with white core and `lg` shadow; cluster = 36 circle with count |
| Map bottom sheet | Detachable, `xl` top radius, drag handle 36×4, snaps 40 %/85 %, contains place card list or detail preview |
| Rating stars | 5 × 16 icons, `star` fill, half-star support, numeric value + count beside |
| Avatar | 24/32/40/64, circle, 1px border; initials fallback on `brand.50` |
| Skeleton | `bg.sunken` blocks, 1.2 s shimmer opacity loop (disabled under reduced motion), same dimensions as content |
| Empty state | 24 icon in `text.subtle`, one-sentence `body.md` explanation, one action button |
| Toast / banner | Bottom on mobile, top-right on desktop, 4 s auto-dismiss, `role="status"`, never used for errors that need action |
| Dialog | Max width 480, radius 20, surface, `lg` shadow in light mode only, focus trapped, Esc closes |
| Tabs / segmented | 36 height, 2px bottom indicator on desktop, full-width segmented control on mobile |
| Admin table | 40 row height, 13px type, sticky header, sortable columns, right-aligned numbers, 1px row dividers |
| Admin sidebar | 240 wide, 44 row height, active row `brand.50` fill, collapses to icon rail at < 1024 |
| Form error summary | Above the form on submit failure, lists field errors as links |

**Navigation:** mobile bottom bar = Home, Explore, Map, Saved, Profile. Web =
horizontal top bar with the same five destinations plus search; admin has its own
shell with a left sidebar and is never linked from the public app.

---

## 7. Imagery

- Destination hero 16:9; destination card 4:3; place card 3:2; gallery thumbs 1:1.
- Always specify width/height to avoid layout shift; lazy-load below the fold.
- Functional scrim allowed for text-over-photo legibility: two-stop
  `rgba(8,16,20,0)` → `rgba(8,16,20,.72)`. It is a legibility tool, not decoration.
- No invented photography. Until real assets are uploaded, cards render a
  `bg.sunken` placeholder with the destination initial — never a stock image that
  misrepresents the place.

---

## 8. Accessibility

- Contrast: AA minimum, AAA for body text where the palette allows.
- Touch targets ≥ 44×44 dp/pt (48 on web), 8 px minimum spacing.
- Full keyboard operability on web: visible focus ring, logical tab order, skip
  link, `Esc` closes overlays, arrow keys within tabs/segmented controls.
- Screen readers: semantic headings, labelled icons, `alt` text for every image,
  live regions for async results, announcements for save/review success.
- Dynamic type: layouts survive 200 % text scaling (mobile) and 200 % browser
  zoom; no fixed-height text containers; truncation only with a tooltip/expand.
- Colour is never the sole carrier of meaning (rating also numeric, error also
  labelled, status also text).
- Motion: honour reduced-motion settings; never autoplay video.

---

## 9. Do / don't

| Do | Don't |
| --- | --- |
| Let photography and type carry the hierarchy | Add blur/translucency panels |
| Use one accent for emphasis per screen | Use three brand colours plus gradients |
| 14 px radii on cards, hairline borders | Pill-shaped everything, floating cards |
| Editorial serif for titles only | Serif in buttons, inputs, labels |
| Deterministic, labelled data (e.g. "4.6 · 128 reviews") | Decorative placeholder stats |
| Empty states that explain the next action | Fake demo content that looks real |
