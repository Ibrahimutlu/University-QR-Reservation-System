# RoomLink — Web UI Kit

A pixel‑faithful recreation of the RoomLink web app, modernized to the new
foundations (Inter + Instrument Serif type stack, five swappable color
schemas, refreshed radii and elevation). The kit covers the surfaces a
typical user touches:

| Component file | Role |
|---|---|
| `Header.jsx` | Sticky brand header + primary nav + logout |
| `Hero.jsx` | Rooms‑page hero with stat pills |
| `RoomCard.jsx` | Room list card with status, capacity, location |
| `ReservationForm.jsx` | Reservation form with slot picker |
| `ScanPanel.jsx` | QR scanner with mode toggle |
| `LoginCard.jsx` | Student vs. Admin/Staff login |
| `StatPill.jsx` | The little success/error/pending pill |
| `MessageBox.jsx` | Success/warning/error/info banner |
| `ThemeSchemeSwitcher.jsx` | UI for the five schemas + dark mode toggle |
| `icons.jsx` | Lucide icon wrapper |

The interactive prototype lives in `index.html` — it walks the user from
login through reserving a room and scanning a QR.

## Source of truth
Built by reading the live frontend at
[`Ibrahimutlu/University-QR-Reservation-System`](https://github.com/Ibrahimutlu/University-QR-Reservation-System)
(`frontend/style.css` and the individual page HTMLs). UI is cosmetic
recreation only — API and auth are stubbed.
