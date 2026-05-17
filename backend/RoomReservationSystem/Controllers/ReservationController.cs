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

        // Spec rule:  reservations are exactly 2 hours, aligned on even hours
        //             between 08:00 and 22:00 inclusive.
        private static readonly int[] AllowedSlotStartHours =
            new[] { 8, 10, 12, 14, 16, 18, 20 };

        // "Live" statuses that count as an active reservation against the
        // single-active-per-student rule. OnBreak is included so the slot
        // stays held while a student is on their 15-minute break.
        private static readonly string[] ActiveStatuses =
            new[] { "Pending", "Confirmed", "Active", "CheckedIn", "OnBreak" };

        [HttpPost("create")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult CreateReservation([FromBody] Reservation reservation)
        {
            if (reservation == null)
                return BadRequest("Invalid reservation details provided");

            if (reservation.EndTime <= reservation.StartTime)
                return BadRequest("End time must be after start time");

            // Resolve the target room first so we can branch on IsDemoRoom.
            var room = _context.Rooms.FirstOrDefault(r => r.RoomID == reservation.RoomID);
            if (room == null)
                return NotFound("Room does not exist in the system");

            // ── 2-hour slot rule ──────────────────────────────────────────
            // Standard rooms must be exactly two hours long, start on an
            // even hour between 08:00 and 20:00 inclusive, and have zero
            // minutes. Demo rooms bypass this entire block so presenters
            // can reserve a free-form window at any time.
            if (!room.IsDemoRoom)
            {
                var duration = reservation.EndTime - reservation.StartTime;
                if (duration != TimeSpan.FromHours(2))
                    return BadRequest("Reservations must be exactly 2 hours long");

                if (reservation.StartTime.Minute != 0 || reservation.StartTime.Second != 0)
                    return BadRequest("Reservation start time must be on the hour");

                if (System.Array.IndexOf(AllowedSlotStartHours, reservation.StartTime.Hour) < 0)
                    return BadRequest(
                        "Reservation must start on an even hour between 08:00 and 20:00");
            }

            var now = DateTime.UtcNow;

            // Normalize date from start time (Swagger/frontend may pass
            // a different ReservationDate value).
            reservation.ReservationDate = reservation.StartTime.Date;

            if (reservation.StartTime.Date < now.Date)
                return BadRequest("Cannot book a room for a past date");

            if (reservation.StartTime.Date == now.Date && reservation.StartTime <= now)
                return BadRequest("Cannot book a room for a past time");

            var loggedInUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);
            var userRole = User.FindFirst(ClaimTypes.Role).Value;

            if (userRole != "Admin" && reservation.UserID != loggedInUserId)
                return BadRequest("You can only create a reservation for yourself");

            var user = _context.Users.FirstOrDefault(u => u.UserID == reservation.UserID);
            if (user == null)
                return NotFound("User does not exist in the system");

            // ── Single-active-reservation rule ────────────────────────────
            // Admins may book on behalf of a student that has nothing live;
            // students cannot have any other live reservation regardless of
            // its time window. Demo rooms are exempt — students can book
            // a demo slot in addition to their regular study slot.
            if (!room.IsDemoRoom)
            {
                bool hasActive = _context.Reservations.Any(r =>
                    r.UserID == reservation.UserID &&
                    ActiveStatuses.Contains(r.Status));

                if (hasActive)
                    return BadRequest(
                        "This student already has an active reservation. " +
                        "Only one active reservation is allowed per student.");
            }

            // ── Overlap detection (room) ─────────────────────────────────
            int overlaps = _context.Reservations.Count(r =>
                r.RoomID == reservation.RoomID &&
                ActiveStatuses.Contains(r.Status) &&
                r.StartTime < reservation.EndTime &&
                r.EndTime > reservation.StartTime);

            if (overlaps >= room.Capacity)
                return BadRequest("Room is fully booked for the selected time slot");

            // ── Persist + QR ─────────────────────────────────────────────
            using var tx = _context.Database.BeginTransaction();
            try
            {
                reservation.Status = "Confirmed";
                reservation.IsDemoReservation = room.IsDemoRoom;
                reservation.CreatedAt = DateTime.UtcNow;
                reservation.UpdatedAt = DateTime.UtcNow;

                _context.Reservations.Add(reservation);
                _context.SaveChanges();

                var qr = _qrService.GenerateReservationQR(
                    reservation.ReservationID,
                    reservation.RoomID,
                    reservation.UserID,
                    reservation.StartTime,
                    reservation.EndTime);

                reservation.QRCodeData = qr.Payload;
                reservation.UpdatedAt = DateTime.UtcNow;
                _context.SaveChanges();

                tx.Commit();

                return Ok(new
                {
                    message = "Reservation created successfully",
                    reservationID = reservation.ReservationID,
                    status = reservation.Status,
                    qrPayload = qr.Payload,
                    qrImage = qr.ImageDataUrl
                });
            }
            catch
            {
                tx.Rollback();
                return StatusCode(500, new
                {
                    message = "Reservation could not be completed due to a QR generation error. Please try again."
                });
            }
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

            // Re-render the QR image from the stored payload. If historical
            // rows are missing payload, regenerate from reservation fields.
            string qrPayload = reservation.QRCodeData;
            string qrImage = null;
            try
            {
                if (!string.IsNullOrEmpty(qrPayload))
                {
                    qrImage = _qrService.GenerateFromString(qrPayload);
                }
                else
                {
                    var regenerated = _qrService.GenerateReservationQR(
                        reservation.ReservationID,
                        reservation.RoomID,
                        reservation.UserID,
                        reservation.StartTime,
                        reservation.EndTime);
                    qrPayload = regenerated.Payload;
                    qrImage = regenerated.ImageDataUrl;
                }
            }
            catch
            {
                // Keep reservation readable even if QR rendering fails.
            }

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
                qrPayload,
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
            var enriched = reservations.Select(r =>
            {
                string qrPayload = r.QRCodeData;
                string qrImage;

                try
                {
                    if (!string.IsNullOrEmpty(qrPayload))
                    {
                        qrImage = _qrService.GenerateFromString(qrPayload);
                    }
                    else
                    {
                        var regenerated = _qrService.GenerateReservationQR(
                            r.ReservationID,
                            r.RoomID,
                            r.UserID,
                            r.StartTime,
                            r.EndTime);
                        qrPayload = regenerated.Payload;
                        qrImage = regenerated.ImageDataUrl;
                    }
                }
                catch
                {
                    qrImage = null;
                }

                return new
                {
                    r.ReservationID,
                    r.UserID,
                    r.RoomID,
                    r.ReservationDate,
                    r.StartTime,
                    r.EndTime,
                    r.Status,
                    r.CreatedAt,
                    qrPayload,
                    qrImage,
                    r.Room,
                    r.User
                };
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

            var now = DateTime.UtcNow;
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


        // ─────────────────────────────────────────────────────────────────
        // Warnings & no-show
        //
        // GET /api/reservation/warnings
        //   Called by the student dashboard on every load.  For each of the
        //   caller's confirmed reservations we check:
        //
        //     * If the start time has passed and they have not checked in,
        //       AND they are still inside the grace period (default 15 min)
        //         -> return a warning telling them to scan the QR.
        //
        //     * If the start time + grace period has already passed and they
        //       have not checked in
        //         -> mark the reservation NoShow (DB write).
        //         -> still return it so the UI can react.
        //
        // The grace period is read from the env var
        //   CHECKIN_GRACE_PERIOD_MINUTES (default = 15).
        // ─────────────────────────────────────────────────────────────────
        [HttpGet("warnings")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult GetWarnings()
        {
            int loggedInUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);
            int grace = ParseEnvIntOrDefault("CHECKIN_GRACE_PERIOD_MINUTES", 15);
            var now = DateTime.UtcNow;

            // Pull every "live" reservation owned by this user.
            var live = _context.Reservations
                .Where(r => r.UserID == loggedInUserId &&
                            (r.Status == "Confirmed" || r.Status == "Active" ||
                             r.Status == "Pending"))
                .ToList();

            // Was there a check-in for any of them?
            var resIds = live.Select(r => r.ReservationID).ToList();
            var checkIns = _context.ScanLogs
                .Where(s => resIds.Contains(s.ReservationID ?? -1) &&
                            s.ScanType == "CheckIn" && s.AccessGranted)
                .Select(s => s.ReservationID)
                .ToHashSet();

            var warnings = new System.Collections.Generic.List<object>();

            foreach (var r in live)
            {
                bool hasCheckin = checkIns.Contains(r.ReservationID);
                if (hasCheckin) continue;

                if (now < r.StartTime) continue;          // not started yet
                if (now > r.EndTime)
                {
                    // window finished without a check-in -> mark NoShow
                    r.Status = "NoShow";
                    r.UpdatedAt = now;
                    string noShowMsg = "Rezervasyon penceresi sona erdi ve giris yapilmadi. " +
                                       "Rezervasyon NoShow olarak isaretlendi.";
                    Services.NotificationService.Fire(
                        _context, r.UserID, r.ReservationID,
                        Services.NotificationService.Types.NoShow,
                        noShowMsg,
                        Services.NotificationService.Severity.Warning,
                        save: false);
                    warnings.Add(new
                    {
                        kind = "no_show",
                        reservationID = r.ReservationID,
                        roomID = r.RoomID,
                        message = noShowMsg
                    });
                    continue;
                }

                // Inside the booked window with no check-in.
                var elapsed = (now - r.StartTime).TotalMinutes;
                if (elapsed > grace)
                {
                    // grace exhausted -> Expired and free the slot
                    r.Status = "Expired";
                    r.UpdatedAt = now;
                    string expiredMsg = "Giris suresi doldu. Rezervasyon iptal edildi.";
                    Services.NotificationService.Fire(
                        _context, r.UserID, r.ReservationID,
                        Services.NotificationService.Types.Expired,
                        expiredMsg,
                        Services.NotificationService.Severity.Warning,
                        save: false);
                    warnings.Add(new
                    {
                        kind = "expired",
                        reservationID = r.ReservationID,
                        roomID = r.RoomID,
                        message = expiredMsg
                    });
                }
                else
                {
                    string graceMsg = "Rezervasyon saatiniz basladi ancak QR girisiniz yapilmadi. " +
                                      "Lutfen calisma alanina giris yapmak icin QR kodu taratin.";
                    Services.NotificationService.Fire(
                        _context, r.UserID, r.ReservationID,
                        Services.NotificationService.Types.CheckInGraceWarning,
                        graceMsg,
                        Services.NotificationService.Severity.Info,
                        save: false);
                    warnings.Add(new
                    {
                        kind = "missing_checkin",
                        reservationID = r.ReservationID,
                        roomID = r.RoomID,
                        graceMinutesRemaining = (int)(grace - elapsed),
                        message = graceMsg
                    });
                }
            }

            _context.SaveChanges();
            return Ok(warnings);
        }

        // ─────────────────────────────────────────────────────────────────
        // GET /api/reservation/active
        //   Returns the caller's currently active reservation (one of the
        //   "live" statuses) or null. Used by the scanner page to decide
        //   whether to show "Start Break" or "End Break" on the Break
        //   button.
        // ─────────────────────────────────────────────────────────────────
        [HttpGet("active")]
        [Authorize(Roles = "Student,Staff,Admin")]
        public IActionResult GetActiveReservation()
        {
            int loggedInUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);
            var now = DateTime.UtcNow;

            var active = _context.Reservations
                .Where(r => r.UserID == loggedInUserId &&
                            ActiveStatuses.Contains(r.Status) &&
                            r.EndTime >= now)
                .OrderBy(r => r.StartTime)
                .Select(r => new
                {
                    r.ReservationID,
                    r.UserID,
                    r.RoomID,
                    r.StartTime,
                    r.EndTime,
                    r.Status,
                    Room = new
                    {
                        r.Room.RoomID,
                        r.Room.RoomName,
                        r.Room.Location
                    }
                })
                .FirstOrDefault();

            if (active == null)
                return Ok((object)null);

            return Ok(active);
        }

        private static int ParseEnvIntOrDefault(string name, int fallback)
        {
            var raw = System.Environment.GetEnvironmentVariable(name);
            if (int.TryParse(raw, out var n) && n > 0) return n;
            return fallback;
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
