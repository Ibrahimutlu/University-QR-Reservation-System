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
            using var generator = new QRCodeGenerator();
            using var qrCodeData = generator.CreateQrCode(content, QRCodeGenerator.ECCLevel.Q);
            var base64QrCode = new Base64QRCode(qrCodeData);
            string base64 = base64QrCode.GetGraphic(10);
            return "data:image/png;base64," + base64;
        }

        public string GenerateDynamicQRValue(int roomId)
        {
            var now = DateTime.UtcNow;
            var timeWindow = new DateTime(now.Year, now.Month, now.Day, now.Hour, (now.Minute / 2) * 2, 0);
            string secret = "RoomReservationSystemSecretKey12345678901234567890";
            string raw = $"ROOM-{roomId}-{timeWindow:yyyyMMddHHmm}-{secret}";
            using var sha256 = System.Security.Cryptography.SHA256.Create();
            var bytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(raw));
            string hash = Convert.ToBase64String(bytes).Replace("/", "_").Replace("+", "-").Replace("=", "");
            return $"DYN-{roomId}-{hash}";
        }

        public bool ValidateDynamicQRValue(int roomId, string qrValue)
        {
            string currentQR = GenerateDynamicQRValue(roomId);
            if (currentQR == qrValue) return true;

            var now = DateTime.UtcNow.AddMinutes(-2);
            var timeWindow = new DateTime(now.Year, now.Month, now.Day, now.Hour, (now.Minute / 2) * 2, 0);
            string secret = "RoomReservationSystemSecretKey12345678901234567890";
            string raw = $"ROOM-{roomId}-{timeWindow:yyyyMMddHHmm}-{secret}";
            using var sha256 = System.Security.Cryptography.SHA256.Create();
            var bytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(raw));
            string previousQR = $"DYN-{roomId}-{Convert.ToBase64String(bytes).Replace("/", "_").Replace("+", "-").Replace("=", "")}";
            return previousQR == qrValue;
        }
    }

    public class QRGenerationResult
    {
        /// <summary>The JSON payload encoded inside the QR.</summary>
        public string Payload { get; set; }

        /// <summary>A "data:image/png;base64,…" URL that can be put directly in an &lt;img src&gt;.</summary>
        public string ImageDataUrl { get; set; }
    }
}
