using Microsoft.EntityFrameworkCore;
using RoomReservationSystem.Models;

namespace RoomReservationSystem.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Room> Rooms { get; set; }
        public DbSet<Reservation> Reservations { get; set; }
        public DbSet<QR> QRCodes { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>().ToTable("users");
            modelBuilder.Entity<Room>().ToTable("rooms");
            modelBuilder.Entity<Reservation>().ToTable("reservations");
            modelBuilder.Entity<QR>().ToTable("qr_codes");
        }
    }
}