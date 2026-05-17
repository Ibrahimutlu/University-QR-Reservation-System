using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Linq;
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

            // Idempotently adds final-submission columns/tables on older
            // deployed databases before the sweep starts querying them.
            services.AddHostedService<SchemaRepairService>();

            // Background sweep: turns dashboard-on-read warnings into
            // always-on enforcement (expired/no-show/no-exit/break-overrun).
            services.AddHostedService<ReservationSweepService>();

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
            // The allow-list is the UNION of:
            //   * baked-in production Vercel URL (default, never empty)
            //   * baked-in local dev origins (localhost / 127.0.0.1 on common ports)
            //   * any extra origins from FRONTEND_URL env var (comma-separated)
            //
            // FRONTEND_URL ADDS to the list — it does NOT replace the baked-in
            // production URL.  So even if the env var is forgotten, the live
            // Vercel frontend still works.  Trailing slashes are stripped.

            const string PROD_VERCEL_URL =
                "https://university-qr-reservation-system.vercel.app";

            var bakedOrigins = new System.Collections.Generic.List<string>
            {
                PROD_VERCEL_URL,
                "http://localhost:8000",
                "http://localhost:8080",
                "http://localhost:3000",
                "http://localhost:5173",
                "http://127.0.0.1:8000",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:5500"
            };

            string frontendUrls = Configuration["FRONTEND_URL"] ?? "";
            foreach (var raw in frontendUrls.Split(
                ',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                bakedOrigins.Add(raw.TrimEnd('/'));
            }

            // Deduplicate + strip trailing slashes for safety.
            var allowedOrigins = new System.Collections.Generic.HashSet<string>(
                System.StringComparer.OrdinalIgnoreCase);
            foreach (var o in bakedOrigins)
            {
                if (string.IsNullOrWhiteSpace(o)) continue;
                allowedOrigins.Add(o.TrimEnd('/'));
            }

            services.AddCors(options =>
            {
                options.AddPolicy("AllowFrontend", builder =>
                {
                    builder.WithOrigins(allowedOrigins.ToArray())
                           .AllowAnyMethod()
                           .AllowAnyHeader()
                           .AllowCredentials();
                });

                // Kept for legacy code paths only — not used by the pipeline below.
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

            // ─── Security headers (applied to every response) ────────────
            // CSP is intentionally NOT set here — this app serves only API
            // responses (the frontend lives on Vercel and sets its own CSP
            // via vercel.json). Setting connect-src 'self' on API responses
            // would only confuse anyone inspecting them.
            app.Use(async (ctx, next) =>
            {
                var h = ctx.Response.Headers;
                h["X-Content-Type-Options"] = "nosniff";
                h["X-Frame-Options"]        = "DENY";
                h["Referrer-Policy"]        = "strict-origin-when-cross-origin";
                h["Permissions-Policy"]     = "camera=(self), microphone=(), geolocation=()";
                await next();
            });

            // ─── Swagger: NOT public in production ───────────────────────
            // Default: enabled only when ASPNETCORE_ENVIRONMENT=Development
            // Opt-in for prod: set ENABLE_SWAGGER=true (and optionally
            //   SWAGGER_TOKEN to require ?token=... before the UI loads).
            bool swaggerEnabled = env.IsDevelopment() ||
                string.Equals(Configuration["ENABLE_SWAGGER"], "true",
                              StringComparison.OrdinalIgnoreCase);
            string swaggerToken = Configuration["SWAGGER_TOKEN"];

            if (swaggerEnabled)
            {
                if (!string.IsNullOrEmpty(swaggerToken))
                {
                    app.UseWhen(
                        ctx => ctx.Request.Path.StartsWithSegments("/swagger") &&
                               ctx.Request.Query["token"] != swaggerToken,
                        branch => branch.Run(async ctx =>
                        {
                            ctx.Response.StatusCode = 404;
                            await ctx.Response.WriteAsync("Not found.");
                        }));
                }
                app.UseSwagger();
                app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Room Reservation API v1"));
            }
            else
            {
                // Block /swagger entirely in production by default.
                app.UseWhen(
                    ctx => ctx.Request.Path.StartsWithSegments("/swagger"),
                    branch => branch.Run(async ctx =>
                    {
                        ctx.Response.StatusCode = 404;
                        await ctx.Response.WriteAsync("Not found.");
                    }));
            }

            // HTTPS redirection only when not on a PaaS (Railway terminates TLS
            // upstream). The FORCE_HTTPS env var can opt back in if needed.
            bool forceHttps = string.Equals(Configuration["FORCE_HTTPS"], "true",
                                            StringComparison.OrdinalIgnoreCase);
            if (forceHttps)
                app.UseHttpsRedirection();

            app.UseRouting();

            // Same strict allow-list in dev and prod. The list already
            // contains every localhost origin we need locally, so there is no
            // reason to fall back to AllowAnyOrigin even in development.
            app.UseCors("AllowFrontend");

            app.UseAuthentication();
            app.UseAuthorization();
            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
                endpoints.MapGet("/", async ctx =>
                {
                    ctx.Response.ContentType = "text/plain";
                    await ctx.Response.WriteAsync(
                        "RoomLink API is running. The frontend is hosted separately on Vercel.");
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
