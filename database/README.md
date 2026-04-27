# Database

PostgreSQL 14+ schema for RoomLink.

## Files

| File         | Purpose |
|--------------|---------|
| `schema.sql` | DROP + CREATE the four tables, FKs, CHECK constraints, and the overlap-detection index. |
| `seed.sql`   | Idempotent inserts: 4 users, 3 rooms, 3 room-level QR codes. |

## Apply

```bash
sudo service postgresql start
psql -U postgres -h localhost \
     -c "CREATE DATABASE \"RoomReservationDB\";"
psql -U postgres -h localhost -d RoomReservationDB -f schema.sql
psql -U postgres -h localhost -d RoomReservationDB -f seed.sql
```

## Schema diagram

```
users         ───────∞  reservations  ∞───────  rooms
                                       │
                                       │ 1:1
                                       ▼
                                    qr_codes
```

| Table          | Purpose                              | Key Constraints |
|----------------|--------------------------------------|------------------|
| `users`        | Auth principals (Student/Staff/Admin) | UNIQUE Email · CHECK Role |
| `rooms`        | Bookable resources                    | Capacity ≥ 1 |
| `reservations` | Time-bound bookings                   | FK on UserID/RoomID · idx_reservations_conflict_check |
| `qr_codes`     | Per-room door stickers                | UNIQUE RoomID (1:1) · ON DELETE CASCADE |

## Index

```sql
CREATE INDEX idx_reservations_conflict_check
    ON reservations ("RoomID", "Status", "StartTime", "EndTime");
```
Optimises the half-open interval overlap query the backend runs on every
reservation creation.
