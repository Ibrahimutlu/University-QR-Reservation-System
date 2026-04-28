@echo off
chcp 65001 >nul
title RoomLink - One-click Demo Launcher
cd /d "%~dp0"

echo.
echo ====================================================
echo  RoomLink - University Room Reservation System
echo  One-click Demo Launcher
echo ====================================================
echo.

REM ---- 1. .NET SDK detection ----------------------------
set "DOTNET=C:\Program Files\dotnet\dotnet.exe"
if not exist "%DOTNET%" (
    echo [ERROR] .NET 5 SDK not found at:
    echo         %DOTNET%
    echo         Install from https://dotnet.microsoft.com/download/dotnet/5.0
    pause
    exit /b 1
)
echo [1/5] .NET SDK             OK

REM ---- 2. WSL detection ---------------------------------
where wsl >nul 2>&1
if errorlevel 1 (
    echo [ERROR] WSL is not installed. Install with: wsl --install
    pause
    exit /b 1
)
echo [2/5] WSL                  OK

REM ---- 3. Database setup --------------------------------
echo [3/5] Database setup...

REM Convert this script's database/ directory to a WSL path
for /f "tokens=*" %%i in ('wsl wslpath "%~dp0database"') do set "DB_DIR=%%i"

REM 3a. Start postgres in WSL and apply schema + seed (idempotent)
wsl bash -c "set -e; service postgresql status >/dev/null 2>&1 || sudo -n service postgresql start >/dev/null 2>&1 || sudo service postgresql start >/dev/null 2>&1; PGPASSWORD=postgres psql -U postgres -h localhost -c 'SELECT 1' >/dev/null 2>&1 || { echo 'PostgreSQL is not reachable on localhost:5432'; exit 1; }; PGPASSWORD=postgres psql -U postgres -h localhost -tc \"SELECT 1 FROM pg_database WHERE datname='RoomReservationDB'\" | grep -q 1 || PGPASSWORD=postgres psql -U postgres -h localhost -c 'CREATE DATABASE \"RoomReservationDB\"' >/dev/null; PGPASSWORD=postgres psql -U postgres -h localhost -d RoomReservationDB -f '%DB_DIR%/schema.sql' >/dev/null; PGPASSWORD=postgres psql -U postgres -h localhost -d RoomReservationDB -f '%DB_DIR%/seed.sql' >/dev/null"

if errorlevel 1 (
    echo [ERROR] Database setup failed.
    echo         Check that PostgreSQL is installed in WSL and that user 'postgres' has password 'postgres'.
    pause
    exit /b 1
)
echo       Schema + seed applied.

REM 3b. Make sure Windows can reach Postgres at localhost:5432.
REM     If WSL2 hasn't forwarded the port (Postgres bound to 127.0.0.1
REM     only), run fix-pg-bind.sh once to switch listen_addresses to '*'.
echo       Verifying Windows can reach Postgres...
powershell -NoProfile -Command "if (-not (Test-NetConnection -ComputerName localhost -Port 5432 -InformationLevel Quiet -WarningAction SilentlyContinue)) { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo       Not reachable from Windows. Applying one-time bind fix...
    wsl bash "%DB_DIR%/fix-pg-bind.sh" >nul 2>&1
    powershell -NoProfile -Command "if (-not (Test-NetConnection -ComputerName localhost -Port 5432 -InformationLevel Quiet -WarningAction SilentlyContinue)) { exit 1 }" >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Postgres still not reachable from Windows.
        echo         Run database\fix-pg-bind.sh manually inside WSL.
        pause
        exit /b 1
    )
    echo       Bind fix applied.
) else (
    echo       Reachable from Windows.
)

REM ---- 4. Start backend in a new window -----------------
REM     Bind to 0.0.0.0 so phones / other devices on the LAN
REM     can reach the API at http://<your-PC-IP>:5000
echo [4/5] Backend  (http://0.0.0.0:5000 — reachable from phones on your Wi-Fi)
start "RoomLink Backend" cmd /k "set PATH=C:\Program Files\dotnet;%%PATH%% && cd /d %~dp0backend\RoomReservationSystem && set ASPNETCORE_URLS=http://0.0.0.0:5000 && dotnet run"

REM Wait up to ~25s for the backend to listen
echo       Waiting for backend to come online...
set /a TRIES=0
:wait_backend
set /a TRIES+=1
if %TRIES% gtr 25 goto :launch_frontend
powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 http://localhost:5000/swagger/v1/swagger.json).StatusCode } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto :wait_backend
)
echo       Backend is responding.

:launch_frontend
REM ---- 5. Start frontend & open browser -----------------
echo [5/5] Frontend (http://localhost:8000)
start "RoomLink Frontend" cmd /k "cd /d %~dp0frontend && python -m http.server 8000"

timeout /t 2 /nobreak >nul
start "" http://localhost:8000

echo.
echo ====================================================
echo   Services are running:
echo     Backend   http://localhost:5000   (Swagger: /swagger)
echo     Frontend  http://localhost:8000
echo.
echo   Demo accounts:
echo     Student   ahmed@university.com / 123456
echo     Staff     sara.staff@university.com / 123456
echo     Admin     admin@university.com / admin123
echo.
echo   Run stop-demo.bat to shut everything down.
echo ====================================================
echo.
pause
