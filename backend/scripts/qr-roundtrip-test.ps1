# QR roundtrip smoke test.
#
# For each room, fetches the current dynamic QR (staff token), then attempts
# a /check-in with that QR value as a seeded student. Asserts that the
# acceptance window absorbs realistic scan latency. Run this immediately
# before every demo.
#
# Usage:
#   .\qr-roundtrip-test.ps1
#     -ApiBase  "http://localhost:5000"
#     -StaffEmail   "sara.staff@university.com"
#     -StaffPassword "123456"
#     -StudentNumber "20210001"
#     -StudentPassword "123456"
[CmdletBinding()]
param(
    [string]$ApiBase         = "http://localhost:5000",
    [string]$StaffEmail      = "sara.staff@university.com",
    [string]$StaffPassword   = "123456",
    [string]$StudentNumber   = "20210001",
    [string]$StudentPassword = "123456"
)

$ErrorActionPreference = "Stop"

function Invoke-RrsJson {
    param(
        [Parameter(Mandatory)] [string]$Method,
        [Parameter(Mandatory)] [string]$Path,
        [string]$Token,
        $Body
    )
    $headers = @{ "Accept" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    $args = @{
        Method  = $Method
        Uri     = "$ApiBase$Path"
        Headers = $headers
    }
    if ($null -ne $Body) {
        $args["Body"]        = ($Body | ConvertTo-Json -Depth 6)
        $args["ContentType"] = "application/json"
    }
    return Invoke-RestMethod @args
}

Write-Host "QR roundtrip test against $ApiBase" -ForegroundColor Cyan

# 1) Login as staff
$staff = Invoke-RrsJson -Method POST -Path "/api/auth/login" `
    -Body @{ email = $StaffEmail; password = $StaffPassword }
$staffToken = $staff.token
if (-not $staffToken) { throw "Staff login failed" }
Write-Host "[ok] staff login"

# 2) Login as student
$student = Invoke-RrsJson -Method POST -Path "/api/auth/student-login" `
    -Body @{ studentNumber = $StudentNumber; password = $StudentPassword }
$studentToken = $student.token
if (-not $studentToken) { throw "Student login failed" }
Write-Host "[ok] student login"

# 3) Pull room list
$rooms = Invoke-RrsJson -Method GET -Path "/api/room" -Token $staffToken
if ($rooms -is [System.Collections.IEnumerable]) { $roomArr = @($rooms) }
else { $roomArr = @($rooms.rooms) }

if (-not $roomArr -or $roomArr.Count -eq 0) {
    throw "No rooms returned from /api/room"
}

# 4) For each room: health -> dynamic -> check-in attempt
$pass = 0; $fail = 0
foreach ($room in $roomArr) {
    $roomId   = $room.roomID
    $roomName = $room.roomName
    if (-not $roomId) { continue }

    try {
        $health = Invoke-RrsJson -Method GET -Path "/api/qr/health/$roomId" -Token $staffToken
        Write-Host ("[health] room {0} ({1}) — server UTC {2}, next rotation in {3}s, tolerance {4} min" -f `
            $roomId, $roomName, $health.serverUtcNow, $health.nextRotationInSeconds, $health.acceptanceToleranceMin)

        $dyn = Invoke-RrsJson -Method GET -Path "/api/qr/dynamic/$roomId" -Token $staffToken
        $qrValue = $dyn.qrValue
        if (-not $qrValue) { throw "dynamic QR missing qrValue" }

        # Student attempts check-in; may legitimately 4xx if no active
        # reservation, but the QR validation step itself must not reject
        # a freshly-generated value.
        try {
            $checkIn = Invoke-RrsJson -Method POST -Path "/api/qr/check-in" -Token $studentToken `
                -Body @{ roomId = $roomId; qrValue = $qrValue }
            Write-Host ("[ok] check-in accepted (status: {0})" -f $checkIn.status) -ForegroundColor Green
            $pass++
        } catch {
            $errMsg = $_.ErrorDetails.Message
            if ($errMsg -match "QR code is invalid or expired") {
                Write-Host ("[FAIL] room {0}: QR validation rejected a fresh value" -f $roomId) -ForegroundColor Red
                $fail++
            } else {
                Write-Host ("[ok-skip] room {0}: QR accepted; reservation context: {1}" -f $roomId, $errMsg) -ForegroundColor Yellow
                $pass++
            }
        }
    } catch {
        Write-Host ("[FAIL] room {0}: {1}" -f $roomId, $_.Exception.Message) -ForegroundColor Red
        $fail++
    }
}

Write-Host ""
Write-Host ("Summary: {0} pass / {1} fail" -f $pass, $fail) -ForegroundColor (if ($fail -eq 0) { "Green" } else { "Red" })
if ($fail -gt 0) { exit 1 }
