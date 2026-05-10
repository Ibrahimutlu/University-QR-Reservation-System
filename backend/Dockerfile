# ──────────────────────────────────────────────────────────────────
# RoomLink backend — multi-stage Dockerfile
# Targets .NET 5.0 because that is what the project pins via global.json.
# ──────────────────────────────────────────────────────────────────

# Stage 1 — build & publish
FROM mcr.microsoft.com/dotnet/sdk:5.0 AS build
WORKDIR /src

# Copy csproj first to leverage Docker layer cache for nuget restore.
COPY RoomReservationSystem/RoomReservationSystem.csproj RoomReservationSystem/
COPY global.json ./
RUN dotnet restore RoomReservationSystem/RoomReservationSystem.csproj

# Copy the rest of the source and publish a self-contained release.
COPY . .
RUN dotnet publish RoomReservationSystem/RoomReservationSystem.csproj \
        -c Release \
        -o /app/publish \
        --no-restore

# Stage 2 — runtime
FROM mcr.microsoft.com/dotnet/aspnet:5.0
WORKDIR /app
COPY --from=build /app/publish .

# Railway / container platforms set $PORT at runtime; default to 8080 locally.
ENV ASPNETCORE_ENVIRONMENT=Production
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "RoomReservationSystem.dll"]
