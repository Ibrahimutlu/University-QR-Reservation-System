---
name: roomlink-design
description: Use this skill to generate well-branded interfaces and assets for RoomLink — the QR-Integrated University Room Reservation System — either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

# RoomLink Design Skill

Read the `README.md` file within this skill, and explore the other available files. `colors_and_type.css` is the source of truth for tokens — every other file references it.

## What's here

- `README.md` — high‑level brand context, content guidelines, visual foundations, iconography, and a file index.
- `colors_and_type.css` — design tokens (color schemas, type stack, spacing, radii, shadows, motion).
- `assets/roomlink-logo.png` — the brand mark. Always place on a white plate when used on colored/dark surfaces.
- `preview/` — single‑purpose preview cards (colors, type, components). Read as visual reference.
- `ui_kits/web/` — JSX recreations of the RoomLink web app. Use `index.html` as the worked interactive example; individual components (`Header.jsx`, `RoomCard.jsx`, `ReservationForm.jsx`, `ScanPanel.jsx`, `LoginCard.jsx`, etc.) can be composed into new designs.

## How to use

If creating visual artifacts (slides, mocks, throwaway prototypes, etc.), copy assets out of this folder and create static HTML files for the user to view. Always link `colors_and_type.css` (or inline the parts you need) so colors, type, and motion stay on‑brand.

If working on production code, you can read the rules here to become an expert in designing with this brand — but the live source of truth is the original codebase at <https://github.com/Ibrahimutlu/University-QR-Reservation-System>.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some clarifying questions (which surfaces, which color schema, light/dark, do they want speaker notes/tweaks/animation), then act as an expert designer who outputs HTML artifacts _or_ production code depending on the need.

## Key rules to internalize

- **Five swappable color schemas** — `emerald` (default), `indigo`, `amber`, `plum`, `slate`. Toggle via `<html data-scheme="...">`. Dark mode is additive: `data-theme="dark"`.
- **Typography:** Inter (UI) + Bricolage Grotesque (display) + JetBrains Mono. Use the semantic `--t-*` tokens, not raw font sizes.
- **No emoji, no exclamation points, no first person.** Voice is direct and infrastructural.
- **No icon system in the original product.** Use Lucide via CDN (`https://unpkg.com/lucide@latest/...`), 2 px stroke, sized by element.
- **Buttons & inputs are square‑ish** (radius 8–10 px). Cards are softer (20 px). Pills are status‑only.
- **All motion is gated by `prefers-reduced-motion`.** Default to subtle: 220 ms `--ease-out`.
