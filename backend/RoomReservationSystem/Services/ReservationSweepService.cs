using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RoomReservationSystem.Data;

namespace RoomReservationSystem.Services
{
    /// <summary>
    /// Periodic sweep that turns dashboard-on-read warnings into
    /// always-on enforcement: even if a student never opens the app,
    /// expired/no-show/overstay/break-overrun transitions happen and
    /// the right notifications fire.
    ///
    /// Cadence: SWEEP_INTERVAL_SECONDS env var, default 60.
    /// </summary>
    public class ReservationSweepService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<ReservationSweepService> _logger;

        // "Live" reservation statuses for the sweep.
        private static readonly string[] LiveBeforeCheckIn =
            { "Pending", "Confirmed", "Active" };

        private static readonly string[] LiveInsideRoom =
            { "CheckedIn", "OnBreak" };

        public ReservationSweepService(
            IServiceScopeFactory scopeFactory,
            ILogger<ReservationSweepService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            int periodSec = ParseEnvIntOrDefault("SWEEP_INTERVAL_SECONDS", 60);
            // Light startup delay so the host finishes wiring up the DB.
            try { await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken); }
            catch (TaskCanceledException) { return; }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    RunOnce();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "ReservationSweepService pass failed");
                }

                try { await Task.Delay(TimeSpan.FromSeconds(periodSec), stoppingToken); }
                catch (TaskCanceledException) { break; }
            }
        }

        private void RunOnce()
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            int grace      = ParseEnvIntOrDefault("CHECKIN_GRACE_PERIOD_MINUTES", 15);
            int breakLimit = ParseEnvIntOrDefault("BREAK_DURATION_MINUTES", 15);
            int noExitGrace= ParseEnvIntOrDefault("CHECKOUT_GRACE_PERIOD_MINUTES", 5);
            var now        = DateTime.UtcNow;

            // 1) Reservations whose window has fully passed:
            //    - if checked in (or on break) -> NoExit notification + auto-checkout
            //    - if never checked in        -> NoShow + notification
            var ended = db.Reservations
                .Where(r => r.EndTime < now &&
                            (LiveBeforeCheckIn.Contains(r.Status) ||
                             LiveInsideRoom.Contains(r.Status)))
                .ToList();

            // Pre-pull check-in info in one go.
            var endedIds = ended.Select(r => r.ReservationID).ToList();
            var checkedInIds = db.ScanLogs
                .Where(s => endedIds.Contains(s.ReservationID ?? -1) &&
                            s.ScanType == "CheckIn" && s.AccessGranted)
                .Select(s => s.ReservationID.Value)
                .ToHashSet();

            foreach (var r in ended)
            {
                bool hadCheckIn =
                    checkedInIds.Contains(r.ReservationID) ||
                    LiveInsideRoom.Contains(r.Status);

                if (hadCheckIn)
                {
                    // Auto-checkout once we are far enough past EndTime to be sure
                    // the student is not just running late on the way out.
                    if ((now - r.EndTime).TotalMinutes >= noExitGrace)
                    {
                        r.Status = "CheckedOut";
                        r.UpdatedAt = now;
                        NotificationService.Fire(
                            db, r.UserID, r.ReservationID,
                            NotificationService.Types.NoExit,
                            "Your reservation ended and no check-out scan was recorded. " +
                            "The system closed your room session automatically.",
                            NotificationService.Severity.Warning,
                            save: false);
                    }
                }
                else
                {
                    r.Status = "NoShow";
                    r.UpdatedAt = now;
                    NotificationService.Fire(
                        db, r.UserID, r.ReservationID,
                        NotificationService.Types.NoShow,
                        "The reservation window ended without a check-in. " +
                        "The reservation was marked as NoShow.",
                        NotificationService.Severity.Warning,
                        save: false);
                }
            }

            // 2) Reservations inside the booked window but never checked in,
            //    past the grace period -> Expired + notification.
            var liveCutoff = now.AddMinutes(-grace);
            var noCheckinCandidates = db.Reservations
                .Where(r => LiveBeforeCheckIn.Contains(r.Status) &&
                            r.StartTime <= liveCutoff &&
                            r.EndTime   >= now)
                .ToList();

            var ncIds = noCheckinCandidates.Select(r => r.ReservationID).ToList();
            var checkedInForNc = db.ScanLogs
                .Where(s => ncIds.Contains(s.ReservationID ?? -1) &&
                            s.ScanType == "CheckIn" && s.AccessGranted)
                .Select(s => s.ReservationID.Value)
                .ToHashSet();

            foreach (var r in noCheckinCandidates)
            {
                if (checkedInForNc.Contains(r.ReservationID)) continue;
                r.Status = "Expired";
                r.UpdatedAt = now;
                NotificationService.Fire(
                    db, r.UserID, r.ReservationID,
                    NotificationService.Types.Expired,
                    "The check-in grace period expired. The reservation was closed.",
                    NotificationService.Severity.Warning,
                    save: false);
            }

            // 3) Reservations currently in OnBreak past the break limit
            //    -> BreakOverrun notification (status stays OnBreak until
            //       the student scans back in or the window closes).
            var onBreak = db.Reservations
                .Where(r => r.Status == "OnBreak")
                .ToList();

            foreach (var r in onBreak)
            {
                var lastBreakOut = db.ScanLogs
                    .Where(s => s.ReservationID == r.ReservationID &&
                                s.ScanType == "BreakOut" &&
                                s.AccessGranted)
                    .OrderByDescending(s => s.ScanTime)
                    .Select(s => (DateTime?)s.ScanTime)
                    .FirstOrDefault();

                if (!lastBreakOut.HasValue) continue;
                if ((now - lastBreakOut.Value).TotalMinutes > breakLimit)
                {
                    NotificationService.Fire(
                        db, r.UserID, r.ReservationID,
                        NotificationService.Types.BreakOverrun,
                        $"Your break exceeded the {breakLimit}-minute limit. " +
                        "Please return to the room and scan the QR again.",
                        NotificationService.Severity.Warning,
                        save: false);
                }
            }

            db.SaveChanges();
        }

        private static int ParseEnvIntOrDefault(string name, int fallback)
        {
            var raw = Environment.GetEnvironmentVariable(name);
            if (int.TryParse(raw, out var n) && n > 0) return n;
            return fallback;
        }
    }
}
