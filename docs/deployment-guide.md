# Deployment Guide

Complete step-by-step instructions for getting RoomLink running online.

> Target architecture:
> * **Backend** on Railway (containers, Dockerfile-based)
> * **Database** on Railway PostgreSQL or Neon PostgreSQL
> * **Frontend** on Vercel (static files)
> * Source on GitHub

The same repository works for both local development and production — only environment variables differ.

---

## 1. Provision the database

### Option A — Railway PostgreSQL (one-click)

1. Open <https://railway.app/> and create a new project from your GitHub repository.
2. Click **+ New** → **Database** → **PostgreSQL**.
3. Once it provisions, open the database service → **Variables** tab.
4. Copy the `DATABASE_URL` value. It looks like:
   ```
   postgres://postgres:abc123@containers-us-west-X.railway.app:6543/railway
   ```

### Option B — Neon (free serverless Postgres)

1. Sign up at <https://neon.tech/>.
2. Create a new project, choose region closest to your Railway region.
3. Open the dashboard → **Connection Details** → copy the connection string in **psql** form. Looks like:
   ```
   postgresql://user:pw@ep-XXXX.us-east-2.aws.neon.tech/dbname?sslmode=require
   ```

### Apply schema + seed (either provider)

From any machine with `psql` installed:

```bash
psql "$DATABASE_URL" -f database/schema.sql
psql "$DATABASE_URL" -f database/seed.sql
```

Verify:

```bash
psql "$DATABASE_URL" -c 'SELECT "RoomID","RoomName" FROM rooms;'
```

You should see Room A, Room B, Room C.

---

## 2. Deploy the backend to Railway

1. Inside the Railway project, click **+ New** → **GitHub Repo** → pick this repo.
2. Set the **Root Directory** to `backend` in the service settings.
3. Railway auto-detects the `Dockerfile`. Build will take ~2 min the first time.
4. Open the service → **Variables** tab and add:

| Variable                       | Required | Example value                                            |
|--------------------------------|----------|----------------------------------------------------------|
| `DATABASE_URL`                 | Yes      | (paste from step 1)                                      |
| `JWT_SECRET`                   | Yes      | a 64-char random string (openssl rand -hex 32)           |
| `FRONTEND_URL`                 | Yes      | `https://your-frontend.vercel.app`                       |
| `QR_ROTATION_INTERVAL_MINUTES` | No       | `2`                                                      |
| `CHECKIN_GRACE_PERIOD_MINUTES` | No       | `15`                                                     |
| `FORCE_HTTPS`                  | No       | leave blank — Railway terminates TLS upstream            |
| `ASPNETCORE_ENVIRONMENT`       | No       | `Production` (default in Dockerfile)                     |

> `PORT` is auto-injected by Railway. The container's `Program.cs` binds to `0.0.0.0:$PORT` automatically.

5. Click **Deploy**. After ~30 seconds the service will be live at:
   ```
   https://<service-name>.up.railway.app
   ```
6. Open `https://.../swagger` to verify the API.
7. Test login:
   ```bash
   curl -X POST https://university-qr-reservation-system-production.up.railway.app/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@university.com","password":"admin123"}'
   ```

---

## 3. Deploy the frontend to Vercel

1. Open <https://vercel.com/> and import the same GitHub repo.
2. **Root Directory** → set to `frontend`.
3. **Framework Preset** → "Other" (no build step).
4. **Build Command** → leave empty.
5. **Output Directory** → leave empty.
6. Click **Deploy**.

The site goes live at `https://<project-name>.vercel.app`.

### Wire the frontend to the backend

There are three equally-valid ways. **Pick one.**

**(a) Hard-code at deploy time** — open `frontend/index.html` (and any other entry HTMLs) and add this line **before** `<script src="js/config.js">`:

```html
<script>window.RRS_API_BASE = "https://university-qr-reservation-system-production.up.railway.app";</script>
```

**(b) Per-page `<meta>` tag** — drop into the `<head>` of every HTML page:

```html
<meta name="api-base" content="https://university-qr-reservation-system-production.up.railway.app">
```

**(c) Env-var-injected file** — add a `frontend/config.production.js` that emits `window.RRS_API_BASE`, and reference it from the HTML `<head>` only when `ASPNETCORE_ENVIRONMENT=Production`. Useful if you switch to Vite or Next later.

After redeploying Vercel, open the site and sign in.

---

## 4. Update Railway CORS

After Vercel gives you the production URL, copy it back to Railway → backend service → variables → set `FRONTEND_URL` to that URL (multiple URLs comma-separated). Redeploy.

---

## 5. Required environment variables — summary

### Backend (Railway)

| Variable                          | Purpose                                                 |
|-----------------------------------|---------------------------------------------------------|
| `DATABASE_URL`                    | Postgres connection URI (Railway / Neon)                |
| `JWT_SECRET`                      | Token signing key (≥32 chars in prod)                  |
| `FRONTEND_URL`                    | CORS allow-list, comma-separated                        |
| `PORT`                            | Provided by Railway                                     |
| `ASPNETCORE_ENVIRONMENT`          | `Production`                                            |
| `QR_ROTATION_INTERVAL_MINUTES`    | Optional, default 2                                     |
| `CHECKIN_GRACE_PERIOD_MINUTES`    | Optional, default 15                                    |
| `FORCE_HTTPS`                     | Optional, set `true` to keep HTTPS redirect             |

### Frontend (Vercel)

The static frontend doesn't strictly need env vars — `js/config.js` resolves `API_BASE` from `window.RRS_API_BASE` or the meta tag. If you migrate to Vite/Next later, mirror the same value as `VITE_API_BASE_URL` or `NEXT_PUBLIC_API_BASE_URL`.

---

## 6. CORS troubleshooting

If the browser console shows `CORS error: blocked by Access-Control-Allow-Origin`:

1. Confirm the **exact** URL in `FRONTEND_URL` (including protocol, no trailing slash).
2. After updating Railway env vars, click **Redeploy** so the new value takes effect.
3. Inspect the actual response headers:
   ```bash
   curl -I -H "Origin: https://your-frontend.vercel.app" \
        https://university-qr-reservation-system-production.up.railway.app/api/room
   ```
   Look for `Access-Control-Allow-Origin: https://your-frontend.vercel.app`.

---

## 7. Database migration (optional)

The repo currently uses raw SQL (`schema.sql` + `seed.sql`) — that's enough for a coursework demo. To switch to EF Core migrations later:

```bash
cd backend/RoomReservationSystem
dotnet ef migrations add InitialCreate
dotnet ef database update --connection "$DATABASE_URL"
```

Add `Microsoft.EntityFrameworkCore.Design` to the csproj first if missing.

---

## 8. Smoke test the full pipeline

After deployment, run these from any machine:

```bash
# 1. Backend is live
curl https://university-qr-reservation-system-production.up.railway.app/health

# 2. Login as admin
TOKEN=$(curl -sX POST https://university-qr-reservation-system-production.up.railway.app/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@university.com","password":"admin123"}' \
        | jq -r .token)

# 3. List rooms (should return 3)
curl -s https://university-qr-reservation-system-production.up.railway.app/api/room \
     -H "Authorization: Bearer $TOKEN" | jq length

# 4. Frontend serves
curl -I https://your-frontend.vercel.app
```

If all four return what you expect, deployment is complete.

---

## 9. Rotating secrets

Once the system is live, rotate `JWT_SECRET` periodically. Rotating invalidates all existing tokens — so plan a maintenance window or do it during low usage.

```bash
# Generate a fresh secret
openssl rand -hex 32
# Update Railway variables, click Redeploy, every user has to log in again.
```

---

## 10. Troubleshooting cheat sheet

| Symptom                                 | Likely fix                                                                                                                  |
|-----------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|
| `connection refused` from Railway logs  | `DATABASE_URL` mistyped or DB plugin not yet ready. Open the DB service's logs.                                            |
| `column does not exist`                 | `schema.sql` was not applied to the production DB. Re-run it via psql.                                                      |
| `401 Unauthorized` on every call        | Frontend is using the dev JWT secret. Make sure `RRS_API_BASE` points to the prod backend, then re-login.                  |
| CORS-blocked on Vercel                  | `FRONTEND_URL` does not match the actual Vercel URL. Update Railway env, redeploy.                                          |
| Build fails on Railway with `nuget`     | `global.json` may be too restrictive. Bump `rollForward` to `latestFeature` (already set in this repo).                     |
| Frontend shows blank page on `/foo`     | Vercel needs a SPA fallback. Add a `vercel.json` rewrite from `/(.*)` to `/index.html` (already provided in this repo).     |
| QR camera doesn't open over HTTPS       | Camera APIs require HTTPS or `localhost`. After Vercel deploy this should "just work" — confirm via DevTools console.       |
