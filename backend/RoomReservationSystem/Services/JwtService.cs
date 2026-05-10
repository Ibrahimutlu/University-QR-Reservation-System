using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using RoomReservationSystem.Models;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace RoomReservationSystem.Services
{
    public class JwtService
    {
        private readonly string _secret;
        private readonly int _expiryInDays;

        public JwtService(IConfiguration configuration)
        {
            // Keep secret resolution in sync with Startup token validation.
            _secret =
                configuration["JWT_SECRET"]
                ?? configuration["JwtSettings:Secret"]
                ?? "DEV_ONLY_FALLBACK_SECRET_REPLACE_IN_PRODUCTION_ENV";

            var expiryRaw =
                configuration["JWT_EXPIRY_DAYS"]
                ?? configuration["JwtSettings:ExpiryInDays"];

            if (!int.TryParse(expiryRaw, out var expiryInDays) || expiryInDays <= 0)
            {
                expiryInDays = 7;
            }

            _expiryInDays = expiryInDays;
        }

        public string GenerateToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_secret);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.UserID.ToString()),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, user.Role)
                }),
                Expires = DateTime.UtcNow.AddDays(_expiryInDays),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}
