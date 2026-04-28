# Database

PostgreSQL 14+ schema for RoomLink.

> The repo-root **`start-demo.bat`** applies these scripts automatically.
> The instructions below are for manual setup or CI.

---

## Files

| File              | Purpose                                                                                       |
|-------------------|-----------------------------------------------------------------------------------------------|
| `schema.sql`      | DROP + CREATE the four tables, foreign keys, CHECK constraints, and the overlap index.        |
| `seed.sql`        | Idempotent inserts: 4 users (Student / Admin / Staff / Student), 3 rooms, 3 room-level QR codes. |
| `fix-pg-bind.sh`  | One-time WSL fix: makes Postgres listen on `*` so the .NET backend on Windows can reach it.  |

---

## Apply manually

```bash
sudo service postgresql start
PGPASSWORD=postgres psql -U postgres -h localhost \
    -c 'CREATE DATABASE "RoomReservationDB";'
PGPASSWORD=postgres psql -U postgres -h localhost -d RoomReservationDB -f schema.sql
PGPASSWORD=postgres psql -U postgres -h localhost -d RoomReservationDB -f seed.sql
```

## Windows / WSL bind fix

If you run the .NET backend on **Windows** and PostgreSQL inside **WSL2**,
Windows-localhost calls to port 5432 may be refused because Postgres binds
to `127.0.0.1` only by default. Run this once inside WSL to make Postgres
listen on every interface and accept md5 auth:

```bash
bash database/fix-pg-bind.sh
```

The script edits `postgresql.conf` (`listen_addresses = '*'`) and appends an
`md5` rule to `pg_hba.conf`, then restarts the service. `start-demo.bat`
runs it automatically when it detects the connection failure.

Verify:

```bash
PGPASSWORD=postgres psql -U postgres -h localhost -d RoomReservationDB \
    -c 'SELECT "UserID","FirstName","Role" FROM users;' \
    -c 'SELECT "RoomID","RoomName","Capacity" FROM rooms;'
```

---

## Schema diagram

```
users         ----------(N)  reservations  (N)----------  rooms
                                                  |
                                                  | 1:1
                                                  v
                                                qr_codes
```

| Table          | Purpose                                | Key constraints                               |
|----------------|----------------------------------------|-----------------------------------------------|
| `users`        | Auth principals (Student/Staff/Admin)  | UNIQUE Email, CHECK Role                      |
| `rooms`        | Bookable resources                     | Capacity >= 1                                 |
| `reservations` | Time-bound bookings                    | FK on UserID/RoomID, `idx_reservations_conflict_check` |
| `qr_codes`     | Per-room door stickers                 | UNIQUE RoomID (1:1), ON DELETE CASCADE        |

---

## Composite index

```sql
CREATE INDEX idx_reservations_conflict_check
    ON reservations ("RoomID", "Status", "StartTime", "EndTime");
```

Optimises the half-open interval overlap query that runs on every reservation
creation. Column order matches the WHERE-clause selectivity (most to least
selective), so the index serves both the conflict check and any
"per-room agenda" listings without an extra index.

---

## Seeded test data

| Users                | Rooms                                | QR codes              |
|----------------------|--------------------------------------|-----------------------|
| Ahmed Ali (Student)  | Lab 101, Building A, capacity 30     | `ROOM-1-LAB101`       |
| Admin User (Admin)   | Classroom 201, Building B, capacity 50 | `ROOM-2-CLASSROOM201` |
| Sara Khan (Student)  | Meeting Room A, Building C, capacity 1 | `ROOM-3-MEETINGROOMA` |
| Sara Mohamed (Staff) |                                      |                       |
