using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoomReservationSystem.Data;
using RoomReservationSystem.Models;
using RoomReservationSystem.Services;
using System;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;

namespace RoomReservationSystem.Controllers
{
    [ApiController]
    [Route("api/qr")]
    public class QRController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly QRService    _qrService;

        public QRController(AppDbContext context, QRService qrService)
        {
            _context   = context;
            _qrService = qrService;
        }

        // ──────────────────────────────────────────────────────────────────
        // Render the printable PNG of the room's door sticker QR.
        // SPEC RULE: Only staff/admin may VIEW QR codes.  Students scan via
        // /api/qr/scan and never see the actual code.
        // ──────────────────────────────────────────────────────────────────
        [HttpGet("room/{roomId}")]
        [Authorize(Roles = "Staff,Admin")]
        public IActionResult GetRoomQR(int roomId)
        {
            var room = _context.Rooms.FirstOrDefault(r => r.RoomID == roomId);
            if (room == null)
                return NotFound(new { message = "Room does not exist" });

            var qr = EnsureRoomQr(room);

            string image = null;
            try
            {
                image = _qrService.GenerateFromString(qr.QRCodeValue);
            }
            catch
            {
                // Keep endpoint functional even if renderer fails on host.
            }

            return Ok(new
            {
                roomID      = room.RoomID,
                roomName    = room.RoomName,
                roomType    = room.RoomType,
                location    = room.Location,
                qrCodeValue = qr.QRCodeValue,
                isActive    = qr.IsActive,
                qrImage     = image
            });
        }


        [HttpPost("create/{roomId}")]
        [Authorize(Roles = "Admin")]
        public IActionResult CreateRoomQR(int roomId)
        {
            var room = _context.Rooms.FirstOrDefault(r => r.RoomID == roomId);
            if (room == null)
                return NotFound(new { message = "Room does not exist" });

            var existingQR = _context.QRCodes.FirstOrDefault(q => q.RoomID == roomId);
            var qr = EnsureRoomQr(room);

            return Ok(new
            {
                message = existingQR == null
                    ? "QR code created successfully"
                    : "QR code already exists for this room",
                roomID = room.RoomID,
                roomName = room.RoomName,
                qrCodeValue = qr.QRCodeValue,
                isActive = qr.IsActive,
                qrImage = SafeGenerateQrImage(qr.QRCodeValue)
            });
        }

        // GET /api/qr/dynamic/{roomId}
        // Returns the current dynamic (rotating) QR code for a room.
        // SPEC RULE: only staff/admin may view active QR codes.
        [HttpGet("dynamic/{roomId}")]
        [Authorize(Roles = "Staff,Admin")]
        public IActionResult GetDynamicQR(int roomId)
        {
            var room = _context.Rooms.FirstOrDefault(r => r.RoomID == roomId);
            if (room == null)
                return NotFound(new { message = "Room does not exist" });

            EnsureRoomQr(room);

            string qrValue = _qrService.GenerateDynamicQRValue(roomId);
            string qrImage = SafeGenerateQrImage(qrValue);

            return Ok(new
            {
                roomID = room.RoomID,
                roomName = room.RoomName,
                qrValue = qrValue,
                qrImage = qrImage,
                validFor = "2 minutes",
                generatedAt = DateTime.UtcNow
            });
        }

        // GET /api/qr/validate-dynamic
        // Validates a dynamic QR code scanned by a student
        [HttpGet("validate-dynamic")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult ValidateDynamicQR([FromQuery] string qrValue, [FromQuery] int roomId)
        {
            if (string.IsNullOrEmpty(qrValue))
                return BadRequest(new { message = "Invalid QR code" });

            bool isValid = _qrService.ValidateDynamicQRValue(roomId, qrValue);
            if (!isValid)
                return BadRequest(new { message = "QR code is invalid or expired" });

            int userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier).Value);
            var now = DateTime.UtcNow;

            var reservation = _context.Reservations.FirstOrDefault(r =>
                r.RoomID == roomId &&
                r.UserID == userId &&
                r.Status == "Confirmed" &&
                r.StartTime <= now &&
                r.EndTime >= now);

            if (reservation == null)
                return BadRequest(new
                {
                    message = "Access denied",
                    reason = "No valid reservation found for this room at this time"
                });

            return Ok(new
            {
                message = "Access granted",
                roomID = roomId,
                userID = userId,
                reservationID = reservation.ReservationID
            });
        }

        // POST /api/qr/scan
        // Records a scan and checks if user has a valid reservation
        [HttpPost("scan")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult Scan([FromBody] ScanRequest request)
        {
            if (request == null)
                return BadRequest(new { message = "Invalid scan request" });

            var user = _context.Users.FirstOrDefault(u => u.UserID == request.UserID);
            if (user == null)
                return NotFound(new { message = "User not found" });

            var room = _context.Rooms.FirstOrDefault(r => r.RoomID == request.RoomID);
            if (room == null)
                return NotFound(new { message = "Room not found" });

            var now = request.ScanTime;

            // Check if user has a valid reservation for this room at scan time
            var reservation = _context.Reservations.FirstOrDefault(r =>
                r.RoomID == request.RoomID &&
                r.UserID == request.UserID &&
                r.Status == "Confirmed" &&
                r.StartTime <= now &&
                r.EndTime >= now);

            bool accessGranted = reservation != null;

            // Save scan log to database
            var scanLog = new ScanLog
            {
                UserID = request.UserID,
                RoomID = request.RoomID,
                ReservationID = reservation?.ReservationID,
                ScanTime = request.ScanTime,
                ScanType = request.ScanType ?? "CheckIn",
                AccessGranted = accessGranted
            };

            _context.ScanLogs.Add(scanLog);
            _context.SaveChanges();

            if (!accessGranted)
                return BadRequest(new
                {
                    message = "Access denied",
                    reason = "No valid reservation found for this room at this time",
                    scanLogID = scanLog.ScanLogID
                });

            return Ok(new
            {
                message = "Access granted",
                roomID = request.RoomID,
                roomName = room.RoomName,
                userID = request.UserID,
                reservationID = reservation.ReservationID,
                scanType = request.ScanType,
                scanLogID = scanLog.ScanLogID
            });
        }
        // ──────────────────────────────────────────────────────────────────
        // Validate a ROOM-LEVEL QR (the static sticker on the door).
        // The caller is authenticated; the userId is taken from the JWT.
        // ──────────────────────────────────────────────────────────────────
        [HttpGet("validate")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult ValidateRoomQR([FromQuery] string qrCodeValue)
        {
            if (string.IsNullOrEmpty(qrCodeValue))
                return BadRequest(new { message = "Invalid QR code" });

            var qr = _context.QRCodes.FirstOrDefault(q =>
                q.QRCodeValue == qrCodeValue &&
                q.IsActive == true);

            if (qr == null)
                return NotFound(new { message = "QR code not found or inactive" });

            int userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);
            var now    = DateTime.UtcNow;

            var reservation = _context.Reservations.FirstOrDefault(r =>
                r.RoomID    == qr.RoomID &&
                r.UserID    == userId &&
                r.Status    == "Confirmed" &&
                r.StartTime <= now &&
                r.EndTime   >= now);

            if (reservation == null)
                return BadRequest(new
                {
                    message = "Access denied",
                    reason  = "No valid reservation found for this room at this time"
                });

            return Ok(new
            {
                message       = "Access granted",
                roomID        = qr.RoomID,
                userID        = userId,
                reservationID = reservation.ReservationID
            });
        }

        // ──────────────────────────────────────────────────────────────────
        // Validate a RESERVATION-LEVEL QR — the JSON payload that was
        // embedded in the per-booking QR returned to the user at create time.
        // Use this when a scanner reads a student's phone screen.
        // ──────────────────────────────────────────────────────────────────
        [HttpPost("validate-reservation")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult ValidateReservationQR([FromBody] ReservationQRPayload body)
        {
            if (body == null || string.IsNullOrEmpty(body.Payload))
                return BadRequest(new { message = "Missing QR payload" });

            ReservationQRDecoded decoded;
            try
            {
                decoded = JsonSerializer.Deserialize<ReservationQRDecoded>(body.Payload);
            }
            catch
            {
                return BadRequest(new { message = "QR payload is not valid JSON" });
            }

            if (decoded == null || decoded.Type != "reservation")
                return BadRequest(new { message = "QR is not a reservation token" });

            var reservation = _context.Reservations.FirstOrDefault(r =>
                r.ReservationID == decoded.ReservationId);

            if (reservation == null)
                return NotFound(new { message = "Reservation referenced by QR not found" });

            if (reservation.Status != "Confirmed")
                return BadRequest(new
                {
                    message = "Access denied",
                    reason  = "Reservation is not in 'Confirmed' state"
                });

            var now = DateTime.UtcNow;
            if (now < reservation.StartTime || now > reservation.EndTime)
                return BadRequest(new
                {
                    message = "Access denied",
                    reason  = "QR is outside its validity window"
                });

            return Ok(new
            {
                message       = "Access granted",
                reservationID = reservation.ReservationID,
                roomID        = reservation.RoomID,
                userID        = reservation.UserID,
                validUntil    = reservation.EndTime
            });
        }

        // ──────────────────────────────────────────────────────────────────
        // POST /api/qr/check-in
        //   Body: { qrValue, roomId }
        //   Auth: Student / Staff / Admin (caller's identity from JWT)
        //
        //   Validates the rotating QR token and the caller's reservation,
        //   then transitions the reservation to "CheckedIn" and writes a
        //   scan_log row.  Idempotent: a second check-in is rejected.
        // ──────────────────────────────────────────────────────────────────
        [HttpPost("check-in")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult CheckIn([FromBody] CheckInRequest body)
        {
            if (body == null || body.RoomId <= 0)
                return BadRequest(new { message = "RoomId is required" });

            int userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);
            var now = DateTime.UtcNow;
            int? scanLogId = null;

            // Validate QR token if provided.  Accept both static QRCodeValue
            // and rotating dynamic tokens.
            if (!string.IsNullOrEmpty(body.QrValue))
            {
                bool dynamicOk = _qrService.ValidateDynamicQRValue(body.RoomId, body.QrValue);
                bool staticOk = _context.QRCodes.Any(q =>
                    q.RoomID == body.RoomId &&
                    q.QRCodeValue == body.QrValue &&
                    q.IsActive);
                if (!dynamicOk && !staticOk)
                {
                    scanLogId = RecordScanAttempt(userId, body.RoomId, null, "CheckIn", false, now);
                    return BadRequest(new
                    {
                        message = "QR code is invalid or expired",
                        scanLogID = scanLogId
                    });
                }
            }

            var reservation = _context.Reservations.FirstOrDefault(r =>
                r.RoomID == body.RoomId &&
                r.UserID == userId &&
                (r.Status == "Confirmed" || r.Status == "Active") &&
                r.StartTime <= now &&
                r.EndTime >= now);

            if (reservation == null)
            {
                scanLogId = RecordScanAttempt(userId, body.RoomId, null, "CheckIn", false, now);
                return BadRequest(new
                {
                    message = "Access denied",
                    reason = "No valid reservation for this room at this time",
                    scanLogID = scanLogId
                });
            }

            reservation.Status = "CheckedIn";
            reservation.UpdatedAt = now;

            var scanLog = BuildScanLog(userId, body.RoomId, reservation.ReservationID, "CheckIn", true, now);
            _context.ScanLogs.Add(scanLog);
            _context.SaveChanges();

            return Ok(new
            {
                message = "Checked in",
                reservationID = reservation.ReservationID,
                scanLogID = scanLog.ScanLogID,
                status = reservation.Status,
                validUntil = reservation.EndTime
            });
        }

        // ──────────────────────────────────────────────────────────────────
        // POST /api/qr/check-out
        //   Body: { qrValue, roomId }
        //   Transitions a CheckedIn reservation to CheckedOut and writes a
        //   scan_log row.
        // ──────────────────────────────────────────────────────────────────
        [HttpPost("check-out")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult CheckOut([FromBody] CheckInRequest body)
        {
            if (body == null || body.RoomId <= 0)
                return BadRequest(new { message = "RoomId is required" });

            int userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);
            var now = DateTime.UtcNow;
            int? scanLogId = null;

            if (!string.IsNullOrEmpty(body.QrValue))
            {
                bool dynamicOk = _qrService.ValidateDynamicQRValue(body.RoomId, body.QrValue);
                bool staticOk = _context.QRCodes.Any(q =>
                    q.RoomID == body.RoomId &&
                    q.QRCodeValue == body.QrValue &&
                    q.IsActive);
                if (!dynamicOk && !staticOk)
                {
                    scanLogId = RecordScanAttempt(userId, body.RoomId, null, "CheckOut", false, now);
                    return BadRequest(new
                    {
                        message = "QR code is invalid or expired",
                        scanLogID = scanLogId
                    });
                }
            }

            var reservation = _context.Reservations.FirstOrDefault(r =>
                r.RoomID == body.RoomId &&
                r.UserID == userId &&
                r.Status == "CheckedIn");

            if (reservation == null)
            {
                scanLogId = RecordScanAttempt(userId, body.RoomId, null, "CheckOut", false, now);
                return BadRequest(new
                {
                    message = "Cannot check out",
                    reason = "No active check-in for this room",
                    scanLogID = scanLogId
                });
            }

            reservation.Status = "CheckedOut";
            reservation.UpdatedAt = now;

            var scanLog = BuildScanLog(userId, body.RoomId, reservation.ReservationID, "CheckOut", true, now);
            _context.ScanLogs.Add(scanLog);
            Services.NotificationService.Fire(
                _context, userId, reservation.ReservationID,
                Services.NotificationService.Types.ReservationEnded,
                "Çıkış taramanız alındı. Rezervasyonunuz başarıyla kapatıldı.",
                Services.NotificationService.Severity.Info,
                save: false);
            _context.SaveChanges();

            return Ok(new
            {
                message = "Checked out",
                reservationID = reservation.ReservationID,
                scanLogID = scanLog.ScanLogID,
                status = reservation.Status
            });
        }

        // ──────────────────────────────────────────────────────────────────
        // POST /api/qr/break-out
        //   Body: { qrValue, roomId }
        //   Transitions a CheckedIn reservation to OnBreak. Writes a
        //   BreakOut scan log. The slot is held; the student is expected
        //   to scan back in within BREAK_DURATION_MINUTES (default 15).
        // ──────────────────────────────────────────────────────────────────
        [HttpPost("break-out")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult BreakOut([FromBody] CheckInRequest body)
        {
            if (body == null || body.RoomId <= 0)
                return BadRequest(new { message = "RoomId is required" });

            int userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);
            var now = DateTime.UtcNow;
            int? scanLogId = null;

            if (!string.IsNullOrEmpty(body.QrValue))
            {
                bool dynamicOk = _qrService.ValidateDynamicQRValue(body.RoomId, body.QrValue);
                bool staticOk = _context.QRCodes.Any(q =>
                    q.RoomID == body.RoomId &&
                    q.QRCodeValue == body.QrValue &&
                    q.IsActive);
                if (!dynamicOk && !staticOk)
                {
                    scanLogId = RecordScanAttempt(userId, body.RoomId, null, "BreakOut", false, now);
                    return BadRequest(new
                    {
                        message = "QR code is invalid or expired",
                        scanLogID = scanLogId
                    });
                }
            }

            var reservation = _context.Reservations.FirstOrDefault(r =>
                r.RoomID == body.RoomId &&
                r.UserID == userId &&
                r.Status == "CheckedIn");

            if (reservation == null)
            {
                scanLogId = RecordScanAttempt(userId, body.RoomId, null, "BreakOut", false, now);
                return BadRequest(new
                {
                    message = "Cannot start break",
                    reason = "You must be checked in to start a break",
                    scanLogID = scanLogId
                });
            }

            reservation.Status = "OnBreak";
            reservation.UpdatedAt = now;

            var scanLog = BuildScanLog(userId, body.RoomId, reservation.ReservationID, "BreakOut", true, now);
            _context.ScanLogs.Add(scanLog);

            int breakLimit = ParseEnvIntOrDefault("BREAK_DURATION_MINUTES", 15);
            Services.NotificationService.Fire(
                _context, userId, reservation.ReservationID,
                Services.NotificationService.Types.BreakStarted,
                $"Molanız başladı. {breakLimit} dakika içinde geri dönüp tekrar QR taratın.",
                Services.NotificationService.Severity.Info,
                save: false);
            _context.SaveChanges();

            return Ok(new
            {
                message = "Break started",
                reservationID = reservation.ReservationID,
                scanLogID = scanLog.ScanLogID,
                status = reservation.Status,
                breakLimitMinutes = breakLimit,
                breakStartedAt = now
            });
        }

        // ──────────────────────────────────────────────────────────────────
        // POST /api/qr/break-in
        //   Body: { qrValue, roomId }
        //   Transitions an OnBreak reservation back to CheckedIn. Writes a
        //   BreakIn scan log. If the break exceeded BREAK_DURATION_MINUTES
        //   the response carries a breakOverrun flag (Phase 3 will fire a
        //   notification in addition to the flag).
        // ──────────────────────────────────────────────────────────────────
        [HttpPost("break-in")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult BreakIn([FromBody] CheckInRequest body)
        {
            if (body == null || body.RoomId <= 0)
                return BadRequest(new { message = "RoomId is required" });

            int userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);
            var now = DateTime.UtcNow;
            int? scanLogId = null;

            if (!string.IsNullOrEmpty(body.QrValue))
            {
                bool dynamicOk = _qrService.ValidateDynamicQRValue(body.RoomId, body.QrValue);
                bool staticOk = _context.QRCodes.Any(q =>
                    q.RoomID == body.RoomId &&
                    q.QRCodeValue == body.QrValue &&
                    q.IsActive);
                if (!dynamicOk && !staticOk)
                {
                    scanLogId = RecordScanAttempt(userId, body.RoomId, null, "BreakIn", false, now);
                    return BadRequest(new
                    {
                        message = "QR code is invalid or expired",
                        scanLogID = scanLogId
                    });
                }
            }

            var reservation = _context.Reservations.FirstOrDefault(r =>
                r.RoomID == body.RoomId &&
                r.UserID == userId &&
                r.Status == "OnBreak");

            if (reservation == null)
            {
                scanLogId = RecordScanAttempt(userId, body.RoomId, null, "BreakIn", false, now);
                return BadRequest(new
                {
                    message = "Cannot end break",
                    reason = "No active break in progress for this room",
                    scanLogID = scanLogId
                });
            }

            int breakLimit = ParseEnvIntOrDefault("BREAK_DURATION_MINUTES", 15);
            var latestBreakOut = _context.ScanLogs
                .Where(s => s.ReservationID == reservation.ReservationID &&
                            s.ScanType == "BreakOut" &&
                            s.AccessGranted)
                .OrderByDescending(s => s.ScanTime)
                .Select(s => (DateTime?)s.ScanTime)
                .FirstOrDefault();

            double breakMinutes = latestBreakOut.HasValue
                ? (now - latestBreakOut.Value).TotalMinutes
                : 0;
            bool overrun = breakMinutes > breakLimit;

            reservation.Status = "CheckedIn";
            reservation.UpdatedAt = now;

            var scanLog = BuildScanLog(userId, body.RoomId, reservation.ReservationID, "BreakIn", true, now);
            _context.ScanLogs.Add(scanLog);

            if (overrun)
            {
                Services.NotificationService.Fire(
                    _context, userId, reservation.ReservationID,
                    Services.NotificationService.Types.BreakOverrun,
                    $"Mola süreniz {breakLimit} dakikayı aştı (yaklaşık {Math.Round(breakMinutes,1)} dk). " +
                    "Bir sonraki molanızda süre limitine dikkat edin.",
                    Services.NotificationService.Severity.Warning,
                    save: false);
            }
            else
            {
                Services.NotificationService.Fire(
                    _context, userId, reservation.ReservationID,
                    Services.NotificationService.Types.BreakEnded,
                    $"Molanız sona erdi ({Math.Round(breakMinutes, 1)} dk). Rezervasyonunuz devam ediyor.",
                    Services.NotificationService.Severity.Info,
                    save: false);
            }

            _context.SaveChanges();

            return Ok(new
            {
                message = overrun ? "Break ended (limit exceeded)" : "Break ended",
                reservationID = reservation.ReservationID,
                scanLogID = scanLog.ScanLogID,
                status = reservation.Status,
                breakDurationMinutes = Math.Round(breakMinutes, 1),
                breakLimitMinutes = breakLimit,
                breakOverrun = overrun
            });
        }

        private static int ParseEnvIntOrDefault(string name, int fallback)
        {
            var raw = System.Environment.GetEnvironmentVariable(name);
            if (int.TryParse(raw, out var n) && n > 0) return n;
            return fallback;
        }

        // ──────────────────────────────────────────────────────────────────
        // POST /api/qr/rotate/{roomId}
        //   Force-rotate the active QR token for a room (admin only).
        // ──────────────────────────────────────────────────────────────────
        [HttpPost("rotate/{roomId}")]
        [Authorize(Roles = "Admin")]
        public IActionResult RotateRoomQR(int roomId)
        {
            var room = _context.Rooms.FirstOrDefault(r => r.RoomID == roomId);
            if (room == null)
                return NotFound(new { message = "Room does not exist" });

            EnsureRoomQr(room);

            // Trigger a fresh dynamic value via QRService.  The static value
            // is preserved for legacy door stickers.
            string fresh = _qrService.GenerateDynamicQRValue(roomId);
            return Ok(new
            {
                message = "QR rotated",
                roomID = roomId,
                qrValue = fresh,
                qrImage = SafeGenerateQrImage(fresh),
                rotatedAt = DateTime.UtcNow
            });
        }

        // ──────────────────────────────────────────────────────────────────
        // GET /api/qr/health/{roomId}
        //   Diagnostic endpoint — returns the server's view of the current
        //   rotating QR for a room, the rotation interval, the acceptance
        //   tolerance, and the server's UTC clock. Used by qr-monitor.html
        //   to detect client/server clock drift, and by the smoke-test
        //   script before demos.
        // ──────────────────────────────────────────────────────────────────
        [HttpGet("health/{roomId}")]
        [Authorize(Roles = "Staff,Admin")]
        public IActionResult GetQRHealth(int roomId)
        {
            var room = _context.Rooms.FirstOrDefault(r => r.RoomID == roomId);
            if (room == null)
                return NotFound(new { message = "Room does not exist" });

            var health = _qrService.GetDynamicQRHealth(roomId);
            return Ok(new
            {
                roomID                  = room.RoomID,
                roomName                = room.RoomName,
                serverUtcNow            = health.ServerUtcNow,
                currentBucketStart      = health.CurrentBucketStart,
                nextRotationAt          = health.NextRotationAt,
                nextRotationInSeconds   = health.NextRotationInSeconds,
                rotationIntervalMinutes = health.RotationIntervalMinutes,
                acceptanceWindowCount   = health.AcceptanceWindowCount,
                acceptanceToleranceMin  = health.AcceptanceToleranceMin,
                currentQRValue          = health.CurrentQRValue
            });
        }

        private string SafeGenerateQrImage(string rawValue)
        {
            try
            {
                return _qrService.GenerateFromString(rawValue);
            }
            catch
            {
                return null;
            }
        }

        private RoomReservationSystem.Models.QR EnsureRoomQr(Room room)
        {
            var existing = _context.QRCodes.FirstOrDefault(q => q.RoomID == room.RoomID);
            if (existing != null)
                return existing;

            var qrCodeValue = BuildRoomQrCodeValue(room);
            var qr = new RoomReservationSystem.Models.QR
            {
                RoomID = room.RoomID,
                QRCodeValue = qrCodeValue,
                IsActive = true
            };

            room.QRCode = qrCodeValue;
            _context.QRCodes.Add(qr);
            _context.SaveChanges();

            return qr;
        }

        private static string BuildRoomQrCodeValue(Room room)
        {
            var safeRoomName = new string((room.RoomName ?? "ROOM")
                .Where(char.IsLetterOrDigit)
                .ToArray())
                .ToUpperInvariant();

            if (string.IsNullOrWhiteSpace(safeRoomName))
                safeRoomName = "ROOM";

            return $"ROOM-{room.RoomID}-{safeRoomName}";
        }

        private ScanLog BuildScanLog(
            int userId,
            int roomId,
            int? reservationId,
            string scanType,
            bool accessGranted,
            DateTime scanTime)
        {
            return new ScanLog
            {
                UserID = userId,
                RoomID = roomId,
                ReservationID = reservationId,
                ScanTime = scanTime,
                ScanType = scanType,
                AccessGranted = accessGranted
            };
        }

        private int? RecordScanAttempt(
            int userId,
            int roomId,
            int? reservationId,
            string scanType,
            bool accessGranted,
            DateTime scanTime)
        {
            var roomExists = _context.Rooms.Any(r => r.RoomID == roomId);
            if (!roomExists)
                return null;

            var scanLog = BuildScanLog(userId, roomId, reservationId, scanType, accessGranted, scanTime);
            _context.ScanLogs.Add(scanLog);
            _context.SaveChanges();
            return scanLog.ScanLogID;
        }

        public class CheckInRequest
        {
            public int RoomId { get; set; }
            public string QrValue { get; set; }
        }

        public class ReservationQRPayload
        {
            public string Payload { get; set; }
        }

        public class ReservationQRDecoded
        {
            public string   Type          { get; set; }
            public int      ReservationId { get; set; }
            public int      RoomId        { get; set; }
            public int      UserId        { get; set; }
            public DateTime ValidFrom     { get; set; }
            public DateTime ValidUntil    { get; set; }
            public DateTime IssuedAt      { get; set; }
        }
    }
}
