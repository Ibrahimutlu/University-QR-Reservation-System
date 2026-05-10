-- =============================================================================
-- RoomLink — University QR Reservation System
-- PostgreSQL schema (Railway / Neon / local WSL compatible)
-- =============================================================================
-- This file is idempotent: running it again drops and recreates every table.
-- Use seed.sql to populate the seed data after this script.
-- =============================================================================

DROP TABLE IF EXISTS scan_logs    CASCADE;
DROP TABLE IF EXISTS qr_codes     CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS rooms        CASCADE;
DROP TABLE IF EXISTS users        CASCADE;

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
    "CreatedAt"       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt"       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    "QRCode"      TEXT,
    "CreatedAt"   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt"   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── reservations ────────────────────────────────────────────────────────────
-- Status values:
--   Pending     - created, not yet active
--   Confirmed   - legacy alias for active (kept for backward compatibility)
--   Active      - within booked window, not yet checked-in
--   CheckedIn   - student scanned the door QR successfully
--   CheckedOut  - student scanned out
--   Cancelled   - user or admin cancelled before start
--   Expired     - booking start passed without check-in (grace exhausted)
--   NoShow      - marked no-show by background validation
CREATE TABLE reservations (
    "ReservationID"    SERIAL PRIMARY KEY,
    "UserID"           INTEGER NOT NULL REFERENCES users("UserID") ON DELETE RESTRICT,
    "RoomID"           INTEGER NOT NULL REFERENCES rooms("RoomID") ON DELETE RESTRICT,
    "ReservationDate"  TIMESTAMP NOT NULL,
    "StartTime"        TIMESTAMP NOT NULL,
    "EndTime"          TIMESTAMP NOT NULL,
    "Status"           VARCHAR(20) NOT NULL DEFAULT 'Pending'
                        CHECK ("Status" IN (
                            'Pending', 'Confirmed', 'Active',
                            'CheckedIn', 'CheckedOut',
                            'Cancelled', 'Expired', 'NoShow'
                        )),
    "CreatedAt"        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt"        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "QRCodeData"       TEXT,
    CONSTRAINT chk_reservation_range CHECK ("EndTime" > "StartTime")
);

-- Hot path: overlap-detection per room/status/time-window.
CREATE INDEX idx_reservations_conflict_check
    ON reservations ("RoomID", "Status", "StartTime", "EndTime");

-- Spec rule: at most one active reservation per student.
CREATE UNIQUE INDEX idx_reservations_one_active_per_user
    ON reservations ("UserID")
    WHERE "Status" IN ('Pending', 'Confirmed', 'Active', 'CheckedIn');

-- ─── qr_codes ────────────────────────────────────────────────────────────────
-- Per-room rotating QR. Token + ExpiresAt let staff rotate the active code.
-- The legacy (QRCodeValue + IsActive) columns are kept so existing controllers
-- continue to work; new rotation logic populates Token/ExpiresAt as well.
CREATE TABLE qr_codes (
    "QRID"          SERIAL PRIMARY KEY,
    "RoomID"        INTEGER NOT NULL UNIQUE REFERENCES rooms("RoomID") ON DELETE CASCADE,
    "QRCodeValue"   TEXT NOT NULL,
    "Token"         TEXT,
    "ExpiresAt"     TIMESTAMP,
    "IsActive"      BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt"     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt"     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    "ScanTime"      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ScanType"      VARCHAR(20) NOT NULL
                     CHECK ("ScanType" IN ('CheckIn', 'CheckOut')),
    "AccessGranted" BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_scan_logs_reservation ON scan_logs ("ReservationID");
CREATE INDEX idx_scan_logs_user_time   ON scan_logs ("UserID", "ScanTime" DESC);
