using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoomReservationSystem.Data;
using System;
using System.Linq;

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

        [HttpGet("validate")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult ValidateQR([FromQuery] string qrCodeValue, [FromQuery] int userId)
        {
            if (string.IsNullOrEmpty(qrCodeValue))
                return BadRequest("Invalid QR code");

            var qr = _context.QRCodes.FirstOrDefault(q =>
                q.QRCodeValue == qrCodeValue &&
                q.IsActive == true);

            if (qr == null)
                return NotFound("QR code not found or inactive");

            var currentTime = DateTime.Now;

            var reservation = _context.Reservations.FirstOrDefault(r =>
                r.RoomID == qr.RoomID &&
                r.UserID == userId &&
                r.Status == "Confirmed" &&
                r.StartTime <= currentTime &&
                r.EndTime >= currentTime);

            if (reservation == null)
                return BadRequest(new
                {
                    message = "Access denied",
                    reason = "No valid reservation found for this room at this time"
                });

            return Ok(new
            {
                message = "Access granted",
                RoomID = qr.RoomID,
                UserID = userId,
                ReservationID = reservation.ReservationID
            });
        }
    }
}