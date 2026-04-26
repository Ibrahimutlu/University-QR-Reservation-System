using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

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

        public Room Room { get; set; }
    }
}