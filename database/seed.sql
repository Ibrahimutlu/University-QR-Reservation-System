-- =============================================================================
-- RoomLink seed data
-- Apply AFTER schema.sql.
-- Idempotent: ON CONFLICT DO NOTHING for every insert.
-- =============================================================================

-- ─── Users ───────────────────────────────────────────────────────────────────
-- Spec: students authenticate with student number + name. The Password column
-- still stores something so the legacy email-login still works for staff/admin.
INSERT INTO users ("UserID", "FirstName", "LastName", "Email", "Password", "Role", "StudentNumber")
VALUES
    (1, 'Ahmed',  'Ali',     'ahmed@university.com',       '123456',   'Student', '20210001'),
    (2, 'Admin',  'User',    'admin@university.com',       'admin123', 'Admin',   NULL),
    (3, 'Sara',   'Khan',    'sara@university.com',        '654321',   'Student', '20210002'),
    (4, 'Sara',   'Mohamed', 'sara.staff@university.com',  '123456',   'Staff',   NULL)
ON CONFLICT ("UserID") DO NOTHING;

-- ─── Rooms ───────────────────────────────────────────────────────────────────
-- Spec: 3 rooms (A/B/C) reservable in 2-hour slots.
-- Capacity 1 means one booking per slot (the simplest model for the demo).
INSERT INTO rooms ("RoomID", "RoomName", "RoomType",   "Capacity", "Location",   "IsAvailable")
VALUES
    (1, 'Room A', 'Study Room', 1, 'Building 1, Floor 1', TRUE),
    (2, 'Room B', 'Study Room', 1, 'Building 1, Floor 2', TRUE),
    (3, 'Room C', 'Study Room', 1, 'Building 2, Floor 1', TRUE)
ON CONFLICT ("RoomID") DO NOTHING;

-- ─── QR codes ────────────────────────────────────────────────────────────────
-- Initial token; controllers will rotate Token / ExpiresAt as needed.
INSERT INTO qr_codes ("RoomID", "QRCodeValue", "Token", "ExpiresAt", "IsActive")
VALUES
    (1, 'ROOM-1-A', 'ROOM-1-A-INIT', CURRENT_TIMESTAMP + INTERVAL '2 minutes', TRUE),
    (2, 'ROOM-2-B', 'ROOM-2-B-INIT', CURRENT_TIMESTAMP + INTERVAL '2 minutes', TRUE),
    (3, 'ROOM-3-C', 'ROOM-3-C-INIT', CURRENT_TIMESTAMP + INTERVAL '2 minutes', TRUE)
ON CONFLICT ("RoomID") DO NOTHING;

-- ─── Sequences ───────────────────────────────────────────────────────────────
SELECT setval(pg_get_serial_sequence('users', 'UserID'),
              (SELECT MAX("UserID") FROM users));
SELECT setval(pg_get_serial_sequence('rooms', 'RoomID'),
              (SELECT MAX("RoomID") FROM rooms));
