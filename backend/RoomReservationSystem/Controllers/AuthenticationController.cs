using Microsoft.AspNetCore.Mvc;
using RoomReservationSystem.Data;
using RoomReservationSystem.Models;
using RoomReservationSystem.Services;
using Microsoft.AspNetCore.Authorization;
using System.Linq;

namespace RoomReservationSystem.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly JwtService _jwtService;

        public AuthController(AppDbContext context, JwtService jwtService)
        {
            _context = context;
            _jwtService = jwtService;
        }

      

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest user)
        {
            if (user == null)
                return BadRequest("Invalid login details");

            var existingUser = _context.Users.FirstOrDefault(u =>
                u.Email == user.Email &&
                u.Password == user.Password);

            if (existingUser == null)
                return Unauthorized("Invalid email or password");

            var token = _jwtService.GenerateToken(existingUser);

            return Ok(new
            {
                message = "Login successful",
                token = token,
                role = existingUser.Role,
                userID = existingUser.UserID
            });
        }
    }
}