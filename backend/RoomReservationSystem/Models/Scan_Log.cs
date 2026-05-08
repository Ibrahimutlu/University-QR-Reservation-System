using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace RoomReservationSystem.Models
{
    public class ScanLog
    {
        [Key]
        public int ScanLogID { get; set; }

        [Required]
        [ForeignKey("User")]
        public int UserID { get; set; }

        [Required]
        [ForeignKey("Room")]
        public int RoomID { get; set; }

        [ForeignKey("Reservation")]
        public int? ReservationID { get; set; }

        [Required]
        public DateTime ScanTime { get; set; } = DateTime.Now;

        [Required]
        public string ScanType { get; set; } // CheckIn or CheckOut

        [Required]
        public bool AccessGranted { get; set; } = false;

        // Navigation properties
        [JsonIgnore]
        public User User { get; set; }

        [JsonIgnore]
        public Room Room { get; set; }

        [JsonIgnore]
        public Reservation Reservation { get; set; }
    }
}