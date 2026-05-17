using QRCoder;
using System;
using System.Text.Json;

namespace RoomReservationSystem.Services
{
    /// <summary>
    /// QR code generation service.
    /// Generates per-reservation QR codes that encode the reservation's
    /// identifier, the room, the user, and the validity window.
    /// The encoded payload is the canonical representation used by the
    /// QR validation flow when a student scans the door sticker.
    /// </summary>
    public class QRService
    {
        /// <summary>
        /// Generate a QR code (base64-encoded PNG, ready to be used in
        /// a "data:image/png;base64,…" img src) for the given reservation.
        /// </summary>
        public QRGenerationResult GenerateReservationQR(
            int reservationId,
            int roomId,
            int userId,
            DateTime startTime,
            DateTime endTime)
        {
            var payload = new
            {
                type        = "reservation",
                reservationId,
                roomId,
                userId,
                validFrom   = startTime.ToString("o"),
                validUntil  = endTime.ToString("o"),
                issuedAt    = DateTime.UtcNow.ToString("o")
            };

            string payloadJson = JsonSerializer.Serialize(payload);
            string imageDataUrl = RenderQRDataUrl(payloadJson);

            return new QRGenerationResult
            {
                Payload      = payloadJson,
                ImageDataUrl = imageDataUrl
            };
        }

        /// <summary>
        /// Generate a QR code from an arbitrary string (used for room-level
        /// stickers that admins print and tape on doors).
        /// </summary>
        public string GenerateFromString(string content)
        {
            return RenderQRDataUrl(content);
        }

        private static string RenderQRDataUrl(string content)
        {
            if (string.IsNullOrWhiteSpace(content))
                throw new ArgumentException("QR content cannot be empty.", nameof(content));

            using var generator = new QRCodeGenerator();
            using var qrCodeData = generator.CreateQrCode(content, QRCodeGenerator.ECCLevel.Q);

            // PngByteQRCode is stable on Linux containers (Railway) and
            // avoids System.Drawing-related runtime issues.
            try
            {
                var pngQrCode = new PngByteQRCode(qrCodeData);
                byte[] pngBytes = pngQrCode.GetGraphic(10);
                string base64 = Convert.ToBase64String(pngBytes);
                return "data:image/png;base64," + base64;
            }
            catch
            {
                // Fallback for environments where the PNG-byte renderer is
                // unavailable in the loaded QRCoder variant.
                var base64QrCode = new Base64QRCode(qrCodeData);
                string base64 = base64QrCode.GetGraphic(10);
                return "data:image/png;base64," + base64;
            }
        }

        // ──────────────────────────────────────────────────────────────────
        // Dynamic (rotating) QR.
        //
        // The QR value is derived from (roomId, current time bucket, secret).
        // The bucket width is QR_ROTATION_INTERVAL_MINUTES (default 2 min).
        // A scan is accepted if it matches ANY of the last
        // QR_ACCEPTANCE_WINDOWS buckets (default 4 → 8 minutes of tolerance).
        //
        // Widening the acceptance window is the root-cause fix for the
        // "QR denied on time" bug: at the previous 4-minute total tolerance,
        // a scan that landed near a bucket boundary was rejected even though
        // the displayed code was fresh on the screen.
        // ──────────────────────────────────────────────────────────────────
        public string GenerateDynamicQRValue(int roomId)
        {
            return BuildDynamicQR(roomId, CurrentBucket(DateTime.UtcNow));
        }

        public bool ValidateDynamicQRValue(int roomId, string qrValue)
        {
            if (string.IsNullOrEmpty(qrValue)) return false;

            int windows  = AcceptanceWindowCount();
            int interval = RotationIntervalMinutes();
            var now      = DateTime.UtcNow;

            for (int i = 0; i < windows; i++)
            {
                var bucket = CurrentBucket(now.AddMinutes(-i * interval));
                if (BuildDynamicQR(roomId, bucket) == qrValue) return true;
            }
            return false;
        }

        // Diagnostic snapshot used by /api/qr/health/{roomId}.
        public DynamicQRHealth GetDynamicQRHealth(int roomId)
        {
            int interval = RotationIntervalMinutes();
            int windows  = AcceptanceWindowCount();
            var now      = DateTime.UtcNow;
            var bucket   = CurrentBucket(now);
            var nextBucket = bucket.AddMinutes(interval);

            return new DynamicQRHealth
            {
                ServerUtcNow             = now,
                CurrentBucketStart       = bucket,
                NextRotationAt           = nextBucket,
                NextRotationInSeconds    = (int)Math.Max(0, (nextBucket - now).TotalSeconds),
                RotationIntervalMinutes  = interval,
                AcceptanceWindowCount    = windows,
                AcceptanceToleranceMin   = windows * interval,
                CurrentQRValue           = BuildDynamicQR(roomId, bucket)
            };
        }

        private static DateTime CurrentBucket(DateTime utc)
        {
            int interval = RotationIntervalMinutes();
            int safe = interval > 0 ? interval : 2;
            return new DateTime(
                utc.Year, utc.Month, utc.Day,
                utc.Hour, (utc.Minute / safe) * safe, 0,
                DateTimeKind.Utc);
        }

        private static string BuildDynamicQR(int roomId, DateTime bucketUtc)
        {
            string secret = GetDynamicSecret();
            string raw = $"ROOM-{roomId}-{bucketUtc:yyyyMMddHHmm}-{secret}";
            using var sha256 = System.Security.Cryptography.SHA256.Create();
            var bytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(raw));
            string hash = Convert.ToBase64String(bytes)
                                 .Replace("/", "_").Replace("+", "-").Replace("=", "");
            return $"DYN-{roomId}-{hash}";
        }

        private static string GetDynamicSecret()
        {
            var fromEnv = Environment.GetEnvironmentVariable("QR_DYNAMIC_SECRET");
            return string.IsNullOrWhiteSpace(fromEnv)
                ? "RoomReservationSystemSecretKey12345678901234567890"
                : fromEnv;
        }

        private static int RotationIntervalMinutes()
        {
            var raw = Environment.GetEnvironmentVariable("QR_ROTATION_INTERVAL_MINUTES");
            return int.TryParse(raw, out var n) && n > 0 ? n : 2;
        }

        private static int AcceptanceWindowCount()
        {
            var raw = Environment.GetEnvironmentVariable("QR_ACCEPTANCE_WINDOWS");
            return int.TryParse(raw, out var n) && n > 0 ? n : 4;
        }
    }

    public class DynamicQRHealth
    {
        public DateTime ServerUtcNow            { get; set; }
        public DateTime CurrentBucketStart      { get; set; }
        public DateTime NextRotationAt          { get; set; }
        public int      NextRotationInSeconds   { get; set; }
        public int      RotationIntervalMinutes { get; set; }
        public int      AcceptanceWindowCount   { get; set; }
        public int      AcceptanceToleranceMin  { get; set; }
        public string   CurrentQRValue          { get; set; }
    }

    public class QRGenerationResult
    {
        /// <summary>The JSON payload encoded inside the QR.</summary>
        public string Payload { get; set; }

        /// <summary>A "data:image/png;base64,…" URL that can be put directly in an &lt;img src&gt;.</summary>
        public string ImageDataUrl { get; set; }
    }
}
