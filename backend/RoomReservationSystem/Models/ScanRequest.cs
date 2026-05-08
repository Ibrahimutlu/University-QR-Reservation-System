using System;

namespace RoomReservationSystem.Models
{
    public class ScanRequest
    {
        public int UserID { get; set; }
        public int RoomID { get; set; }
        public DateTime ScanTime { get; set; }
        public string ScanType { get; set; } // CheckIn or CheckOut
    }
}