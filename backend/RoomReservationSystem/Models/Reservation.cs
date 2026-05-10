using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RoomReservationSystem.Models
{
    public class Reservation
    {
        [Key]
        public int ReservationID { get; set; }

        [Required]
        [ForeignKey("User")]
        public int UserID { get; set; }

        [Required]
        [ForeignKey("Room")]
        public int RoomID { get; set; }

        [Required]
        public DateTime ReservationDate { get; set; }

        [Required]
        public DateTime StartTime { get; set; }

        [Required]
        public DateTime EndTime { get; set; }

        public string Status { get; set; } = "Pending";

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        // JSON payload encoded inside the QR code generated when the
        // reservation is confirmed. Used by the QR validation endpoint
        // to authorise check-in.
        public string QRCodeData { get; set; }

        public User User { get; set; }

        public Room Room { get; set; }
    }
}
