using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoomReservationSystem.Data;
using RoomReservationSystem.Models;
using RoomReservationSystem.Services;
using System;
using System.Linq;
using System.Security.Claims;

namespace RoomReservationSystem.Controllers
{
    [ApiController]
    [Route("api/reservation")]
    public class ReservationController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly QRService _qrService;

        public ReservationController(AppDbContext context, QRService qrService)
        {
            _context = context;
            _qrService = qrService;
        }

        [HttpPost("create")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult CreateReservation([FromBody] Reservation reservation)
        {
            if (reservation == null)
                return BadRequest("Invalid reservation details provided");

            if (reservation.EndTime <= reservation.StartTime)
                return BadRequest("End time must be after start time");

            var now = DateTime.Now;

            // Use StartTime as the source of truth. Swagger/frontend may send
            // ReservationDate with a different time component, so we normalize it.
            reservation.ReservationDate = reservation.StartTime.Date;

            if (reservation.StartTime.Date < now.Date)
                return BadRequest("Cannot book a room for a past date");

            if (reservation.StartTime.Date == now.Date && reservation.StartTime <= now)
                return BadRequest("Cannot book a room for a past time");

            var loggedInUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);
            var userRole = User.FindFirst(ClaimTypes.Role).Value;

            if (userRole != "Admin" && reservation.UserID != loggedInUserId)
                return BadRequest("You can only create a reservation for yourself");

            var room = _context.Rooms.FirstOrDefault(r => r.RoomID == reservation.RoomID);
            if (room == null)
                return NotFound("Room does not exist in the system");

            var user = _context.Users.FirstOrDefault(u => u.UserID == reservation.UserID);
            if (user == null)
                return NotFound("User does not exist in the system");

            // Overlap detection (Report 2 §3.3): half-open interval test against
            // any reservation for the same room that has not been cancelled.
            int overlaps = _context.Reservations.Count(r =>
    r.RoomID == reservation.RoomID &&
    r.Status != "Cancelled" &&
    r.StartTime < reservation.EndTime &&
    r.EndTime > reservation.StartTime);

            if (overlaps >= room.Capacity)
                return BadRequest("Room is fully booked for the selected time slot");

            bool userConflict = _context.Reservations.Any(r =>
                r.UserID == reservation.UserID &&
                r.Status != "Cancelled" &&
                r.StartTime < reservation.EndTime &&
                r.EndTime > reservation.StartTime);

            if (userConflict)
                return BadRequest("You already have a reservation at this time");
            // Persist the reservation so we have an ID, then generate the QR
            // (the QR payload references the reservation ID).
            reservation.Status = "Confirmed";
            reservation.CreatedAt = DateTime.Now;

            _context.Reservations.Add(reservation);
            _context.SaveChanges();

            var qr = _qrService.GenerateReservationQR(
                reservation.ReservationID,
                reservation.RoomID,
                reservation.UserID,
                reservation.StartTime,
                reservation.EndTime);

            reservation.QRCodeData = qr.Payload;
            _context.SaveChanges();

            return Ok(new
            {
                message = "Reservation created successfully",
                reservationID = reservation.ReservationID,
                status = reservation.Status,
                qrPayload = qr.Payload,
                qrImage = qr.ImageDataUrl
            });
        }

        [HttpGet("{reservationId}")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult GetReservation(int reservationId)
        {
            var loggedInUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);
            var userRole = User.FindFirst(ClaimTypes.Role).Value;

            var reservation = _context.Reservations
                .Where(r => r.ReservationID == reservationId)
                .Select(r => new
                {
                    r.ReservationID,
                    r.UserID,
                    r.RoomID,
                    r.ReservationDate,
                    r.StartTime,
                    r.EndTime,
                    r.Status,
                    r.CreatedAt,
                    r.QRCodeData,
                    Room = new
                    {
                        r.Room.RoomID,
                        r.Room.RoomName,
                        r.Room.RoomType,
                        r.Room.Location,
                        r.Room.Capacity
                    },
                    User = new
                    {
                        r.User.UserID,
                        r.User.FirstName,
                        r.User.LastName,
                        r.User.Email,
                        r.User.Role
                    }
                })
                .FirstOrDefault();

            if (reservation == null)
                return NotFound("Reservation does not exist");

            // Non-admins can only view their own reservations.
            if (userRole != "Admin" && reservation.UserID != loggedInUserId)
                return Unauthorized("You can only view your own reservations");

            // Re-render the QR image from the stored payload so the client
            // never has to keep the image around.
            string qrImage = string.IsNullOrEmpty(reservation.QRCodeData)
                ? null
                : _qrService.GenerateFromString(reservation.QRCodeData);

            return Ok(new
            {
                reservation.ReservationID,
                reservation.UserID,
                reservation.RoomID,
                reservation.ReservationDate,
                reservation.StartTime,
                reservation.EndTime,
                reservation.Status,
                reservation.CreatedAt,
                qrPayload = reservation.QRCodeData,
                qrImage,
                reservation.Room,
                reservation.User
            });
        }

        [HttpGet("user/{userId}")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult GetUserReservations(int userId)
        {
            var loggedInUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);
            var userRole = User.FindFirst(ClaimTypes.Role).Value;

            if (userRole == "Student" && userId != loggedInUserId)
                return BadRequest("You can only view your own reservations");

            var reservations = _context.Reservations
                .Where(r => r.UserID == userId)
                .OrderByDescending(r => r.StartTime)
                .Select(r => new
                {
                    r.ReservationID,
                    r.UserID,
                    r.RoomID,
                    r.ReservationDate,
                    r.StartTime,
                    r.EndTime,
                    r.Status,
                    r.CreatedAt,
                    r.QRCodeData,
                    Room = new
                    {
                        r.Room.RoomID,
                        r.Room.RoomName,
                        r.Room.RoomType,
                        r.Room.Location,
                        r.Room.Capacity
                    },
                    User = new
                    {
                        r.User.UserID,
                        r.User.FirstName,
                        r.User.LastName,
                        r.User.Email,
                        r.User.Role
                    }
                })
                .ToList();

            if (reservations == null || reservations.Count == 0)
                return Ok(new object[] { });

            // Augment each row with a freshly-rendered QR image.
            var enriched = reservations.Select(r => new
            {
                r.ReservationID,
                r.UserID,
                r.RoomID,
                r.ReservationDate,
                r.StartTime,
                r.EndTime,
                r.Status,
                r.CreatedAt,
                qrPayload = r.QRCodeData,
                qrImage = string.IsNullOrEmpty(r.QRCodeData)
                                ? null
                                : _qrService.GenerateFromString(r.QRCodeData),
                r.Room,
                r.User
            });

            return Ok(enriched);
        }

        [HttpPut("cancel/{reservationId}")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult CancelReservation(int reservationId)
        {
            var reservation = _context.Reservations.FirstOrDefault(r => r.ReservationID == reservationId);

            if (reservation == null)
                return NotFound("Reservation does not exist");

            var loggedInUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);
            var userRole = User.FindFirst(ClaimTypes.Role).Value;

            if (userRole != "Admin" && reservation.UserID != loggedInUserId)
                return BadRequest("You can only cancel your own reservation");

            if (reservation.Status == "Cancelled")
                return BadRequest("Reservation is already cancelled");

            // Invalidate the reservation and the associated QR payload.
            reservation.Status = "Cancelled";
            reservation.QRCodeData = null;

            _context.SaveChanges();

            return Ok(new { message = "Reservation cancelled successfully" });
        }


        [HttpPut("update/{reservationId}")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult UpdateReservation(int reservationId, [FromBody] UpdateReservationRequest request)
        {
            var reservation = _context.Reservations.FirstOrDefault(r => r.ReservationID == reservationId);

            if (reservation == null)
                return NotFound("Reservation does not exist");

            var loggedInUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);
            var userRole = User.FindFirst(ClaimTypes.Role).Value;

            if (userRole != "Admin" && reservation.UserID != loggedInUserId)
                return BadRequest("You can only update your own reservation");

            if (reservation.Status == "Cancelled")
                return BadRequest("Cannot reschedule a cancelled reservation");

            if (request.EndTime <= request.StartTime)
                return BadRequest("End time must be after start time");

            var now = DateTime.Now;
            var requestedReservationDate = request.StartTime.Date;

            if (request.StartTime.Date < now.Date)
                return BadRequest("Cannot reschedule to a past date");

            if (request.StartTime.Date == now.Date && request.StartTime <= now)
                return BadRequest("Cannot reschedule to a past time");

            var room = _context.Rooms.FirstOrDefault(r => r.RoomID == reservation.RoomID);
            if (room == null)
                return NotFound("Room does not exist in the system");

            // Check capacity at new time slot (excluding current reservation)
            int overlaps = _context.Reservations.Count(r =>
                r.RoomID == reservation.RoomID &&
                r.ReservationID != reservationId &&
                r.Status != "Cancelled" &&
                r.StartTime < request.EndTime &&
                r.EndTime > request.StartTime);

            if (overlaps >= room.Capacity)
                return BadRequest("Room is fully booked for the requested time slot");

            // Check user doesn't have another booking at new time
            bool userConflict = _context.Reservations.Any(r =>
                r.UserID == reservation.UserID &&
                r.ReservationID != reservationId &&
                r.Status != "Cancelled" &&
                r.StartTime < request.EndTime &&
                r.EndTime > request.StartTime);

            if (userConflict)
                return BadRequest("You already have another reservation at this time");

            // Apply updates
            reservation.ReservationDate = requestedReservationDate;
            reservation.StartTime = request.StartTime;
            reservation.EndTime = request.EndTime;

            // Regenerate QR code with new times
            var qr = _qrService.GenerateReservationQR(
                reservation.ReservationID,
                reservation.RoomID,
                reservation.UserID,
                reservation.StartTime,
                reservation.EndTime);

            reservation.QRCodeData = qr.Payload;
            _context.SaveChanges();

            return Ok(new
            {
                message = "Reservation updated successfully",
                reservationID = reservation.ReservationID,
                status = reservation.Status,
                qrPayload = qr.Payload,
                qrImage = qr.ImageDataUrl
            });
        }


        [HttpGet("all")]
        [Authorize(Roles = "Admin")]
        public IActionResult GetAllReservations()
        {
            var reservations = _context.Reservations
                .OrderByDescending(r => r.StartTime)
                .Select(r => new
                {
                    r.ReservationID,
                    r.UserID,
                    r.RoomID,
                    r.ReservationDate,
                    r.StartTime,
                    r.EndTime,
                    r.Status,
                    r.CreatedAt,
                    Room = new
                    {
                        r.Room.RoomID,
                        r.Room.RoomName,
                        r.Room.RoomType,
                        r.Room.Location,
                        r.Room.Capacity
                    },
                    User = new
                    {
                        r.User.UserID,
                        r.User.FirstName,
                        r.User.LastName,
                        r.User.Email,
                        r.User.Role
                    }
                })
                .ToList();

            if (reservations.Count == 0)
                return Ok(new object[] { });

            return Ok(reservations);
        }
    }

}
