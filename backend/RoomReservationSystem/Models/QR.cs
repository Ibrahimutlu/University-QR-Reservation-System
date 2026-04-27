using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace RoomReservationSystem.Models
{
    public class QR
    {
        [Key]
        public int QRID { get; set; }

        [Required]
        [ForeignKey("Room")]
        public int RoomID { get; set; }

        [Required]
        public string QRCodeValue { get; set; }

        public bool IsActive { get; set; } = true;

        // Inverse nav — hidden from JSON to break serialization cycles.
        [JsonIgnore]
        public Room Room { get; set; }
    }
}