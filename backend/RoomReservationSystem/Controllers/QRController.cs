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

            var qr = _context.QRCodes.FirstOrDefault(q => q.RoomID == roomId);
            if (qr == null)
                return NotFound(new { message = "No QR code is attached to this room" });

            string image = _qrService.GenerateFromString(qr.QRCodeValue);

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
            if (existingQR != null)
                return Ok(new
                {
                    message = "QR code already exists for this room",
                    roomID = room.RoomID,
                    roomName = room.RoomName,
                    qrCodeValue = existingQR.QRCodeValue,
                    isActive = existingQR.IsActive,
                    qrImage = _qrService.GenerateFromString(existingQR.QRCodeValue)
                });

            string qrCodeValue = $"ROOM-{room.RoomID}-{room.RoomName.Replace(" ", "").ToUpper()}";

            string qrImage = _qrService.GenerateFromString(qrCodeValue);

            var qr = new RoomReservationSystem.Models.QR
            {
                RoomID = roomId,
                QRCodeValue = qrCodeValue,
                IsActive = true
            };

            _context.QRCodes.Add(qr);
            _context.SaveChanges();

            return Ok(new
            {
                message = "QR code created successfully",
                roomID = room.RoomID,
                roomName = room.RoomName,
                qrCodeValue = qrCodeValue,
                isActive = true,
                qrImage = qrImage
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

            string qrValue = _qrService.GenerateDynamicQRValue(roomId);
            string qrImage = _qrService.GenerateFromString(qrValue);

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
            var now = DateTime.Now;

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
            var now    = DateTime.Now;

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

            var now = DateTime.Now;
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
            var now = DateTime.Now;

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
                    return BadRequest(new { message = "QR code is invalid or expired" });
            }

            var reservation = _context.Reservations.FirstOrDefault(r =>
                r.RoomID == body.RoomId &&
                r.UserID == userId &&
                (r.Status == "Confirmed" || r.Status == "Active") &&
                r.StartTime <= now &&
                r.EndTime >= now);

            if (reservation == null)
                return BadRequest(new
                {
                    message = "Access denied",
                    reason = "No valid reservation for this room at this time"
                });

            reservation.Status = "CheckedIn";
            reservation.UpdatedAt = now;

            _context.ScanLogs.Add(new ScanLog
            {
                UserID = userId,
                RoomID = body.RoomId,
                ReservationID = reservation.ReservationID,
                ScanTime = now,
                ScanType = "CheckIn",
                AccessGranted = true
            });

            _context.SaveChanges();

            return Ok(new
            {
                message = "Checked in",
                reservationID = reservation.ReservationID,
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
            var now = DateTime.Now;

            var reservation = _context.Reservations.FirstOrDefault(r =>
                r.RoomID == body.RoomId &&
                r.UserID == userId &&
                r.Status == "CheckedIn");

            if (reservation == null)
                return BadRequest(new
                {
                    message = "Cannot check out",
                    reason = "No active check-in for this room"
                });

            reservation.Status = "CheckedOut";
            reservation.UpdatedAt = now;

            _context.ScanLogs.Add(new ScanLog
            {
                UserID = userId,
                RoomID = body.RoomId,
                ReservationID = reservation.ReservationID,
                ScanTime = now,
                ScanType = "CheckOut",
                AccessGranted = true
            });

            _context.SaveChanges();

            return Ok(new
            {
                message = "Checked out",
                reservationID = reservation.ReservationID,
                status = reservation.Status
            });
        }

        // ──────────────────────────────────────────────────────────────────
        // POST /api/qr/rotate/{roomId}
        //   Force-rotate the active QR token for a room (admin only).
        // ──────────────────────────────────────────────────────────────────
        [HttpPost("rotate/{roomId}")]
        [Authorize(Roles = "Admin")]
        public IActionResult RotateRoomQR(int roomId)
        {
            var qr = _context.QRCodes.FirstOrDefault(q => q.RoomID == roomId);
            if (qr == null)
                return NotFound(new { message = "Room QR not found" });

            // Trigger a fresh dynamic value via QRService.  The static value
            // is preserved for legacy door stickers.
            string fresh = _qrService.GenerateDynamicQRValue(roomId);
            return Ok(new
            {
                message = "QR rotated",
                roomID = roomId,
                qrValue = fresh,
                qrImage = _qrService.GenerateFromString(fresh),
                rotatedAt = DateTime.UtcNow
            });
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
