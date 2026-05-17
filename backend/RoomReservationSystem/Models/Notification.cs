using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace RoomReservationSystem.Models
{
    public class Notification
    {
        [Key]
        public int NotificationID { get; set; }

        [Required]
        [ForeignKey("User")]
        public int UserID { get; set; }

        [ForeignKey("Reservation")]
        public int? ReservationID { get; set; }

        [Required]
        public string Type { get; set; }

        [Required]
        public string Message { get; set; }

        [Required]
        public string Severity { get; set; } = "warning";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ReadAt { get; set; }

        [JsonIgnore]
        public User User { get; set; }

        [JsonIgnore]
        public Reservation Reservation { get; set; }
    }
}
