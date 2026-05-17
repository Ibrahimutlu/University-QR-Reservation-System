-- =============================================================================
-- RoomLink — University QR Reservation System
-- PostgreSQL schema (Railway / Neon / local WSL compatible)
-- =============================================================================
-- This file is idempotent: running it again drops and recreates every table.
-- Use seed.sql to populate the seed data after this script.
-- =============================================================================

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS scan_logs     CASCADE;
DROP TABLE IF EXISTS qr_codes      CASCADE;
DROP TABLE IF EXISTS reservations  CASCADE;
DROP TABLE IF EXISTS rooms         CASCADE;
DROP TABLE IF EXISTS users         CASCADE;

-- ─── users ───────────────────────────────────────────────────────────────────
CREATE TABLE users (
    "UserID"          SERIAL PRIMARY KEY,
    "FirstName"       VARCHAR(255) NOT NULL,
    "LastName"        VARCHAR(255) NOT NULL,
    "Email"           VARCHAR(255) NOT NULL UNIQUE,
    "Password"        VARCHAR(255) NOT NULL,
    "Role"            VARCHAR(10)  NOT NULL
                       CHECK ("Role" IN ('Student', 'Staff', 'Admin')),
    "StudentNumber"   VARCHAR(50),
    "CreatedAt"       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt"       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_studentnumber
    ON users ("StudentNumber")
    WHERE "StudentNumber" IS NOT NULL;

-- ─── rooms ───────────────────────────────────────────────────────────────────
CREATE TABLE rooms (
    "RoomID"      SERIAL PRIMARY KEY,
    "RoomName"    VARCHAR(255) NOT NULL,
    "RoomType"    VARCHAR(100) NOT NULL,
    "Capacity"    INTEGER NOT NULL DEFAULT 1 CHECK ("Capacity" >= 1),
    "Location"    VARCHAR(255) NOT NULL,
    "IsAvailable" BOOLEAN NOT NULL DEFAULT TRUE,
    "IsDemoRoom"  BOOLEAN NOT NULL DEFAULT FALSE,
    "QRCode"      TEXT,
    "CreatedAt"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── reservations ────────────────────────────────────────────────────────────
-- Status values:
--   Pending     - created, not yet active
--   Confirmed   - legacy alias for active (kept for backward compatibility)
--   Active      - within booked window, not yet checked-in
--   CheckedIn   - student scanned the door QR successfully
--   OnBreak     - student scanned BreakOut; slot held; expects BreakIn ≤ 15 min
--   CheckedOut  - student scanned out
--   Cancelled   - user or admin cancelled before start
--   Expired     - booking start passed without check-in (grace exhausted)
--   NoShow      - marked no-show by background validation
CREATE TABLE reservations (
    "ReservationID"    SERIAL PRIMARY KEY,
    "UserID"           INTEGER NOT NULL REFERENCES users("UserID") ON DELETE RESTRICT,
    "RoomID"           INTEGER NOT NULL REFERENCES rooms("RoomID") ON DELETE RESTRICT,
    "ReservationDate"  TIMESTAMPTZ NOT NULL,
    "StartTime"        TIMESTAMPTZ NOT NULL,
    "EndTime"          TIMESTAMPTZ NOT NULL,
    "Status"           VARCHAR(20) NOT NULL DEFAULT 'Pending'
                        CHECK ("Status" IN (
                            'Pending', 'Confirmed', 'Active',
                            'CheckedIn', 'OnBreak', 'CheckedOut',
                            'Cancelled', 'Expired', 'NoShow'
                        )),
    "CreatedAt"        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt"        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "QRCodeData"       TEXT,
    -- Denormalized flag copied from rooms.IsDemoRoom at insert time so the
    -- partial unique index below can exclude demo bookings (students may
    -- hold a demo-room reservation IN ADDITION to a standard study slot).
    "IsDemoReservation" BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_reservation_range CHECK ("EndTime" > "StartTime")
);

-- Hot path: overlap-detection per room/status/time-window.
CREATE INDEX idx_reservations_conflict_check
    ON reservations ("RoomID", "Status", "StartTime", "EndTime");

-- Spec rule: at most one active reservation per student.
-- Demo-room reservations are excluded so a student can hold a demo slot
-- in addition to their regular study slot.
CREATE UNIQUE INDEX idx_reservations_one_active_per_user
    ON reservations ("UserID")
    WHERE "Status" IN ('Pending', 'Confirmed', 'Active', 'CheckedIn', 'OnBreak')
      AND "IsDemoReservation" = FALSE;

-- ─── qr_codes ────────────────────────────────────────────────────────────────
-- Per-room rotating QR. Token + ExpiresAt let staff rotate the active code.
-- The legacy (QRCodeValue + IsActive) columns are kept so existing controllers
-- continue to work; new rotation logic populates Token/ExpiresAt as well.
CREATE TABLE qr_codes (
    "QRID"          SERIAL PRIMARY KEY,
    "RoomID"        INTEGER NOT NULL UNIQUE REFERENCES rooms("RoomID") ON DELETE CASCADE,
    "QRCodeValue"   TEXT NOT NULL,
    "Token"         TEXT,
    "ExpiresAt"     TIMESTAMPTZ,
    "IsActive"      BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt"     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt"     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_qr_codes_active_token
    ON qr_codes ("RoomID", "ExpiresAt")
    WHERE "IsActive" = TRUE;

-- ─── scan_logs ───────────────────────────────────────────────────────────────
-- Append-only audit table for every entry/exit attempt.
CREATE TABLE scan_logs (
    "ScanLogID"     SERIAL PRIMARY KEY,
    "UserID"        INTEGER NOT NULL REFERENCES users("UserID") ON DELETE RESTRICT,
    "RoomID"        INTEGER NOT NULL REFERENCES rooms("RoomID") ON DELETE RESTRICT,
    "ReservationID" INTEGER REFERENCES reservations("ReservationID") ON DELETE SET NULL,
    "ScanTime"      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ScanType"      VARCHAR(20) NOT NULL
                     CHECK ("ScanType" IN ('CheckIn', 'CheckOut', 'BreakOut', 'BreakIn')),
    "AccessGranted" BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_scan_logs_reservation ON scan_logs ("ReservationID");
CREATE INDEX idx_scan_logs_user_time   ON scan_logs ("UserID", "ScanTime" DESC);

-- ─── notifications ───────────────────────────────────────────────────────────
-- User-facing in-app notifications (overstay, no-exit, break overrun,
-- expired, no-show, info). Driven by the background ReservationSweepService
-- and by inline writes from the warnings / break-in endpoints.
-- Idempotency: callers are expected to dedupe on (UserID, ReservationID, Type).
CREATE TABLE notifications (
    "NotificationID" SERIAL PRIMARY KEY,
    "UserID"         INTEGER NOT NULL REFERENCES users("UserID") ON DELETE CASCADE,
    "ReservationID"  INTEGER REFERENCES reservations("ReservationID") ON DELETE SET NULL,
    "Type"           VARCHAR(30) NOT NULL
                      CHECK ("Type" IN (
                         'CheckInGraceWarning','Overstay','NoExit',
                         'BreakOverrun','Expired','NoShow','Info'
                      )),
    "Message"        TEXT NOT NULL,
    "Severity"       VARCHAR(10) NOT NULL DEFAULT 'warning'
                      CHECK ("Severity" IN ('info','warning','error')),
    "CreatedAt"      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ReadAt"         TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user_unread
    ON notifications ("UserID", "CreatedAt" DESC)
    WHERE "ReadAt" IS NULL;
