# Database

PostgreSQL 14+ schema for the Room Reservation System.

## Files

| File         | Purpose |
|--------------|---------|
| `schema.sql` | DROP + CREATE for the four tables, FKs, CHECK constraints, and the overlap-detection index |
| `seed.sql`   | Idempotent inserts for 4 users, 3 rooms, 3 QR codes |

## Apply

```bash
sudo service postgresql start
psql -U postgres -h localhost -c "CREATE DATABASE \"RoomReservationDB\";"
psql -U postgres -h localhost -d RoomReservationDB -f schema.sql
psql -U postgres -h localhost -d RoomReservationDB -f seed.sql
```

## Tables

```
users         (UserID PK, FirstName, LastName, Email UNIQUE,
               Password, Role CHECK ∈ {Student,Admin,Staff}, StudentNumber)

rooms         (RoomID PK, RoomName, RoomType, Capacity,
               Location, IsAvailable, QRCode)

reservations  (ReservationID PK, UserID FK→users, RoomID FK→rooms,
               ReservationDate, StartTime, EndTime,
               Status, CreatedAt, QRCodeData)

qr_codes      (QRID PK, RoomID FK→rooms UNIQUE, QRCodeValue, IsActive)
```

## Index

```sql
CREATE INDEX idx_reservations_conflict_check
    ON reservations ("RoomID", "Status", "StartTime", "EndTime");
```
Used to accelerate overlap-detection queries during reservation creation.
