using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace RoomReservationSystem.Models
{
    public class User
    {
        [Key]
        public int UserID { get; set; }

        [Required]
        public string FirstName { get; set; }

        [Required]
        public string LastName { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        public string Password { get; set; }

        [Required]
        public string Role { get; set; }

        public string StudentNumber { get; set; }

      


        public ICollection<Reservation> Reservations { get; set; }
    }
}
