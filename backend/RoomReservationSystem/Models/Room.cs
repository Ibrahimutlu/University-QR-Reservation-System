using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace RoomReservationSystem.Models
{
    public class Room
    {
        [Key]
        public int RoomID { get; set; }

        [Required]
        public string RoomName { get; set; }

        [Required]
        public string RoomType { get; set; }

        [Required]
        public int Capacity { get; set; }

        [Required]
        public string Location { get; set; }

        public bool IsAvailable { get; set; } = true;

        public string QRCode { get; set; }

       

        // Inverse navs — hidden from JSON to break serialization cycles.
        [JsonIgnore]
        public ICollection<Reservation> Reservations { get; set; }

        [JsonIgnore]
        public QR QR { get; set; }
    }
}