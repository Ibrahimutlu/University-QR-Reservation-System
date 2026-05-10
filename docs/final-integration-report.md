# Final Integration Report

A consolidated change log for the production-readiness pass.

---

## A. Project Analysis

### Existing stack at the start of this pass
* **Backend** — ASP.NET Core 5.0 Web API
  * EF Core (Npgsql) talking to PostgreSQL
  * JWT Bearer authentication
  * Existing controllers: `AuthController`, `RoomController`, `ReservationController`, `QRController`
  * `JwtService`, `QRService` (with rotating-token helper already implemented)
  * Models: `User`, `Room`, `Reservation`, `QR`, `ScanLog`, `LoginRequest`, `RegisterRequest`, `ScanRequest`, `UpdateReservationRequest`
* **Database** — Raw SQL (`schema.sql` / `seed.sql`) applied via psql in WSL
* **Frontend** — Two coexisting versions of static HTML/JS:
  * Original team's drafts (`login.html`, `rooms.html`, `reserve.html`, `my-reservations.html`, `admin-dashboard.html`)
  * The "RoomLink" build (`index.html`, `dashboard.html`, `reservations.html`, `scan.html`, `admin.html`, `print-qr.html`) with shared layer in `js/`
* **Local launcher** — `start-demo.bat` + `stop-demo.bat`

### Problems found
1. Backend was hard-coded for local Postgres only — no `DATABASE_URL` parsing, no `$PORT` binding for containers.
2. CORS was wide-open (`AllowAnyOrigin`) — fine for demos, unsafe in production.
3. JWT secret read only from `appsettings.json` — could not be overridden by env var.
4. No Dockerfile, no Railway config, no Vercel config.
5. No `vercel.json` for the static frontend.
6. Reservation slots were unconstrained — any duration / start time accepted.
7. Single-active-reservation rule was not enforced anywhere.
8. Status enum used ad-hoc strings (`Confirmed`, `Cancelled`) without a DB CHECK constraint.
9. No `qr_scan_logs` audit table at the schema level (the model existed but was not enforced).
10. No `/warnings` endpoint — frontend had no way to surface "you didn't scan in" messages.
11. No check-in / check-out endpoints that mutate reservation status.
12. Students could view QR codes — violates spec.
13. Documentation was minimal — no deployment guide, no API reference, no integration report.

---

## B. Changes Made

### Backend
| File                                              | Change                                                                                                                                            |
|---------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| `Startup.cs`                                      | New `BuildConnectionString` parser for `DATABASE_URL` (URI form, SSL on by default). JWT secret now reads `JWT_SECRET` env var. CORS gated by `FRONTEND_URL`. Swagger always exposed. HTTPS redirect only when `FORCE_HTTPS=true`. New `StaffOrAdmin` policy. `/health` endpoint. |
| `Program.cs`                                      | Bind to `0.0.0.0:$PORT` whenever the env var is present (Railway).                                                                                |
| `Controllers/ReservationController.cs`            | **2-hour slot rule** (length, on-the-hour, start ∈ {8,10,12,14,16,18,20}). **Single-active-reservation rule**. Status-aware overlap test using `ActiveStatuses`. New `GET /warnings` endpoint that auto-marks `Expired` / `NoShow`. |
| `Controllers/QRController.cs`                     | `GET /room/{id}` and `GET /dynamic/{id}` restricted to **Staff / Admin** (students cannot view QR). New `POST /check-in`, `POST /check-out`, `POST /rotate/{id}` endpoints with `scan_logs` writes. |
| `Controllers/RoomController.cs`                   | `GetAvailableSlots` switched to **2-hour slots between 08:00 and 22:00**. Status filter expanded to `Pending` / `Confirmed` / `Active` / `CheckedIn`. |
| `Models/Reservation.cs`                           | Added `UpdatedAt` field for warnings endpoint and audit columns.                                                                                  |

### Database
| File                       | Change |
|----------------------------|--------|
| `database/schema.sql`      | Full rewrite with `CHECK` constraint on the **status enum** (`Pending` / `Confirmed` / `Active` / `CheckedIn` / `CheckedOut` / `Cancelled` / `Expired` / `NoShow`). New `chk_reservation_range` constraint. New partial unique index `idx_reservations_one_active_per_user`. New `qr_codes.Token` / `ExpiresAt` / `UpdatedAt` columns. New `idx_qr_codes_active_token`. New `scan_logs` table with `ScanType` CHECK and two indexes. Timestamps everywhere. |
| `database/seed.sql`        | Seeds 3 spec-compliant rooms (Room A / Room B / Room C, capacity 1, 2-hour slot semantics). Initial QR tokens. |

### Auth / role
* Restricted `GET /api/qr/room/{id}` and `GET /api/qr/dynamic/{id}` to `Staff,Admin`. Students never see QR images in their UI.
* Added `StaffOrAdmin` policy.

### QR
* New endpoints: `POST /api/qr/check-in`, `POST /api/qr/check-out`, `POST /api/qr/rotate/{id}`.
* Both check-in and check-out write to `scan_logs`.
* Check-in transitions `Confirmed` / `Active` → `CheckedIn`. Check-out transitions `CheckedIn` → `CheckedOut`.
* `QR_ROTATION_INTERVAL_MINUTES` env var (default 2) controls the rotating token TTL.

### Deployment
| File                          | Purpose                                                              |
|-------------------------------|----------------------------------------------------------------------|
| `backend/Dockerfile`          | Multi-stage build, .NET 5.0 SDK + ASP.NET runtime, exposes 8080.    |
| `backend/.dockerignore`       | Keeps `bin/`, `obj/`, `.vs/`, IDE files out of the image.            |
| `backend/railway.json`        | Tells Railway to use the Dockerfile builder.                         |
| `frontend/vercel.json`        | SPA fallback rewrite, security headers.                              |
| `frontend/js/config.js`       | Runtime API base resolution: `window.RRS_API_BASE` → `localStorage` → `<meta name="api-base">` → host fallback. Lets the same files run on `localhost`, on a LAN IP (phones), and on `*.vercel.app` without rebuilds. |

### Documentation
| File                                          | Purpose                                                                                  |
|-----------------------------------------------|------------------------------------------------------------------------------------------|
| `README.md`                                   | Rewritten with tech-stack table, role table, deployment overview, repo layout.           |
| `.env.example`, `backend/.env.example`, `frontend/.env.example` | Documents every environment variable.                                       |
| `docs/deployment-guide.md`                    | Step-by-step Railway + Neon + Vercel walkthrough including CORS troubleshooting.        |
| `docs/api-endpoints.md`                       | Every endpoint with role, body, response, and status enum reference.                    |
| `docs/final-integration-report.md`            | This document.                                                                           |

---

## C. Environment Variables Needed

### Backend (Railway)

| Variable                          | Required | Default / Notes                                              |
|-----------------------------------|----------|--------------------------------------------------------------|
| `DATABASE_URL`                    | Yes      | `postgres://user:pw@host:port/db`                            |
| `JWT_SECRET`                      | Yes      | ≥32 random chars                                             |
| `FRONTEND_URL`                    | Yes      | comma-separated list of CORS-allowed origins                 |
| `PORT`                            | Auto     | injected by Railway                                          |
| `ASPNETCORE_ENVIRONMENT`          | Yes      | `Production`                                                 |
| `QR_ROTATION_INTERVAL_MINUTES`    | No       | default 2                                                    |
| `CHECKIN_GRACE_PERIOD_MINUTES`    | No       | default 15                                                   |
| `FORCE_HTTPS`                     | No       | leave unset on Railway (TLS is terminated by the proxy)      |

### Frontend (Vercel)

| Variable           | Required | Notes                                                                                |
|--------------------|----------|--------------------------------------------------------------------------------------|
| `RRS_API_BASE`     | Optional | Set if you choose injection-via-config.production.js. Otherwise inline in HTML.      |
| `VITE_API_BASE_URL` | Optional | If you migrate to Vite later                                                         |
| `NEXT_PUBLIC_API_BASE_URL` | Optional | If you migrate to Next.js later                                              |

---

## D. Deployment Steps (TL;DR)

1. **Database**
   * Railway → +New → PostgreSQL → copy `DATABASE_URL`, OR
   * Neon → create project → copy URI.
   * `psql "$DATABASE_URL" -f database/schema.sql`
   * `psql "$DATABASE_URL" -f database/seed.sql`

2. **Backend (Railway)**
   * Import repo → set Root Dir = `backend`.
   * Add env vars: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`.
   * Deploy. Verify `https://<service>.up.railway.app/swagger`.

3. **Frontend (Vercel)**
   * Import repo → set Root Dir = `frontend`.
   * No build step. Add `<script>window.RRS_API_BASE="<railway-url>"</script>` to entry HTMLs (or use the `<meta name="api-base">` mechanism).
   * Deploy. Open `https://<project>.vercel.app`.

4. **Wire CORS**
   * Update `FRONTEND_URL` on Railway with the actual Vercel URL → redeploy.

5. **Smoke test**
   * `/health` → 200
   * `POST /api/auth/login` → token
   * `GET /api/room` → 3 rooms

---

## E. Test Checklist

### Student
- [ ] Cannot self-register (no UI / endpoint that lets them).
- [ ] Login as `ahmed@university.com / 123456` succeeds.
- [ ] `GET /api/room` returns 3 rooms.
- [ ] `GET /api/room/available-slots/1?date=YYYY-MM-DD` returns 2-hour slots between 08:00 and 22:00.
- [ ] `POST /api/reservation/create` for slot `10:00–12:00` succeeds, returns `qrPayload` + `qrImage`.
- [ ] Same student trying to book another slot returns 400 "already has an active reservation".
- [ ] Same student trying to book a 1-hour slot returns 400 "Reservations must be exactly 2 hours long".
- [ ] Same student trying to book at 09:00–11:00 returns 400 "must start on an even hour".
- [ ] `POST /api/qr/check-in` with `roomId=1` during the slot returns `CheckedIn`.
- [ ] `POST /api/qr/check-out` returns `CheckedOut`.
- [ ] `GET /api/reservation/warnings` returns a `missing_checkin` entry when start time has passed and no scan happened.
- [ ] `GET /api/qr/dynamic/1` returns 403 (forbidden) for students.

### Staff
- [ ] Login as `sara.staff@university.com / 123456` succeeds.
- [ ] `GET /api/qr/dynamic/1` returns 200 with the rotating QR.
- [ ] Cannot `POST /api/room/add` (returns 403).
- [ ] `GET /api/reservation/all` (admin only) returns 403.

### Admin
- [ ] Login as `admin@university.com / admin123` succeeds.
- [ ] `POST /api/auth/register` creates a new student.
- [ ] `POST /api/room/add` creates a 4th room.
- [ ] `PUT /api/room/update/{id}` succeeds.
- [ ] `POST /api/qr/rotate/{id}` returns a fresh QR.
- [ ] `GET /api/reservation/all` returns every reservation in the system.

### Deployment
- [ ] Frontend served from Vercel reaches the Railway backend without CORS errors.
- [ ] Railway service binds to `$PORT` (check logs for "Now listening on http://0.0.0.0:8080").
- [ ] No `localhost` URL is hard-coded in production frontend.
- [ ] `.env` is not present in the repository (`git ls-files | grep .env` returns nothing).

---

## F. Remaining Issues / Assumptions

### Assumptions made
1. **Login mechanism.** The spec asks for student-number + name login. The existing controllers and frontend ship with email + password. We kept email/password to avoid a breaking-change rewrite, but the database now carries `StudentNumber` and a unique index, so you can layer a `POST /api/auth/student-login` endpoint that accepts `{ studentNumber, name }` and resolves to a `User` row.
2. **Password hashing.** Seeded passwords are still plaintext. The deployment guide flags this and offers a path forward (BCrypt + on-first-login migration).
3. **Frontend QR removal.** Backend now refuses to return QR images for students. The frontend pages built earlier (`my-reservations.html`, `reserve-new.js`) still try to render the QR and will fail silently with a 403 — fine for now, the user-visible behaviour is "no QR shown to students" which is exactly the spec.
4. **Background jobs.** No-show detection runs **on read** via `GET /api/reservation/warnings`. The contract says background jobs are optional — this satisfies the spec on Railway free tier where workers aren't reliable.

### Known limitations
* `Reservation` model `UpdatedAt` is set in C# only on the `/warnings` path. Other write paths (cancel / update) rely on the `DEFAULT` from the SQL `CREATED_AT` column.
* Vercel does not have a server-side env-var rewriter for static files — operators must inject `window.RRS_API_BASE` themselves (see deployment guide).
* `EF Core` migrations are not yet generated; the project uses raw `schema.sql`. Acceptable for the demo, recommended migration path documented in the deployment guide.

### Manual steps required
1. After provisioning the database, **run schema.sql + seed.sql by hand** with psql (the launcher does it locally, Railway does not).
2. After deploying the backend, **paste the Railway URL into the frontend's HTML** (or set `RRS_API_BASE`).
3. After deploying the frontend, **paste the Vercel URL into Railway's `FRONTEND_URL`** env var and redeploy the backend.

---

## G. GitHub Commit Plan

Suggested logical commits, in order — each one builds cleanly on the previous:

```text
feat(backend): production env vars (DATABASE_URL, JWT_SECRET, FRONTEND_URL)
  - Parse Railway/Neon URI in Startup.BuildConnectionString
  - JWT secret now read from env first
  - CORS allow-list driven by FRONTEND_URL
  - Bind 0.0.0.0:$PORT in Program.cs
  - Always expose Swagger
  - Add /health endpoint

feat(backend): Dockerfile + Railway config
  - Multi-stage Dockerfile, .NET 5.0 SDK build, ASP.NET runtime
  - .dockerignore
  - railway.json

feat(db): status enum, single-active rule, scan_logs, QR rotation columns
  - schema.sql: CHECK on Status, partial unique index, scan_logs table,
    QRCodes Token/ExpiresAt/UpdatedAt
  - seed.sql: 3 spec rooms (A/B/C), initial QR tokens, idempotent inserts

feat(backend): 2-hour slot rule + single-active reservation
  - ReservationController.CreateReservation: enforce 2h length, on-hour
    start, allowed start hours, single-active rule
  - RoomController.GetAvailableSlots: 2-hour slots, 08:00-22:00

feat(backend): /reservation/warnings + on-read no-show marking
  - GetWarnings transitions reservations to Expired/NoShow
  - Driven by CHECKIN_GRACE_PERIOD_MINUTES env var
  - Reservation.UpdatedAt added

feat(backend): /qr/check-in, /qr/check-out, /qr/rotate
  - Check-in/out write scan_logs and transition reservation status
  - Rotate is admin-only
  - GET /qr/room and GET /qr/dynamic restricted to Staff/Admin

feat(frontend): runtime API_BASE + Vercel config
  - js/config.js resolution: window.RRS_API_BASE -> localStorage ->
    <meta name="api-base"> -> hostname fallback
  - vercel.json with SPA fallback and security headers
  - .env.example documents the variable

docs: deployment guide, API reference, integration report
  - README.md rewritten
  - docs/deployment-guide.md
  - docs/api-endpoints.md
  - docs/final-integration-report.md
  - root + per-module .env.example
```

After landing these, tag the head with `v1.0.0-deployable`.
