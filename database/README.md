# Database

PostgreSQL 14+ schema for RoomLink.

> The repo-root **`start-demo.bat`** applies these scripts automatically.
> The instructions below are for manual setup or CI.

---

## Files

| File         | Purpose                                                                                       |
|--------------|-----------------------------------------------------------------------------------------------|
| `schema.sql` | DROP + CREATE the four tables, foreign keys, CHECK constraints, and the overlap index.        |
| `seed.sql`   | Idempotent inserts: 4 users (Student / Admin / Staff / Student), 3 rooms, 3 room-level QR codes. |

---

## Apply manually

```bash
sudo service postgresql start
PGPASSWORD=postgres psql -U postgres -h localhost \
    -c 'CREATE DATABASE "RoomReservationDB";'
PGPASSWORD=postgres psql -U postgres -h localhost -d RoomReservationDB -f schema.sql
PGPASSWORD=postgres psql -U postgres -h localhost -d RoomReservationDB -f seed.sql
```

Verify:

```bash
PGPASSWORD=postgres psql -U postgres -h localhost -d RoomReservationDB \
    -c 'SELECT "UserID","FirstName","Role" FROM users;' \
    -c 'SELECT "RoomID","RoomName","Capacity" FROM rooms;'
```

---

## Schema diagram

```
users         ───────∞  reservations  ∞───────  rooms
                                                  │
                                                  │ 1:1
                                                  ▼
                                                qr_codes
```

| Table          | Purpose                                | Key constraints                               |
|----------------|----------------------------------------|-----------------------------------------------|
| `users`        | Auth principals (Student/Staff/Admin)  | UNIQUE Email · CHECK Role                     |
| `rooms`        | Bookable resources                     | Capacity ≥ 1                                  |
| `reservations` | Time-bound bookings                    | FK on UserID/RoomID · `idx_reservations_conflict_check` |
| `qr_codes`     | Per-room door stickers                 | UNIQUE RoomID (1:1) · ON DELETE CASCADE       |

---

## Composite index

```sql
CREATE INDEX idx_reservations_conflict_check
    ON reservations ("RoomID", "Status", "StartTime", "EndTime");
```

Optimises the half-open interval overlap query that runs on every reservation
creation. Column order matches the WHERE-clause selectivity (most → least
selective), so the index serves both the conflict check and any
"per-room agenda" listings without an extra index.

---

## Seeded test data

| Users                                   | Rooms                                  | QR codes              |
|-----------------------------------------|----------------------------------------|-----------------------|
| Ahmed Ali (Student)                     | Lab 101 — Building A — capacity 30     | `ROOM-1-LAB101`       |
| Admin User (Admin)                      | Classroom 201 — Building B — capacity 50 | `ROOM-2-CLASSROOM201` |
| Sara Khan (Student)                     | Meeting Room A — Building C — capacity 1 | `ROOM-3-MEETINGROOMA` |
| Sara Mohamed (Staff)                    |                                        |                       |
