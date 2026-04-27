using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

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

      


        // Inverse navigation — hidden from JSON to break serialization cycles.
        // EF still uses it for joins / projections inside controllers.
        [JsonIgnore]
        public ICollection<Reservation> Reservations { get; set; }
    }
}
