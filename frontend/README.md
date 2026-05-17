# RoomLink Design System

A modernized design system for **RoomLink** — the QR‑Integrated University
Room Reservation System. Distilled from the live frontend codebase and
extended with five swappable color schemas, a refreshed type stack, and
ready‑to‑drop UI kit components.

> **Brief from the user:** _"make the design more modern and add more color
> schemas."_ — this system keeps RoomLink's existing emerald identity as the
> default while layering on Indigo, Amber, Plum, and Slate alternates and a
> first‑class dark mode. Typography moves from Apple‑only SF Pro to **Inter**
> with an **Instrument Serif** display accent.

---

## Sources

This system was assembled by reading the following materials. The reader may
not have access to them; URLs are recorded in case they do.

- **Live frontend codebase** (mounted locally) — `frontend/`
  - HTML pages: `login.html`, `rooms.html`, `reserve.html`,
    `my-reservations.html`, `reservation-details.html`, `scan.html`,
    `admin-dashboard.html`, `qr-monitor.html`, `print-qr.html`
  - Shared CSS: `style.css` (2,072 lines — the de‑facto design system)
  - Theme + motion helpers: `js/theme.js`, `js/motion.js`
- **GitHub repo:** <https://github.com/Ibrahimutlu/University-QR-Reservation-System>
  (default branch `main`). For a richer system, explore this repo —
  particularly the page CSS and JS — to inform additional component
  recreations.

---

## What is RoomLink?

RoomLink is a web app that lets university students, staff, and admins
reserve campus rooms and check in/out via rotating QR codes.

| Role | What they do |
|---|---|
| **Student** | Browse rooms, reserve a 2‑hour slot, check in & out via QR |
| **Staff** | Manage assigned rooms, view live rotating QR codes, register users |
| **Admin** | Full CRUD on rooms, users, and reservations |

Two demo room flavors exist: standard rooms use a 2‑hour slot grid; the
Demo Presentation Room exposes a free‑form start/end time picker.

### Surfaces represented
- **Web app** (only product) — a static HTML/CSS/JS frontend served on
  Vercel, talking to a Railway‑hosted API.

There is no mobile app, no marketing site, no docs site. The single web
surface covers public auth, student flows, and admin tooling, so the UI
kit in this system is one product — `ui_kits/web/`.

---

## CONTENT FUNDAMENTALS

How RoomLink writes copy, based on strings pulled from `login.html`,
`rooms.html`, `reserve.html`, `scan.html`, `admin-dashboard.html`, and
related templates.

### Voice
- **Direct, infrastructural, slightly formal.** This is school software —
  not a startup. Copy describes _what the page does_, not what the user
  _feels_.
- **Second person, action‑first.** "Choose your role and sign in to
  continue." · "Browse rooms and start reservation directly." · "Select
  one slot for this room on the chosen date."
- **Concise titles, descriptive sub‑lines.** A page intro is almost always
  a two‑line block: short heading + one explanatory sentence.

### Casing
- **Title Case for headings and section titles.** "Find a Room", "Manage
  Rooms", "Available Time Slots", "Reservation Information".
- **Sentence case for body & helper copy.** "Choose a room, pick a date,
  and select one available slot."
- **UPPERCASE eyebrows** for the small accent label sitting above a
  heading: `Authentication`, `Form Details`, `Room List`, `Administration`,
  `Reservation Form`.

### Tone characteristics
- **Confirmatory, not exclamatory.** Success messages read "Reservation
  created" not "Awesome — you're in! 🎉".
- **Plain English over jargon.** "Login" and "Logout", not "Sign in /
  Sign out" inconsistently. Buttons are verbs: _Submit Reservation_, _Add
  Room_, _Update Room_, _Delete Room_, _Browse Rooms_, _Reserve a Room_,
  _Start Camera_, _Stop Camera_.
- **No emoji.** Anywhere. None in headings, labels, buttons, success
  states, error states, or status pills.
- **No first person.** Avoid "I" / "we". Speak about the system in third
  person ("The reservation will use…") or directly to the user ("You can…").

### Specific examples
- Login intro: _"Choose your role and sign in to continue to the
  reservation system."_
- Empty state: _"No rooms found"_ + _"Try changing the search filters to
  see more results."_
- Notification fallback: _"No new notifications"_ (not "All caught up!")
- Slot picker hint: _"Choose a room and reservation date to load available
  slots."_

### Things to avoid
- Marketing flourish ("Your dream booking experience")
- Exclamation points
- Emoji / kaomoji
- Phrases like "Oops", "Uh oh", "Hooray", "Boom"
- Long body paragraphs — keep helper text to one sentence

---

## VISUAL FOUNDATIONS

Read alongside [`colors_and_type.css`](./colors_and_type.css).

### Colors

**Heritage palette (default schema):** an emerald/teal with a single primary
accent `#0b7f75`, a strong variant `#06675f` for hover, and a 10% soft tint
for selected/active backgrounds.

**Modernized schemas:** the system now exposes five accent schemas via
`<html data-scheme="...">`. Each ships a primary accent, strong (for
hover/press), soft (selected backgrounds), line (borders on active state),
glow (for elevated CTAs), a secondary accent, and a page‑tint background.

| Schema | Primary | Strong | Tint | Notes |
|---|---|---|---|---|
| `emerald` *(default)* | `#0b7f75` | `#06675f` | `#e6f5f2` | Original RoomLink identity |
| `indigo` | `#4f46e5` | `#3730a3` | `#eef0ff` | Calm, modern, defaults‑safe |
| `amber` | `#b45309` | `#92400e` | `#fff6e6` | Warm, energetic, good for staff portals |
| `plum` | `#a21caf` | `#701a75` | `#faecff` | Distinctive, expressive |
| `slate` | `#1f2937` | `#0b1220` | `#eef1f4` | Monochrome utility theme |

**Status colors are constant across all schemas:** `success #0f7a3a`,
`warning #a46400`, `danger #c81e25`, `info #1c5dd2`. Each pairs with a
~10% tinted background and is used for badges, message boxes, and inline
form errors.

**Dark mode** is layered on top with `data-theme="dark"`. Each schema gets a
brightened accent (e.g. `#34d3b0` for emerald) and a low‑saturation tinted
surface (`#0a0f11` → `#222e34`).

### Type

- **Sans:** Inter (400, 500, 600, 700, 800). Replaces SF Pro Display so the
  brand renders correctly on every OS.
- **Display:** Bricolage Grotesque — a modern, expressive geometric sans
  with optical sizing. Used for hero copy, large headings, and section
  breaks where some character is wanted.
- **Mono:** JetBrains Mono — codes, IDs, copyable tokens, QR payloads.

Semantic tokens: `--t-display`, `--t-h1`…`--t-h4`, `--t-body`, `--t-small`,
`--t-label`, `--t-eyebrow`, `--t-mono`. Letter‑spacing is tight for
display (`-0.03em`) and slightly tight for headings (`-0.022em`); eyebrows
get `+0.08em` tracking.

### Spacing
A loose 8‑pt scale with 4‑ and 12‑pt helpers: `--s-1`…`--s-20`.
Section padding is generally `--s-12` (48 px) vertical on desktop, `--s-8`
(32 px) on mobile.

### Backgrounds
- No imagery in the base UI — RoomLink doesn't lean on photography.
- The page background is a flat `--bg` neutral with a **subtle accent
  wash** at the top: a radial `--gradient-hero` layered over solid bg.
  Modernized to dual‑radial (primary + secondary accent) instead of the
  original single‑direction linear.
- The login splash uses a dark **grid‑lined gradient** (CSS grid lines
  over a deep emerald → midnight diagonal). Kept intact.
- No textures, no hand‑drawn illustrations, no patterns.

### Borders & corner radii
- Borders are 1 px, `--line` (very low contrast `#e3e7e9`); `--line-strong`
  for emphasis. Active/selected states tint borders with the accent
  (`--accent-line`).
- Modernized radii: cards `--r-lg` (20 px, up from 12), inputs/buttons
  `--r-md` (14 px), pills/badges `--r-pill` (999 px). Small chips
  `--r-sm` (10 px).

### Shadows / elevation
A four‑step system. Cards default to `--shadow-sm` and lift to
`--shadow-md` on hover. CTAs add a colored glow (`--shadow-glow`) using
the active accent. Dark mode swaps all shadows for blackened equivalents.

| Token | Use |
|---|---|
| `--shadow-xs` | Hairline lift on chips & inputs |
| `--shadow-sm` | Default card resting state |
| `--shadow-md` | Hovered cards, popovers |
| `--shadow-lg` | Modals, hero overlays |
| `--shadow-glow` | Primary CTA — colored by current accent |

### Hover, press, focus
- **Hover:** `transform: translateY(-1px)`, soft shadow lift, accent
  border tint. Time `--dur-base` (220 ms) with `--ease-out`.
- **Press:** `is-pressed` class scales to `0.985` and nudges 1 px down. A
  white **ripple** emanates from the click point on every button via
  `motion.js`. Ripple uses `--dur-slow` (420 ms).
- **Focus:** 3 px ring in `--accent-soft` + 1 px border in the accent. No
  blue browser default.
- **Disabled:** opacity 0.52, no transform, no shadow.

### Motion
- Page mount: a single 420 ms `pageFlowIn` (opacity + 6 px Y).
- `.reveal` blocks: 500 ms `fadeUp` (9 px Y), optionally staggered via
  `.delay-1`/`.delay-2`/`.delay-3`.
- Splash on login: a scanning bar sweeps top → bottom for ~1 s while the
  logo settles in 3D and the word "RoomLink" types in letter‑by‑letter.
- Easing tokens: `--ease-out` (default), `--ease-spring` (logo entry),
  `--ease-in` (rare). All motion is **gated by `prefers-reduced-motion`**
  — the CSS clamps every animation to 0.01 ms when set.

### Transparency / blur
- The sticky header uses `backdrop-filter: blur(18px)` over a 78%‑opaque
  surface tint (`--header-bg`). One of the few uses of blur — the rest of
  the UI is opaque.

### Layout
- Container: `min(1200px, 100% - 2.5rem)`, single shared `.container`
  helper. Narrow forms use `--container-narrow` (720 px).
- Header is sticky, ~76 px tall, never overlays content.
- Footer is short, centered, sits at the bottom of the document flow (no
  fixed positioning).

---

## ICONOGRAPHY

### Approach in the original codebase
The original RoomLink **does not have an icon system**. Across the entire
frontend the only "icon" asset is the brand mark itself
(`assets/roomlink-logo.png`). Status indicators are drawn with text
(`R`, `!`, `✓` via Unicode), and navigation labels are pure text.

This is a deliberate minimalism — but it means we have no library to
copy from. To modernize without inventing per‑icon SVGs, this system
**adopts Lucide** as the icon library.

### Lucide (CDN‑sourced)
- **Why Lucide:** open source, MIT, stroke‑based (matches the system's
  hairline 1 px aesthetic), wide coverage, drop‑in via a single CDN
  script. <https://lucide.dev>
- **Stroke weight:** `2px` (Lucide default). Sized via `width`/`height` —
  16 px (inline w/ text), 20 px (default UI), 24 px (section heads).
- **Color:** inherits `currentColor` — pair with `color: var(--accent)`
  or `var(--muted)` rather than hard‑coded fills.

```html
<!-- in <head> -->
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>

<!-- in markup -->
<i data-lucide="qr-code" width="20" height="20"></i>
<i data-lucide="calendar" width="20" height="20"></i>
<i data-lucide="door-open" width="20" height="20"></i>
<i data-lucide="map-pin" width="20" height="20"></i>
<i data-lucide="users" width="20" height="20"></i>

<script>lucide.createIcons();</script>
```

### Substitution flag
**RoomLink has no in‑house icon set; Lucide is a substitution.** If the
team adopts a different library (Phosphor, Heroicons, Iconoir), swap the
CDN and the `data-lucide` attribute namespace; the rest of the system is
icon‑library‑agnostic.

### Emoji & unicode
- **Emoji:** never. Not in body copy, not in messages, not in buttons.
- **Unicode glyphs:** sparingly — only as terminal punctuation
  (`→`, `·`, `…`). Status dots and check marks should be SVG icons, not
  Unicode.

### Logo
- `assets/roomlink-logo.png` — the brand mark. Square, mostly opaque, with
  a stylized "R" framing a QR pattern in emerald gradient.
- **Usage:** always on a white plate (`background: #fff; border-radius:
  10px; padding: 2px;`) when placed on dark/colored surfaces. Pairs with
  the wordmark "RoomLink" set in Inter 700.

---

## File index

```
.
├── README.md                    ← you are here
├── SKILL.md                     ← Agent‑Skills entry point
├── colors_and_type.css          ← All design tokens, semantic CSS vars, schemas
├── assets/
│   └── roomlink-logo.png        ← Brand mark
├── preview/                     ← Design System tab cards (registered assets)
│   ├── colors-primary.html
│   ├── colors-schemas.html
│   ├── colors-neutrals.html
│   ├── colors-semantic.html
│   ├── type-scale.html
│   ├── type-display.html
│   ├── type-utility.html
│   ├── radii-shadows.html
│   ├── spacing.html
│   ├── buttons.html
│   ├── badges-status.html
│   ├── inputs.html
│   ├── cards.html
│   ├── nav-header.html
│   ├── logo.html
│   └── motion.html
└── ui_kits/
    └── web/                     ← Web app UI kit (the only product)
        ├── README.md
        ├── index.html           ← Interactive click‑through prototype
        ├── Header.jsx
        ├── Hero.jsx
        ├── RoomCard.jsx
        ├── ReservationForm.jsx
        ├── ScanPanel.jsx
        ├── LoginCard.jsx
        ├── StatPill.jsx
        ├── MessageBox.jsx
        ├── ThemeSchemeSwitcher.jsx
        └── icons.jsx
```

---

## Caveats & substitutions

- **Inter ← SF Pro Display.** Original used SF Pro Display (Apple‑only).
  Modernized to Inter so cross‑OS rendering matches design. _If the team
  wants the original SF Pro back, the swap is one variable in
  `colors_and_type.css`._
- **Lucide icons (substitution).** RoomLink has no in‑house icon set; we
  picked Lucide as a close stroke‑based match.
- **No slide template** was provided, so no `slides/` directory exists.

