using System;

namespace RoomReservationSystem.Models
{
    public class UpdateReservationRequest
    {
        public DateTime ReservationDate { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
    }
}