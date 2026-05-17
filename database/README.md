# Database

PostgreSQL schema and seed data for RoomLink.

Important: `schema.sql` drops and recreates all tables. Use it only for a
fresh local database or an intentional reset. Production Railway databases are
updated incrementally by backend `SchemaRepairService`.

## Files

| File | Purpose |
|---|---|
| `schema.sql` | Full reset schema: users, rooms, reservations, qr_codes, scan_logs, notifications |
| `seed.sql` | Idempotent seed users, standard rooms, demo room, and room QR values |
| `fix-pg-bind.sh` | WSL PostgreSQL bind helper for Windows local development |

## Local Setup

```bash
sudo service postgresql start
PGPASSWORD=postgres psql -U postgres -h localhost -c 'CREATE DATABASE "RoomReservationDB";'
PGPASSWORD=postgres psql -U postgres -h localhost -d RoomReservationDB -f schema.sql
PGPASSWORD=postgres psql -U postgres -h localhost -d RoomReservationDB -f seed.sql
```

## Tables

| Table | Purpose |
|---|---|
| `users` | Student, staff, and admin accounts |
| `rooms` | Bookable rooms, including `IsDemoRoom` |
| `reservations` | Time-bound reservations with status and QR payload |
| `qr_codes` | Static room QR values |
| `scan_logs` | Append-only scan audit trail |
| `notifications` | In-app notification feed |

## Reservation Status Values

- `Pending`
- `Confirmed`
- `Active`
- `CheckedIn`
- `OnBreak`
- `CheckedOut`
- `Cancelled`
- `Expired`
- `NoShow`

`OnBreak` keeps the room slot held while a student is away on a limited break.

## Notification Types

- `ReservationCreated`
- `ReservationCancelled`
- `ReservationEnded`
- `BreakStarted`
- `BreakEnded`
- `BreakOverrun`
- `CheckInGraceWarning`
- `Expired`
- `NoShow`
- `NoExit`
- `Overstay`
- `Info`

## Key Constraints

- Standard active reservations are limited to one per user by partial unique
  index `idx_reservations_one_active_per_user`.
- Demo room reservations are excluded from that one-active-reservation rule via
  `IsDemoReservation = FALSE` in the partial index.
- Capacity conflicts are checked with `idx_reservations_conflict_check`.
- `scan_logs.ScanType` allows `CheckIn`, `CheckOut`, `BreakOut`, and `BreakIn`.

## Seeded Accounts

| Role | Login |
|---|---|
| Student | `20210001` / `123456` |
| Student | `20210002` / `654321` |
| Staff | `sara.staff@university.com` / `123456` |
| Admin | `admin@university.com` / `admin123` |

## Seeded Rooms

- Room A
- Room B
- Room C
- Demo Presentation Room (`IsDemoRoom = TRUE`, capacity 30)
