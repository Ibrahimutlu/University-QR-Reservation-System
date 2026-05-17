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

            if (date == default)
                date = DateTime.Today;

            // Spec: 2-hour slots between 08:00 and 22:00.
            var workingStart = date.Date.AddHours(8);
            var workingEnd = date.Date.AddHours(22);
            var slotDuration = TimeSpan.FromHours(2);

            // "Live" reservations block a slot (incl. checked-in students).
            var liveStatuses = new[]
                { "Pending", "Confirmed", "Active", "CheckedIn" };

            var reservations = _context.Reservations
                .Where(r => r.RoomID == roomId &&
                       liveStatuses.Contains(r.Status) &&
                       r.StartTime < workingEnd &&
                       r.EndTime > workingStart)
                .Select(r => new
                {
                    r.ReservationID,
                    r.StartTime,
                    r.EndTime
                })
                .ToList();

            var availableSlots = new System.Collections.Generic.List<object>();
            var bookedSlots = new System.Collections.Generic.List<object>();

            for (var slotStart = workingStart; slotStart < workingEnd; slotStart = slotStart.Add(slotDuration))
            {
                var slotEnd = slotStart.Add(slotDuration);

                int currentBookings = reservations.Count(r =>
                    r.StartTime < slotEnd &&
                    r.EndTime > slotStart);

                int remainingCapacity = room.Capacity - currentBookings;

                var slot = new
                {
                    StartTime = slotStart.ToString("HH:mm"),
                    EndTime = slotEnd.ToString("HH:mm"),
                    totalCapacity = room.Capacity,
                    currentBookings = currentBookings,
                    remainingCapacity = remainingCapacity < 0 ? 0 : remainingCapacity,
                    isAvailable = remainingCapacity > 0,
                    Status = remainingCapacity > 0 ? "Available" : "Full"
                };

                if (remainingCapacity > 0)
                    availableSlots.Add(slot);
                else
                    bookedSlots.Add(slot);
            }

            return Ok(new
            {
                RoomID = room.RoomID,
                RoomName = room.RoomName,
                totalCapacity = room.Capacity,
                Date = date.ToString("yyyy-MM-dd"),
                AvailableSlots = availableSlots,
                BookedSlots = bookedSlots
            });
        }
        [HttpGet("status/{roomId}")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult GetRoomStatus(int roomId)
        {
            var room = _context.Rooms.FirstOrDefault(r => r.RoomID == roomId);

            if (room == null)
                return NotFound("Room does not exist in the system");

            var now = DateTime.UtcNow;

            // Count active bookings at current time
            int currentBookings = _context.Reservations.Count(r =>
                r.RoomID == roomId &&
                r.Status != "Cancelled" &&
                r.StartTime <= now &&
                r.EndTime >= now);

            int remainingCapacity = room.Capacity - currentBookings;
            bool isAvailable = remainingCapacity > 0;

            var currentReservation = _context.Reservations.FirstOrDefault(r =>
                r.RoomID == roomId &&
                r.Status == "Confirmed" &&
                r.StartTime <= now &&
                r.EndTime >= now);

            return Ok(new
            {
                roomID = room.RoomID,
                roomName = room.RoomName,
                roomType = room.RoomType,
                totalCapacity = room.Capacity,
                currentBookings = currentBookings,
                remainingCapacity = remainingCapacity,
                isAvailable = isAvailable,
                currentReservation = currentReservation == null ? null : new
                {
                    reservationID = currentReservation.ReservationID,
                    startTime = currentReservation.StartTime,
                    endTime = currentReservation.EndTime
                }
            });
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
    [FromQuery] bool? isAvailable,
    [FromQuery] DateTime? startTime,
    [FromQuery] DateTime? endTime)
        {
            var query = _context.Rooms.AsQueryable();

            if (!string.IsNullOrEmpty(type))
                query = query.Where(r => r.RoomType.ToLower() == type.ToLower());

            if (minCapacity.HasValue)
                query = query.Where(r => r.Capacity >= minCapacity.Value);

            if (!string.IsNullOrEmpty(location))
                query = query.Where(r => r.Location.ToLower().Contains(location.ToLower()));

            var rooms = query.OrderBy(r => r.RoomName).ToList();

            if (rooms.Count == 0)
                return NotFound("No rooms found matching the search criteria");

            // Calculate remaining capacity for each room
            var result = rooms.Select(room =>
            {
                int currentBookings = 0;

                if (startTime.HasValue && endTime.HasValue)
                {
                    currentBookings = _context.Reservations.Count(r =>
                        r.RoomID == room.RoomID &&
                        r.Status != "Cancelled" &&
                        r.StartTime < endTime.Value &&
                        r.EndTime > startTime.Value);
                }

                int remainingCapacity = room.Capacity - currentBookings;
                bool roomIsAvailable = remainingCapacity > 0;

                // Filter by availability if requested
                if (isAvailable.HasValue && isAvailable.Value != roomIsAvailable)
                    return null;

                return new
                {
                    room.RoomID,
                    room.RoomName,
                    room.RoomType,
                    room.Location,
                    totalCapacity = room.Capacity,
                    currentBookings = currentBookings,
                    remainingCapacity = remainingCapacity,
                    isAvailable = roomIsAvailable
                };
            })
            .Where(r => r != null)
            .ToList();

            if (result.Count == 0)
                return NotFound("No rooms found matching the search criteria");

            return Ok(result);
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

            var qrCodeValue = BuildRoomQrCodeValue(room);
            var qr = new QR
            {
                RoomID = room.RoomID,
                QRCodeValue = qrCodeValue,
                IsActive = true
            };

            room.QRCode = qrCodeValue;
            _context.QRCodes.Add(qr);
            _context.SaveChanges();

            return Ok(new
            {
                message = "Room added successfully",
                RoomID = room.RoomID,
                qrCodeValue = qrCodeValue
            });
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
    }
}
