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

            if (string.IsNullOrWhiteSpace(user.Email) || string.IsNullOrWhiteSpace(user.Password))
                return BadRequest("Email and password are required");

            var existingUser = _context.Users.FirstOrDefault(u => u.Email == user.Email);

            if (existingUser == null || existingUser.Password != user.Password)
                return Unauthorized("Invalid email or password");

            if (existingUser.Role != "Admin" && existingUser.Role != "Staff")
                return Unauthorized("Students must use student number login");

            return Ok(BuildLoginResponse(existingUser, "Admin/Staff login successful"));
        }

        [HttpPost("student-login")]
        public IActionResult StudentLogin([FromBody] StudentLoginRequest user)
        {
            if (user == null)
                return BadRequest("Invalid login details");

            if (string.IsNullOrWhiteSpace(user.StudentNumber) || string.IsNullOrWhiteSpace(user.Password))
                return BadRequest("Student number and password are required");

            var existingUser = _context.Users.FirstOrDefault(u =>
                u.StudentNumber == user.StudentNumber &&
                u.Role == "Student");

            if (existingUser == null || existingUser.Password != user.Password)
                return Unauthorized("Invalid student number or password");

            return Ok(BuildLoginResponse(existingUser, "Student login successful"));
        }

        private object BuildLoginResponse(User user, string message)
        {
            var token = _jwtService.GenerateToken(user);

            return new
            {
                message,
                token = token,
                role = user.Role,
                userID = user.UserID,
                email = user.Email,
                studentNumber = user.StudentNumber
            };
        }

        [HttpPost("register")]
        [Authorize(Roles = "Admin")]
        public IActionResult Register([FromBody] RegisterRequest request)
        {
            if (request == null)
                return BadRequest("Invalid registration details");

            if (string.IsNullOrWhiteSpace(request.FirstName) ||
                string.IsNullOrWhiteSpace(request.LastName) ||
                string.IsNullOrWhiteSpace(request.Password))
                return BadRequest("First name, last name, and password are required");

            // System rule: this endpoint is only for student onboarding.
            if (!string.IsNullOrWhiteSpace(request.Role) && request.Role != "Student")
                return BadRequest("Only students can be registered from this panel");

            if (string.IsNullOrWhiteSpace(request.StudentNumber))
                return BadRequest("Student number is required");

            if (_context.Users.Any(u => u.StudentNumber == request.StudentNumber))
                return BadRequest("A student with this number already exists");

            string email = string.IsNullOrWhiteSpace(request.Email)
                ? $"{request.StudentNumber}@students.roomlink.local"
                : request.Email.Trim();

            if (_context.Users.Any(u => u.Email == email))
                return BadRequest("A user with this email already exists");

            var user = new User
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                Email = email,
                Password = request.Password,
                Role = "Student",
                StudentNumber = request.StudentNumber
            };

            _context.Users.Add(user);
            _context.SaveChanges();

            return Ok(new
            {
                message = "Student registered successfully",
                userID = user.UserID,
                email = user.Email,
                role = user.Role,
                studentNumber = user.StudentNumber
            });
        }
    }
}
