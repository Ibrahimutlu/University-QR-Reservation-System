-- ============================================================================
-- QR Integrated University Reservation System
-- PostgreSQL Schema — serves both C# (EF Core) and Node.js layers
-- Derived from Report 2 Section 2: System Data Model + ROBA's C# Models
-- ============================================================================

-- Drop existing tables if re-initializing
DROP TABLE IF EXISTS scan_logs CASCADE;
DROP TABLE IF EXISTS qr_codes CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ─── Users ──────────────────────────────────────────────────────────────────
-- Maps to: Report 2 Entity "User" + ROBA's Models/User.cs
CREATE TABLE users (
    "UserID"          SERIAL PRIMARY KEY,
    "FirstName"       VARCHAR(255) NOT NULL,
    "LastName"        VARCHAR(255) NOT NULL,
    "Email"           VARCHAR(255) NOT NULL UNIQUE,
    "Password"        VARCHAR(255) NOT NULL,
    "Role"            VARCHAR(10)  NOT NULL CHECK ("Role" IN ('Student', 'Admin','Staff')),
    "StudentNumber"   VARCHAR(50)
);

-- ─── Rooms ──────────────────────────────────────────────────────────────────
-- Maps to: Report 2 Entity "Room" + ROBA's Models/Room.cs
CREATE TABLE rooms (
    "RoomID"      SERIAL PRIMARY KEY,
    "RoomName"    VARCHAR(255) NOT NULL,
    "RoomType"    VARCHAR(100) NOT NULL,
    "Capacity"    INTEGER NOT NULL DEFAULT 1,
    "Location"    VARCHAR(255) NOT NULL,
    "IsAvailable" BOOLEAN NOT NULL DEFAULT TRUE,
    "QRCode"      TEXT
);

-- ─── Reservations ───────────────────────────────────────────────────────────
-- Maps to: Report 2 Entity "Reservation" + ROBA's Models/Reservation.cs
-- Status values: Pending, Confirmed, Cancelled, CheckedIn, Expired
CREATE TABLE reservations (
    "ReservationID"   SERIAL PRIMARY KEY,
    "UserID"          INTEGER NOT NULL REFERENCES users("UserID") ON DELETE RESTRICT,
    "RoomID"          INTEGER NOT NULL REFERENCES rooms("RoomID") ON DELETE RESTRICT,
    "ReservationDate" TIMESTAMP NOT NULL,
    "StartTime"       TIMESTAMP NOT NULL,
    "EndTime"         TIMESTAMP NOT NULL,
    "Status"          VARCHAR(20) NOT NULL DEFAULT 'Pending',
    "CreatedAt"       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "QRCodeData"      TEXT
);

-- Index for overlap detection queries (Report 2 Section 3.3, Section 6 STEP 4)
CREATE INDEX idx_reservations_conflict_check
    ON reservations ("RoomID", "Status", "StartTime", "EndTime");

-- ─── QR Codes ───────────────────────────────────────────────────────────────
-- Maps to: Report 2 Entity "QR" + ROBA's Models/QR.cs
CREATE TABLE qr_codes (
    "QRID"          SERIAL PRIMARY KEY,
    "RoomID"        INTEGER NOT NULL UNIQUE REFERENCES rooms("RoomID") ON DELETE CASCADE,
    "QRCodeValue"   TEXT NOT NULL,
    "IsActive"      BOOLEAN NOT NULL DEFAULT TRUE
);

-- ─── Scan Logs ──────────────────────────────────────────────────────────────
-- Maps to: ScanLog model — stores history of every QR scan at room entry points
CREATE TABLE scan_logs (
    "ScanLogID"     SERIAL PRIMARY KEY,
    "UserID"        INTEGER NOT NULL REFERENCES users("UserID") ON DELETE RESTRICT,
    "RoomID"        INTEGER NOT NULL REFERENCES rooms("RoomID") ON DELETE RESTRICT,
    "ReservationID" INTEGER REFERENCES reservations("ReservationID") ON DELETE SET NULL,
    "ScanTime"      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ScanType"      VARCHAR(10) NOT NULL CHECK ("ScanType" IN ('CheckIn', 'CheckOut')),
    "AccessGranted" BOOLEAN NOT NULL DEFAULT FALSE
);