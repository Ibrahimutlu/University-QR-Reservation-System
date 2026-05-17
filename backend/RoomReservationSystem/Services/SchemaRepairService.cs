using System;
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
    /// Lightweight deployment guard for Railway/local databases that were
    /// created before the final-submission schema changes. It only adds or
    /// widens required objects; it never drops data tables.
    /// </summary>
    public class SchemaRepairService : IHostedService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<SchemaRepairService> _logger;

        public SchemaRepairService(
            IServiceScopeFactory scopeFactory,
            ILogger<SchemaRepairService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                db.Database.ExecuteSqlRaw(Sql);
                _logger.LogInformation("Schema repair completed");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Schema repair failed; application will continue");
            }

            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

        private const string Sql = @"
ALTER TABLE IF EXISTS rooms
    ADD COLUMN IF NOT EXISTS ""IsDemoRoom"" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS reservations
    ADD COLUMN IF NOT EXISTS ""IsDemoReservation"" BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
DECLARE c record;
BEGIN
    FOR c IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'reservations'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%""Status""%'
    LOOP
        EXECUTE format('ALTER TABLE reservations DROP CONSTRAINT IF EXISTS %I', c.conname);
    END LOOP;

    ALTER TABLE reservations
        ADD CONSTRAINT reservations_status_check
        CHECK (""Status"" IN (
            'Pending', 'Confirmed', 'Active',
            'CheckedIn', 'OnBreak', 'CheckedOut',
            'Cancelled', 'Expired', 'NoShow'
        ));
EXCEPTION WHEN undefined_table OR check_violation THEN
    NULL;
END $$;

DO $$
DECLARE c record;
BEGIN
    FOR c IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'scan_logs'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%""ScanType""%'
    LOOP
        EXECUTE format('ALTER TABLE scan_logs DROP CONSTRAINT IF EXISTS %I', c.conname);
    END LOOP;

    ALTER TABLE scan_logs
        ADD CONSTRAINT scan_logs_scantype_check
        CHECK (""ScanType"" IN ('CheckIn', 'CheckOut', 'BreakOut', 'BreakIn'));
EXCEPTION WHEN undefined_table OR check_violation THEN
    NULL;
END $$;

DO $$
BEGIN
    DROP INDEX IF EXISTS idx_reservations_one_active_per_user;
    CREATE UNIQUE INDEX idx_reservations_one_active_per_user
        ON reservations (""UserID"")
        WHERE ""Status"" IN ('Pending', 'Confirmed', 'Active', 'CheckedIn', 'OnBreak')
          AND ""IsDemoReservation"" = FALSE;
EXCEPTION WHEN undefined_table OR unique_violation THEN
    NULL;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
    ""NotificationID"" SERIAL PRIMARY KEY,
    ""UserID""         INTEGER NOT NULL REFERENCES users(""UserID"") ON DELETE CASCADE,
    ""ReservationID""  INTEGER REFERENCES reservations(""ReservationID"") ON DELETE SET NULL,
    ""Type""           VARCHAR(30) NOT NULL
                      CHECK (""Type"" IN (
                         'CheckInGraceWarning','Overstay','NoExit',
                         'BreakOverrun','Expired','NoShow','Info'
                      )),
    ""Message""        TEXT NOT NULL,
    ""Severity""       VARCHAR(10) NOT NULL DEFAULT 'warning'
                      CHECK (""Severity"" IN ('info','warning','error')),
    ""CreatedAt""      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ""ReadAt""         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications (""UserID"", ""CreatedAt"" DESC)
    WHERE ""ReadAt"" IS NULL;

INSERT INTO rooms (""RoomName"", ""RoomType"", ""Capacity"", ""Location"", ""IsAvailable"", ""IsDemoRoom"")
SELECT 'Demo Presentation Room', 'Demo Room', 30, 'Building 1, Demo Hall', TRUE, TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM rooms WHERE ""RoomName"" = 'Demo Presentation Room'
);

DO $$
BEGIN
    INSERT INTO qr_codes (""RoomID"", ""QRCodeValue"", ""IsActive"")
    SELECT r.""RoomID"",
           'ROOM-' || r.""RoomID"" || '-' ||
           UPPER(regexp_replace(COALESCE(r.""RoomName"", 'ROOM'), '[^a-zA-Z0-9]', '', 'g')),
           TRUE
    FROM rooms r
    WHERE NOT EXISTS (
        SELECT 1 FROM qr_codes q WHERE q.""RoomID"" = r.""RoomID""
    );
EXCEPTION WHEN undefined_table OR unique_violation THEN
    NULL;
END $$;
";
    }
}
