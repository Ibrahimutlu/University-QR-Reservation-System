using System;
using System.Linq;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoomReservationSystem.Data;

namespace RoomReservationSystem.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    public class NotificationController : ControllerBase
    {
        private readonly AppDbContext _context;

        public NotificationController(AppDbContext context)
        {
            _context = context;
        }

        // ─────────────────────────────────────────────────────────────────
        // GET /api/notifications/me
        //   Returns unread + last-24h notifications for the caller,
        //   newest first.
        // ─────────────────────────────────────────────────────────────────
        [HttpGet("me")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult GetMine()
        {
            int userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);
            var cutoff = DateTime.UtcNow.AddHours(-24);

            var rows = _context.Notifications
                .Where(n => n.UserID == userId &&
                            (n.ReadAt == null || n.CreatedAt >= cutoff))
                .OrderByDescending(n => n.CreatedAt)
                .Select(n => new
                {
                    n.NotificationID,
                    n.UserID,
                    n.ReservationID,
                    n.Type,
                    n.Message,
                    n.Severity,
                    n.CreatedAt,
                    n.ReadAt,
                    isRead = n.ReadAt != null
                })
                .ToList();

            return Ok(rows);
        }

        // ─────────────────────────────────────────────────────────────────
        // POST /api/notifications/{id}/read
        // ─────────────────────────────────────────────────────────────────
        [HttpPost("{id}/read")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult MarkRead(int id)
        {
            int userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);
            var row = _context.Notifications
                .FirstOrDefault(n => n.NotificationID == id && n.UserID == userId);

            if (row == null) return NotFound(new { message = "Notification not found" });

            if (row.ReadAt == null)
            {
                row.ReadAt = DateTime.UtcNow;
                _context.SaveChanges();
            }
            return Ok(new { notificationID = id, readAt = row.ReadAt });
        }

        // ─────────────────────────────────────────────────────────────────
        // POST /api/notifications/read-all
        // ─────────────────────────────────────────────────────────────────
        [HttpPost("read-all")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult MarkAllRead()
        {
            int userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);
            var now = DateTime.UtcNow;
            var unread = _context.Notifications
                .Where(n => n.UserID == userId && n.ReadAt == null)
                .ToList();

            foreach (var n in unread) n.ReadAt = now;
            _context.SaveChanges();
            return Ok(new { marked = unread.Count, readAt = now });
        }
    }
}
