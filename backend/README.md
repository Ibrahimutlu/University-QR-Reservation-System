# Backend — Room Reservation API

ASP.NET Core 5.0 Web API with JWT authentication and PostgreSQL persistence.

## Run

```bash
cd RoomReservationSystem
dotnet restore
dotnet run
```

URLs:
- Swagger UI: `https://localhost:5001/swagger`
- API base:   `https://localhost:5001` / `http://localhost:5000`

## Configuration

Database connection string and JWT secret live in `RoomReservationSystem/appsettings.json`. For local development you can override values in `appsettings.Development.json` or via environment variables (recommended for secrets).

## Endpoints (high level)

| Method | Path | Auth |
|---|---|---|
| POST   | `/api/auth/login` | Public |
| GET    | `/api/room` | Student/Staff/Admin |
| GET    | `/api/room/status/{id}` | Student/Staff/Admin |
| GET    | `/api/room/available-slots/{id}?date=` | Student/Staff/Admin |
| POST   | `/api/room/add` | Admin |
| PUT    | `/api/room/update/{id}` | Admin |
| DELETE | `/api/room/delete/{id}` | Admin |
| POST   | `/api/reservation/create` | Student/Staff/Admin |
| GET    | `/api/reservation/{id}` | Admin |
| GET    | `/api/reservation/user/{userId}` | Student/Staff/Admin |
| PUT    | `/api/reservation/cancel/{id}` | Student/Staff/Admin |
| GET    | `/api/qr/validate?qrCodeValue=&userId=` | Student/Staff/Admin |

For full request/response schemas open Swagger.
