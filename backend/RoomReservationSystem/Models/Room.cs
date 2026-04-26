using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

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

       

        public ICollection<Reservation> Reservations { get; set; }

        public QR QR { get; set; }
    }
}