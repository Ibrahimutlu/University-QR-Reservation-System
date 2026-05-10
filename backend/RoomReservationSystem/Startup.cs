using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using RoomReservationSystem.Data;
using RoomReservationSystem.Services;
using System;
using System.Text;

namespace RoomReservationSystem
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        public void ConfigureServices(IServiceCollection services)
        {
            services.AddControllers();

            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
                {
                    Title   = "Room Reservation API",
                    Version = "v1"
                });
                c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                {
                    Description = "JWT Authorization header. Enter: Bearer {token}",
                    Name        = "Authorization",
                    In          = Microsoft.OpenApi.Models.ParameterLocation.Header,
                    Type        = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
                    Scheme      = "Bearer"
                });
                c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
                {
                    {
                        new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                        {
                            Reference = new Microsoft.OpenApi.Models.OpenApiReference
                            {
                                Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                                Id   = "Bearer"
                            }
                        },
                        new string[] {}
                    }
                });
            });

            // ─── Database connection ─────────────────────────────────────
            // Production: read DATABASE_URL (Railway / Neon style URI).
            // Development: fall back to ConnectionStrings:DefaultConnection in appsettings.json.
            services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(BuildConnectionString(Configuration)));

            // Application services
            services.AddScoped<JwtService>();
            services.AddSingleton<QRService>();

            // ─── JWT ─────────────────────────────────────────────────────
            // Secret resolution order:
            //   1. environment variable JWT_SECRET
            //   2. appsettings JwtSettings:Secret
            string jwtSecret =
                Configuration["JWT_SECRET"]
                ?? Configuration["JwtSettings:Secret"]
                ?? "DEV_ONLY_FALLBACK_SECRET_REPLACE_IN_PRODUCTION_ENV";

            var key = Encoding.ASCII.GetBytes(jwtSecret);
            services.AddAuthentication(x =>
            {
                x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                x.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(x =>
            {
                x.RequireHttpsMetadata = false;
                x.SaveToken            = true;
                x.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey         = new SymmetricSecurityKey(key),
                    ValidateIssuer           = false,
                    ValidateAudience         = false
                };
            });

            services.AddAuthorization(options =>
            {
                options.AddPolicy("StudentOnly",    p => p.RequireRole("Student"));
                options.AddPolicy("StaffOnly",      p => p.RequireRole("Staff"));
                options.AddPolicy("AdminOnly",      p => p.RequireRole("Admin"));
                options.AddPolicy("StudentOrStaff", p => p.RequireRole("Student", "Staff"));
                options.AddPolicy("StaffOrAdmin",   p => p.RequireRole("Staff", "Admin"));
            });

            // ─── CORS ────────────────────────────────────────────────────
            // Allowed origins:
            //   * FRONTEND_URL env var (one or more, comma-separated)
            //   * localhost:8000 / 8080 / 3000 / 5173 for local dev
            //   * AllowAll fallback policy is also registered for legacy code paths
            string frontendUrls = Configuration["FRONTEND_URL"] ?? "";
            string[] envOrigins = frontendUrls
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            services.AddCors(options =>
            {
                options.AddPolicy("AllowFrontend", builder =>
                {
                    var origins = new System.Collections.Generic.List<string>
                    {
                        "http://localhost:8000",
                        "http://localhost:8080",
                        "http://localhost:3000",
                        "http://localhost:5173",
                        "http://127.0.0.1:8000",
                        "http://127.0.0.1:5500"
                    };
                    foreach (var o in envOrigins) origins.Add(o);
                    builder.WithOrigins(origins.ToArray())
                           .AllowAnyMethod()
                           .AllowAnyHeader()
                           .AllowCredentials();
                });

                options.AddPolicy("AllowAll", builder =>
                {
                    builder.AllowAnyOrigin()
                           .AllowAnyMethod()
                           .AllowAnyHeader();
                });
            });
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            // Expose Swagger in every environment so Railway demos can use it.
            app.UseSwagger();
            app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Room Reservation API v1"));

            // HTTPS redirection only when not on a PaaS (Railway terminates TLS
            // upstream). The FORCE_HTTPS env var can opt back in if needed.
            bool forceHttps = string.Equals(Configuration["FORCE_HTTPS"], "true",
                                            StringComparison.OrdinalIgnoreCase);
            if (forceHttps)
                app.UseHttpsRedirection();

            app.UseRouting();

            // Use the strict frontend policy in production, AllowAll in dev.
            app.UseCors(env.IsDevelopment() ? "AllowAll" : "AllowFrontend");

            app.UseAuthentication();
            app.UseAuthorization();
            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
                endpoints.MapGet("/", async ctx =>
                {
                    ctx.Response.ContentType = "text/plain";
                    await ctx.Response.WriteAsync(
                        "RoomLink API is running. See /swagger for the contract.");
                });
                endpoints.MapGet("/health", async ctx =>
                {
                    ctx.Response.ContentType = "application/json";
                    await ctx.Response.WriteAsync("{\"status\":\"ok\"}");
                });
            });
        }

        // ─────────────────────────────────────────────────────────────────
        // Connection string resolver.
        //
        //   1. If env var DATABASE_URL is set in URI form (the standard format
        //      used by Railway / Neon / Heroku), parse it into Npgsql key=value.
        //   2. Else if a raw key=value string is provided in DATABASE_URL,
        //      pass it through unchanged.
        //   3. Else fall back to ConnectionStrings:DefaultConnection in
        //      appsettings.json (local development).
        // ─────────────────────────────────────────────────────────────────
        private static string BuildConnectionString(IConfiguration config)
        {
            string dbUrl = config["DATABASE_URL"];

            if (!string.IsNullOrWhiteSpace(dbUrl))
            {
                if (dbUrl.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
                    dbUrl.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
                {
                    var uri = new Uri(dbUrl);
                    string user = Uri.UnescapeDataString(uri.UserInfo.Split(':')[0]);
                    string pass = uri.UserInfo.Contains(':')
                        ? Uri.UnescapeDataString(uri.UserInfo.Split(':')[1])
                        : "";
                    string host = uri.Host;
                    int    port = uri.Port > 0 ? uri.Port : 5432;
                    string db   = uri.AbsolutePath.TrimStart('/');

                    // Most managed Postgres providers (Neon, Railway) require SSL.
                    return $"Host={host};Port={port};Database={db};" +
                           $"Username={user};Password={pass};" +
                           $"SSL Mode=Require;Trust Server Certificate=true;";
                }

                // Treat as a raw Npgsql connection string already.
                return dbUrl;
            }

            return config.GetConnectionString("DefaultConnection");
        }
    }
}
