# Backend — Room Reservation API

ASP.NET Core 5.0 Web API with JWT authentication, EF Core (Npgsql), and
QR generation via QRCoder.

---

## Run

The simplest way is from the **repo root**:

```bat
..\start-demo.bat
```

Or, manually:

```powershell
$env:Path = "C:\Program Files\dotnet;" + $env:Path
cd RoomReservationSystem
dotnet restore
dotnet run
```

URLs:

| URL                                  | What                  |
|--------------------------------------|-----------------------|
| <http://localhost:5000/swagger>      | Swagger UI            |
| <http://localhost:5000>              | API base (HTTP)       |
| <https://localhost:5001>             | API base (HTTPS, prod)|

> `global.json` pins the SDK to **5.0.408** so newer SDKs don't pick up the
> EOL `net5.0` framework with warnings or compatibility breaks.

---

## Project layout

```
backend/
├── global.json
├── RoomReservationSystem.sln
└── RoomReservationSystem/
    ├── Controllers/
    │   ├── AuthenticationController.cs   POST /api/auth/login
    │   ├── RoomController.cs             /api/room/*
    │   ├── ReservationController.cs      /api/reservation/*
    │   └── QRController.cs               /api/qr/*
    ├── Models/
    │   └── User · Room · Reservation · QR · LoginRequest
    ├── Services/
    │   ├── JwtService.cs                 HMAC-SHA256, 7-day expiry
    │   └── QRService.cs                  base64 PNG generator
    ├── Data/AppDbContext.cs              EF Core, snake_case table mapping
    ├── Program.cs · Startup.cs
    ├── appsettings.json
    └── RoomReservationSystem.csproj
```

---

## Endpoints

| Method | Path                                            | Auth                     |
|--------|-------------------------------------------------|--------------------------|
| POST   | `/api/auth/login`                               | Public                   |
| GET    | `/api/room`                                     | Student / Staff / Admin  |
| GET    | `/api/room/status/{roomId}`                     | Student / Staff / Admin  |
| GET    | `/api/room/available-slots/{roomId}?date=…`     | Student / Staff / Admin  |
| POST   | `/api/room/add`                                 | Admin                    |
| PUT    | `/api/room/update/{roomId}`                     | Admin                    |
| DELETE | `/api/room/delete/{roomId}`                     | Admin                    |
| POST   | `/api/reservation/create`                       | Student / Staff / Admin  |
| GET    | `/api/reservation/{id}`                         | Owner or Admin           |
| GET    | `/api/reservation/user/{userId}`                | Owner or Admin           |
| PUT    | `/api/reservation/cancel/{id}`                  | Owner or Admin           |
| GET    | `/api/qr/room/{roomId}`                         | Student / Staff / Admin  |
| GET    | `/api/qr/validate?qrCodeValue=…`                | Student / Staff / Admin  |
| POST   | `/api/qr/validate-reservation`                  | Student / Staff / Admin  |

---

## QR flow

### 1. Per-reservation QR (the user's screen)

When a reservation is created, `QRService.GenerateReservationQR(...)`
serialises the booking context to JSON:

```json
{
  "type":"reservation",
  "reservationId":42,
  "roomId":1,
  "userId":1,
  "validFrom":"...",
  "validUntil":"...",
  "issuedAt":"..."
}
```

The payload is stored in `reservations.QRCodeData` and the rendered base64 PNG
is returned in the response. The frontend displays it on **My Bookings → View QR**.

To validate one (e.g. when scanning a student's phone) the scanner sends:

```http
POST /api/qr/validate-reservation
Content-Type: application/json
Authorization: Bearer <token>

{ "payload": "<the-JSON-string-encoded-in-the-QR>" }
```

### 2. Per-room "door sticker" QR

Each room has a static QR (`qr_codes.QRCodeValue`, e.g. `ROOM-1-LAB101`).
`GET /api/qr/room/{roomId}` returns:

```json
{
  "roomID": 1,
  "roomName": "Lab 101",
  "qrCodeValue": "ROOM-1-LAB101",
  "qrImage": "data:image/png;base64,..."
}
```

The frontend uses this to render the printable card at `print-qr.html?room=1`.

To validate a door scan:

```http
GET /api/qr/validate?qrCodeValue=ROOM-1-LAB101
Authorization: Bearer <token>
```

The backend looks up the QR, then verifies the caller has a current
**Confirmed** reservation for that room.

---

## Configuration

`appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection":
      "Host=localhost;Database=RoomReservationDB;Username=postgres;Password=postgres;Port=5432"
  },
  "JwtSettings": { "Secret": "...", "ExpiryInDays": 7 }
}
```

For production, override these with environment variables (see `.env.example`
at the repo root). Never commit production secrets.
