using System;
using System.Linq;
using RoomReservationSystem.Data;
using RoomReservationSystem.Models;

namespace RoomReservationSystem.Services
{
    /// <summary>
    /// Helpers around the notifications table. All writes are idempotent on
    /// the (UserID, ReservationID, Type) tuple so callers (request handlers
    /// and the background sweep) can safely re-fire on every pass.
    /// </summary>
    public static class NotificationService
    {
        public static class Types
        {
            public const string CheckInGraceWarning = "CheckInGraceWarning";
            public const string Overstay            = "Overstay";
            public const string NoExit              = "NoExit";
            public const string BreakOverrun        = "BreakOverrun";
            public const string Expired             = "Expired";
            public const string NoShow              = "NoShow";
            public const string ReservationCreated  = "ReservationCreated";
            public const string ReservationCancelled= "ReservationCancelled";
            public const string ReservationEnded    = "ReservationEnded";
            public const string BreakStarted        = "BreakStarted";
            public const string BreakEnded          = "BreakEnded";
            public const string Info                = "Info";
        }

        public static class Severity
        {
            public const string Info    = "info";
            public const string Warning = "warning";
            public const string Error   = "error";
        }

        /// <summary>
        /// Inserts a notification iff no row exists for (userId, reservationId, type).
        /// Returns the row that was created or the existing one. Does NOT call SaveChanges
        /// itself when <paramref name="save"/> is false — pass save=true for stand-alone
        /// callers or batch-call SaveChanges() at the end of a sweep.
        /// </summary>
        public static Notification Fire(
            AppDbContext db,
            int userId,
            int? reservationId,
            string type,
            string message,
            string severity = Severity.Warning,
            bool save = true)
        {
            var existing = db.Notifications.FirstOrDefault(n =>
                n.UserID == userId &&
                n.ReservationID == reservationId &&
                n.Type == type &&
                n.ReadAt == null);

            if (existing != null) return existing;

            var row = new Notification
            {
                UserID        = userId,
                ReservationID = reservationId,
                Type          = type,
                Message       = message,
                Severity      = severity,
                CreatedAt     = DateTime.UtcNow
            };
            db.Notifications.Add(row);
            if (save) db.SaveChanges();
            return row;
        }
    }
}
