using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoomReservationSystem.Data;
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

        public QRController(AppDbContext context)
        {
            _context = context;
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
