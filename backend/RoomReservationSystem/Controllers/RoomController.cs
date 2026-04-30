using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoomReservationSystem.Data;
using RoomReservationSystem.Models;
using System;
using System.Linq;

namespace RoomReservationSystem.Controllers
{
    [ApiController]
    [Route("api/room")]
    public class RoomController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RoomController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("available-slots/{roomId}")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult GetAvailableSlots(int roomId, [FromQuery] DateTime date)
        {
            var room = _context.Rooms.FirstOrDefault(r => r.RoomID == roomId);

            if (room == null)
                return NotFound("Room does not exist in the system");

            var bookedSlots = _context.Reservations
                .Where(r => r.RoomID == roomId &&
                       r.ReservationDate.Date == date.Date &&
                       r.Status == "Confirmed")
                .Select(r => new
                {
                    StartTime = r.StartTime,
                    EndTime = r.EndTime,
                })
                .OrderBy(r => r.StartTime)
                .ToList();

            var workingStart = date.Date.AddHours(8);
            var workingEnd = date.Date.AddHours(20);

            var availableSlots = new System.Collections.Generic.List<object>();
            var currentTime = workingStart;

            foreach (var booked in bookedSlots)
            {
                if (currentTime < booked.StartTime)
                {
                    availableSlots.Add(new
                    {
                        StartTime = currentTime.ToString("HH:mm"),
                        EndTime = booked.StartTime.ToString("HH:mm"),
                        Status = "Available"
                    });
                }
                currentTime = booked.EndTime;
            }

            if (currentTime < workingEnd)
            {
                availableSlots.Add(new
                {
                    StartTime = currentTime.ToString("HH:mm"),
                    EndTime = workingEnd.ToString("HH:mm"),
                    Status = "Available"
                });
            }

            return Ok(new
            {
                RoomID = room.RoomID,
                RoomName = room.RoomName,
                Date = date.ToString("yyyy-MM-dd"),
                AvailableSlots = availableSlots,
                BookedSlots = bookedSlots.Select(b => new
                {
                    StartTime = b.StartTime.ToString("HH:mm"),
                    EndTime = b.EndTime.ToString("HH:mm"),
                    Status = "Booked"
                })
            });
        }

        [HttpGet("status/{roomId}")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult GetRoomStatus(int roomId)
        {
            var room = _context.Rooms.FirstOrDefault(r => r.RoomID == roomId);

            if (room == null)
                return NotFound("Room does not exist in the system");

            var currentReservation = _context.Reservations.FirstOrDefault(r =>
                r.RoomID == roomId &&
                r.Status == "Confirmed" &&
                r.StartTime <= DateTime.Now &&
                r.EndTime >= DateTime.Now);

            if (currentReservation == null)
            {
                return Ok(new
                {
                    RoomID = room.RoomID,
                    RoomName = room.RoomName,
                    RoomType = room.RoomType,
                    IsAvailable = true,
                    CurrentReservation = (object)null
                });
            }
            else
            {
                return Ok(new
                {
                    RoomID = room.RoomID,
                    RoomName = room.RoomName,
                    RoomType = room.RoomType,
                    IsAvailable = false,
                    CurrentReservation = new
                    {
                        ReservationID = currentReservation.ReservationID,
                        StartTime = currentReservation.StartTime,
                        EndTime = currentReservation.EndTime
                    }
                });
            }
        }

        [HttpGet]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult GetAllRooms()
        {
            var rooms = _context.Rooms.ToList();

            if (rooms == null || rooms.Count == 0)
                return NotFound("No rooms found");

            return Ok(rooms);
        }

        [HttpGet("search")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult SearchRooms(
            [FromQuery] string? type,
            [FromQuery] int? minCapacity,
            [FromQuery] string? location,
            [FromQuery] bool? isAvailable)
        {
            var query = _context.Rooms.AsQueryable();

            if (!string.IsNullOrEmpty(type))
                query = query.Where(r => r.RoomType.ToLower() == type.ToLower());

            if (minCapacity.HasValue)
                query = query.Where(r => r.Capacity >= minCapacity.Value);

            if (!string.IsNullOrEmpty(location))
                query = query.Where(r => r.Location.ToLower().Contains(location.ToLower()));

            if (isAvailable.HasValue)
                query = query.Where(r => r.IsAvailable == isAvailable.Value);

            var rooms = query.OrderBy(r => r.RoomName).ToList();

            if (rooms.Count == 0)
                return NotFound("No rooms found matching the search criteria");

            return Ok(rooms);
        }

        [HttpPost("add")]
        [Authorize(Roles = "Admin")]
        public IActionResult AddRoom([FromBody] Room room)
        {
            if (room == null)
                return BadRequest("Invalid room details");

            if (string.IsNullOrEmpty(room.RoomName) ||
                string.IsNullOrEmpty(room.RoomType) ||
                string.IsNullOrEmpty(room.Location))
                return BadRequest("RoomName, RoomType and Location are required");

            room.IsAvailable = true;
            _context.Rooms.Add(room);
            _context.SaveChanges();

            return Ok(new { message = "Room added successfully", RoomID = room.RoomID });
        }

        [HttpPut("update/{roomId}")]
        [Authorize(Roles = "Admin")]
        public IActionResult UpdateRoom(int roomId, [FromBody] Room updatedRoom)
        {
            var room = _context.Rooms.FirstOrDefault(r => r.RoomID == roomId);

            if (room == null)
                return NotFound("Room does not exist");

            room.RoomName = updatedRoom.RoomName;
            room.RoomType = updatedRoom.RoomType;
            room.Capacity = updatedRoom.Capacity;
            room.Location = updatedRoom.Location;

            _context.SaveChanges();

            return Ok(new { message = "Room updated successfully" });
        }

        [HttpDelete("delete/{roomId}")]
        [Authorize(Roles = "Admin")]
        public IActionResult DeleteRoom(int roomId)
        {
            var room = _context.Rooms.FirstOrDefault(r => r.RoomID == roomId);

            if (room == null)
                return NotFound("Room does not exist");

            // Check if room has any active reservations
            bool hasActiveReservations = _context.Reservations.Any(r =>
                r.RoomID == roomId &&
                r.Status != "Cancelled");

            if (hasActiveReservations)
                return BadRequest("Cannot delete a room that has active reservations. Cancel all reservations first.");

            // Delete all cancelled reservations for this room
            var cancelledReservations = _context.Reservations
                .Where(r => r.RoomID == roomId)
                .ToList();
            _context.Reservations.RemoveRange(cancelledReservations);

            // Remove QR code if exists
            var qr = _context.QRCodes.FirstOrDefault(q => q.RoomID == roomId);
            if (qr != null)
                _context.QRCodes.Remove(qr);

            _context.Rooms.Remove(room);
            _context.SaveChanges();

            return Ok(new { message = "Room deleted successfully" });
        }
    }
}