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

            var existingUser = _context.Users.FirstOrDefault(u => u.Email == user.Email);

            if (existingUser == null || existingUser.Password != user.Password)
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

        [HttpPost("register")]
        [Authorize(Roles = "Admin")]
        public IActionResult Register([FromBody] RegisterRequest request)
        {
            if (request == null)
                return BadRequest("Invalid registration details");

            if (string.IsNullOrEmpty(request.FirstName) ||
                string.IsNullOrEmpty(request.LastName) ||
                string.IsNullOrEmpty(request.Email) ||
                string.IsNullOrEmpty(request.Password) ||
                string.IsNullOrEmpty(request.Role))
                return BadRequest("All fields are required");

            var validRoles = new[] { "Student", "Staff", "Admin" };
            if (!validRoles.Contains(request.Role))
                return BadRequest("Role must be Student, Staff, or Admin");

            if (_context.Users.Any(u => u.Email == request.Email))
                return BadRequest("A user with this email already exists");

            var user = new User
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                Email = request.Email,
                Password = request.Password,
                Role = request.Role,
                StudentNumber = request.StudentNumber
            };

            _context.Users.Add(user);
            _context.SaveChanges();

            return Ok(new
            {
                message = "User registered successfully",
                userID = user.UserID,
                email = user.Email,
                role = user.Role
            });
        }
    }
}