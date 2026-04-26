# QR-Integrated University Room Reservation System

Course project — **Com6064 Software Engineering**

A multi-tier room reservation platform with QR-based check-in. Students, staff, and administrators can browse rooms, reserve time slots, and validate access by scanning a room's QR code.

## Modules

| Module | Status | Tech Stack |
|---|---|---|
| **Backend** | ✅ Integrated | ASP.NET Core 5.0, Entity Framework Core, JWT Bearer, Swagger |
| **Database** | ✅ Integrated | PostgreSQL 14+ (Npgsql provider) |
| **Frontend** | ⏳ Pending upload | TBD |

## Repository Layout

```
RoomReservationSystem-Integrated/
├── backend/              ASP.NET Core Web API
├── frontend/             (pending)
├── database/             schema.sql + seed.sql
├── docs/                 reports, design documents
├── .env.example          template for local env vars
└── .gitignore
```

## Quick Start

### 1. Database
```bash
sudo service postgresql start
psql -U postgres -h localhost -c "CREATE DATABASE \"RoomReservationDB\";"
psql -U postgres -h localhost -d RoomReservationDB -f database/schema.sql
psql -U postgres -h localhost -d RoomReservationDB -f database/seed.sql
```

### 2. Backend
```bash
cd backend/RoomReservationSystem
dotnet restore
dotnet run
```
Browse to `https://localhost:5001/swagger` to explore the API.

### 3. Frontend
*Pending — instructions will be added when the module is integrated.*

## Seeded Test Users

| Role    | Email                       | Password   |
|---------|-----------------------------|------------|
| Student | ahmed@university.com        | 123456     |
| Admin   | admin@university.com        | admin123   |
| Student | sara@university.com         | 654321     |
| Staff   | sara.staff@university.com   | 123456     |

## Documentation
See `docs/` for the four design and implementation reports.

## License
Academic project — internal use only.
