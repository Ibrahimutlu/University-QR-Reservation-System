-- ============================================================================
-- Seed Data for QR Integrated University Reservation System
-- Matches Startup.cs seed data and test.js test data
-- ============================================================================

-- Users (from Startup.cs seed + Report 2 test scenarios)
INSERT INTO users ("UserID", "FirstName", "LastName", "Email", "Password", "Role", "StudentNumber")
VALUES
    (1, 'Ahmed', 'Ali', 'ahmed@university.com', '123456', 'Student', '20210001'),
    (2, 'Admin', 'User', 'admin@university.com', 'admin123', 'Admin', NULL),
    (3, 'Sara', 'Khan', 'sara@university.com', '654321', 'Student', '20210002'),
	(4, 'Sara', 'Mohamed', 'sara.staff@university.com', '123456', 'Staff', NULL)
ON CONFLICT ("UserID") DO NOTHING;

-- Rooms (from Startup.cs seed: Lab, Classroom, Meeting Room)
INSERT INTO rooms ("RoomID", "RoomName", "RoomType", "Capacity", "Location", "IsAvailable")
VALUES
    (1, 'Lab 101', 'Laboratory', 30, 'Building A', TRUE),
    (2, 'Classroom 201', 'Classroom', 50, 'Building B', TRUE),
    (3, 'Meeting Room A', 'Meeting Room', 1, 'Building C', TRUE)
ON CONFLICT ("RoomID") DO NOTHING;

INSERT INTO qr_codes ("RoomID", "QRCodeValue", "IsActive")
VALUES 
(1, 'ROOM-1-LAB101', TRUE),
(2, 'ROOM-2-CLASSROOM201', TRUE),
(3, 'ROOM-3-MEETINGROOMA', TRUE);

-- Reset sequences after explicit ID inserts
SELECT setval(pg_get_serial_sequence('users', 'UserID'), (SELECT MAX("UserID") FROM users));
SELECT setval(pg_get_serial_sequence('rooms', 'RoomID'), (SELECT MAX("RoomID") FROM rooms));
