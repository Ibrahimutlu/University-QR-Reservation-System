using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoomReservationSystem.Data;
using RoomReservationSystem.Models;
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

        public ReservationController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("create")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult CreateReservation([FromBody] Reservation reservation)
        {
            if (reservation == null)
                return BadRequest("Invalid reservation details provided");

            if (reservation.EndTime <= reservation.StartTime)
                return BadRequest("End time must be after start time");

            if (reservation.ReservationDate < DateTime.Today)
                return BadRequest("Cannot book a room for a past date");

            if (reservation.StartTime < DateTime.Now)
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

            bool isRoomAvailable = !_context.Reservations.Any(r =>
                r.RoomID == reservation.RoomID &&
                r.ReservationDate == reservation.ReservationDate &&
                r.Status != "Cancelled" &&
                r.StartTime < reservation.EndTime &&
                r.EndTime > reservation.StartTime);

            if (!isRoomAvailable)
                return BadRequest("Room is not available for the selected time slot");

            reservation.Status = "Confirmed";
            reservation.CreatedAt = DateTime.Now;
            room.Capacity -= 1;
            if (room.Capacity <= 0)
                room.IsAvailable = false;

            _context.Reservations.Add(reservation);
            _context.SaveChanges();

            return Ok(new
            {
                message = "Reservation created successfully",
                ReservationID = reservation.ReservationID,
                Status = reservation.Status
            });
        }

        [HttpGet("{reservationId}")]
        [Authorize(Roles = "Admin")]
        public IActionResult GetReservation(int reservationId)
        {
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

            return Ok(reservation);
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

            if (reservations == null || reservations.Count == 0)
                return NotFound("No reservations found for this user");

            return Ok(reservations);
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

            reservation.Status = "Cancelled";

            var room = _context.Rooms.FirstOrDefault(r => r.RoomID == reservation.RoomID);
            if (room != null)
                room.Capacity += 1;
            if (room.Capacity > 0)
                room.IsAvailable = true;

            _context.SaveChanges();

            return Ok(new { message = "Reservation cancelled successfully" });
        }
    }
}