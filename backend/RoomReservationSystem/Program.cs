using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using System;

namespace RoomReservationSystem
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    // Railway / containers expose a $PORT env var we MUST bind to.
                    // Locally fall back to ASPNETCORE_URLS or the launchSettings default.
                    string port = Environment.GetEnvironmentVariable("PORT");
                    if (!string.IsNullOrEmpty(port))
                        webBuilder.UseUrls($"http://0.0.0.0:{port}");

                    webBuilder.UseStartup<Startup>();
                });
    }
}
