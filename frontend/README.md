# Frontend

⏳ **Pending upload.**

Once the frontend module is provided, this folder will host the client application that consumes the backend API at `http://localhost:5000` (or `https://localhost:5001`).

## Expected integration

- Login screen → `POST /api/auth/login`, store the returned JWT
- Authenticated requests → `Authorization: Bearer <token>` header on every call
- Role-aware UI:
  - **Student / Staff** — browse rooms, book, view own reservations, cancel, scan QR
  - **Admin** — all of the above plus add/update/delete rooms and view any reservation
- QR scanner page — calls `GET /api/qr/validate?qrCodeValue=...` and shows access result
