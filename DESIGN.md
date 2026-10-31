---
version: alpha
name: Stock Manager macOS
description: >
  Apple-HIG-grounded utility aesthetic. System materials and semantics recede
  while a single Action Blue accent drives interaction; glass belongs on the
  functional layer (toolbar, sheet) and never on content. Colors adapt to the
  system appearance via WebKit dynamic system colors.
colors:
  primary: "#0066cc"
  primary-focus: "#2997ff"
  on-primary: "#ffffff"
  ink: "#1d1d1f"
  ink-on-dark: "#f5f5f7"
  ink-muted: "rgba(60, 60, 67, 0.6)"
  ink-muted-on-dark: "rgba(235, 235, 245, 0.6)"
  ink-tertiary: "rgba(60, 60, 67, 0.3)"
  ink-tertiary-on-dark: "rgba(235, 235, 245, 0.3)"
  hairline: "rgba(60, 60, 67, 0.2)"
  hairline-on-dark: "rgba(235, 235, 245, 0.16)"
  canvas: "#f5f5f7"
  canvas-on-dark: "#1e1e20"
  surface: "#ffffff"
  surface-on-dark: "#262628"
  warn: "#d64545"
  warn-on-dark: "#ff6b6b"
typography:
  title:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: 17px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.2px"
  section-heading:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  secondary:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.3
  caption:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.3
  numeric:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.3
    fontFeature: "\"tnum\""
rounded:
  sm: 6px
  md: 10px
spacing:
  sm: 8px
  md: 12px
  lg: 16px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: 6px 12px
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: 6px 12px
  button-plain:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: 6px 12px
  toolbar:
    backgroundColor: "rgba(245, 245, 247, 0.72)"
    textColor: "{colors.ink}"
    padding: 12px 16px
  sheet:
    backgroundColor: "rgba(255, 255, 255, 0.85)"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 12px 16px
  content-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 4px 8px
  row-warning:
    backgroundColor: "rgba(214, 69, 69, 0.08)"
    textColor: "{colors.warn}"
---

# Overview

Apple-HIG-grounded utility aesthetic for a single-window desktop tool. The
system provides the identity: SF Pro (via the system font stack), dynamic
system colors, native menus, and vibrancy on the functional layer. One accent
color — Apple's Action Blue — is the sole interactive driver; everything else
is semantic ink, hairlines, and neutral surfaces that adapt to the system
appearance. Glass (blur + translucency) belongs on the functional layer
(toolbar, sheet) and never on the content layer.

## Colors

- **Primary (#0066cc):** Action Blue — the sole driver for interactive
  elements (the primary button). Dark appearance uses #2997ff.
- **Ink (#1d1d1f / #f5f5f7):** Primary text; adapts to the system appearance.
- **Ink muted / tertiary:** Apple's semantic secondary and tertiary labels —
  used for field labels, captions, notes, and the empty state.
- **Hairline:** Row and card separators, kept faint.
- **Canvas (#f5f5f7 / #1e1e20):** The window background; on macOS the body is
  transparent so the sidebar vibrancy material shows instead.
- **Surface (#ffffff / #262628):** The solid content layer — never glass.
- **Warn (#d64545 / #ff6b6b):** Low-stock warnings only; never decorative.

On WebKit the ink/hairline tokens upgrade to the real dynamic system colors
(`-apple-system-label`, `-apple-system-secondary-label`,
`-apple-system-separator`) via an `@supports` block, so they follow the
system appearance and accessibility settings.

## Typography

SF Pro through the system font stack — no webfont downloads. Scale: 17px/600
for the toolbar title, 15px/600 for section headings, 14px body, 12px
secondary figures, 11px captions. The stock count uses tabular numerals
(`font-feature-settings: "tnum"`) so numbers align in columns.

## Layout

A single window, one screen. A sticky toolbar (functional layer) floats over
the content with a blur; the add/edit form is a sheet shown on demand; the
item list sits on the solid content surface. Spacing grid: 8 / 12 / 16 px.

## Components

- `button-primary` is the only high-emphasis action (the sheet's submit) —
  filled with the accent, white text.
- `button-plain` covers toolbar and row actions — bordered, transparent
  background, hover fill.
- `toolbar` and `sheet` are the functional layer: translucent with
  `backdrop-filter: blur(20px) saturate(180%)`.
- `content-surface` is the content layer: solid, rounded 10px, never glass.
- `row-warning` tints an item row when its projected days-to-zero falls
  within its alert threshold.

## Do's and Don'ts

- **Do** let the system provide identity: system font, dynamic system colors,
  native menus, vibrancy.
- **Don't** put glass or blur on the content layer.
- **Don't** add decorative gradients, shadows on chrome, or extra accent
  colors — one accent drives all interaction.
- **Don't** hardcode light/dark pairs in components — use the semantic tokens
  in `src/styles.css`, which adapt automatically.
- **Don't** store or transmit data anywhere: local-only is a ground rule.
