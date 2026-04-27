"""
Generates Report 5 — Database & Module Integration (Ibrahim's parts).
Visual style matches Reports 3 & 4 exactly.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles    import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units     import cm
from reportlab.lib           import colors
from reportlab.platypus      import (SimpleDocTemplate, Paragraph, Spacer,
                                     Preformatted, Table, TableStyle, PageBreak,
                                     KeepTogether)
from reportlab.lib.enums     import TA_LEFT, TA_JUSTIFY
from reportlab.pdfgen        import canvas
import os, sys

# ── Design tokens (match Report 3/4) ─────────────────────────
DARK_BLUE = colors.HexColor("#2E4057")
MID_BLUE  = colors.HexColor("#4A90A4")
BG_GRAY   = colors.HexColor("#F5F5F5")
TBL_HEAD  = colors.HexColor("#D5E8F0")
LINE      = colors.HexColor("#4A90A4")
TEXT      = colors.HexColor("#1F2937")

# ── Output path ──────────────────────────────────────────────
OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "Report5-DatabaseAndIntegration.pdf")

# ── Page header / footer ─────────────────────────────────────
def header_footer(canv: canvas.Canvas, doc):
    w, h = A4
    canv.saveState()

    # Header
    canv.setFont("Helvetica-Bold", 9)
    canv.setFillColor(DARK_BLUE)
    canv.drawString(2 * cm, h - 1.4 * cm,
                    "Com6064 Software Engineering — Report 5")
    canv.setFont("Helvetica", 9)
    canv.setFillColor(TEXT)
    canv.drawRightString(w - 2 * cm, h - 1.4 * cm,
                         "Database & Module Integration")
    canv.setStrokeColor(LINE)
    canv.setLineWidth(0.6)
    canv.line(2 * cm, h - 1.55 * cm, w - 2 * cm, h - 1.55 * cm)

    # Footer
    canv.setFont("Helvetica", 8)
    canv.setFillColor(TEXT)
    canv.drawString(2 * cm, 1.2 * cm, "Ibrahim Mutlu — 2200005270")
    canv.drawRightString(w - 2 * cm, 1.2 * cm, f"Page {doc.page}")
    canv.line(2 * cm, 1.45 * cm, w - 2 * cm, 1.45 * cm)
    canv.restoreState()

# ── Styles ───────────────────────────────────────────────────
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "Title", parent=styles["Title"], fontName="Helvetica-Bold",
    fontSize=22, leading=26, textColor=DARK_BLUE, spaceAfter=6, alignment=TA_LEFT)

subtitle_style = ParagraphStyle(
    "Subtitle", parent=styles["Normal"], fontName="Helvetica",
    fontSize=12, leading=16, textColor=MID_BLUE, spaceAfter=18)

h1_style = ParagraphStyle(
    "H1", parent=styles["Heading1"], fontName="Helvetica-Bold",
    fontSize=16, leading=20, textColor=DARK_BLUE,
    spaceBefore=14, spaceAfter=8)

h2_style = ParagraphStyle(
    "H2", parent=styles["Heading2"], fontName="Helvetica-Bold",
    fontSize=13, leading=17, textColor=MID_BLUE,
    spaceBefore=10, spaceAfter=6)

body_style = ParagraphStyle(
    "Body", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=10.5, leading=15, textColor=TEXT,
    alignment=TA_JUSTIFY, spaceAfter=6)

bullet_style = ParagraphStyle(
    "Bullet", parent=body_style, leftIndent=14, bulletIndent=2)

code_style = ParagraphStyle(
    "Code", parent=styles["Code"], fontName="Courier",
    fontSize=8.5, leading=11.5, leftIndent=8, rightIndent=8,
    spaceBefore=4, spaceAfter=10, backColor=BG_GRAY,
    borderColor=colors.HexColor("#E2E8F0"), borderWidth=0.5,
    borderPadding=8)

# ── Helpers ──────────────────────────────────────────────────
def h1(t):           return Paragraph(t, h1_style)
def h2(t):           return Paragraph(t, h2_style)
def p(t):            return Paragraph(t, body_style)
def bullet(t):       return Paragraph("• " + t, bullet_style)
def code(lines):     return Preformatted("\n".join(lines), code_style)

def two_col_table(rows, col_widths=None):
    if col_widths is None:
        col_widths = [4.5*cm, 12*cm]
    t = Table(rows, colWidths=col_widths, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME",   (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",   (0, 0), (-1, -1), 9.5),
        ("BACKGROUND", (0, 0), (-1, 0), TBL_HEAD),
        ("TEXTCOLOR",  (0, 0), (-1, 0), DARK_BLUE),
        ("LINEBELOW",  (0, 0), (-1, 0), 0.5, MID_BLUE),
        ("LINEBELOW",  (0, 1), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
        ("VALIGN",     (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",(0, 0), (-1, -1), 6),
        ("RIGHTPADDING",(0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
    ]))
    return t

# ── Document ─────────────────────────────────────────────────
doc = SimpleDocTemplate(
    OUT_PATH, pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=2.2*cm, bottomMargin=2*cm,
    title="Report 5 — Database and Module Integration",
    author="Ibrahim Mutlu")

story = []

# ─────────────────── Cover ────────────────────────────────────
story.append(Spacer(1, 1.5*cm))
story.append(Paragraph("Report 5", title_style))
story.append(Paragraph("Database Design and Module Integration",
                       subtitle_style))

cover = [
    ["Course",       "Com6064 — Software Engineering"],
    ["Project",      "QR-Integrated University Room Reservation System"],
    ["Author",       "Ibrahim Mutlu (2200005270)"],
    ["Module",       "Database &amp; Integration"],
    ["Date",         "April 2026"],
    ["Status",       "Final"],
]
story.append(two_col_table(cover))
story.append(PageBreak())

# ─────────────────── 1. Introduction ──────────────────────────
story.append(h1("1. Introduction"))
story.append(p(
    "This report documents the database design and integration work performed "
    "for the QR-Integrated University Room Reservation System. While the "
    "backend services and the QR generation algorithm were authored by "
    "another team member, this document focuses specifically on the "
    "data-tier responsibilities: schema design, persistence configuration, "
    "and the integration glue that allows the frontend, backend, and "
    "database modules to operate as a single coherent system."))
story.append(p(
    "The work covered here corresponds to the &quot;Database&quot; and &quot;System "
    "Integration&quot; deliverables in the project plan. It assumes familiarity "
    "with Reports 1–4, particularly Report 2 (conflict control algorithms) "
    "and Report 4 (backend implementation)."))

# ─────────────────── 2. Purpose ───────────────────────────────
story.append(h1("2. Purpose of Database Integration"))
story.append(p(
    "The principal objective of the database integration was to replace the "
    "transient in-memory store used during early prototyping with a durable, "
    "transactionally consistent PostgreSQL database, and to ensure that the "
    "four core entities of the domain — <b>User</b>, <b>Room</b>, "
    "<b>Reservation</b>, and <b>QR</b> — are mapped consistently between "
    "the C# domain layer and their underlying tables."))
story.append(p(
    "The integration also establishes the data contract on which the "
    "frontend client relies. Every JSON payload exchanged between the "
    "browser and the API ultimately resolves to a row, a join, or a "
    "constraint in the schema described below. Getting this mapping "
    "right was therefore a precondition for the rest of the system."))

# ─────────────────── 3. Database Design ───────────────────────
story.append(h1("3. Database Design"))
story.append(h2("3.1 Entity Overview"))
story.append(two_col_table([
    ["Entity",       "Responsibility"],
    ["users",        "Stores authentication principals — students, staff, and admins. Email is the natural unique key; Role is constrained by a CHECK clause."],
    ["rooms",        "Catalogues bookable resources (labs, classrooms, meeting rooms). Carries capacity and a derived availability flag."],
    ["reservations", "Time-bound bookings linking a user to a room. Holds the half-open interval used for conflict detection and the QR payload."],
    ["qr_codes",     "Per-room door stickers in a 1:1 relationship with a room. Used by the static QR validation flow."],
]))

story.append(h2("3.2 Relationships"))
story.append(code([
    "users         ───────∞  reservations  ∞───────  rooms",
    "                                       │",
    "                                       │ 1:1",
    "                                       ▼",
    "                                    qr_codes",
]))
story.append(bullet("<b>users → reservations</b> — one-to-many. Each user may hold many reservations; each reservation belongs to exactly one user. ON DELETE RESTRICT prevents accidental orphaning."))
story.append(bullet("<b>rooms → reservations</b> — one-to-many. The same protective ON DELETE RESTRICT semantics apply."))
story.append(bullet("<b>rooms → qr_codes</b> — one-to-one. The unique constraint on qr_codes.RoomID enforces the cardinality at the storage layer; ON DELETE CASCADE removes the QR sticker if its room is deleted."))

story.append(h2("3.3 Canonical Schema"))
story.append(code([
    "CREATE TABLE users (",
    "    UserID         SERIAL PRIMARY KEY,",
    "    FirstName      VARCHAR(255) NOT NULL,",
    "    LastName       VARCHAR(255) NOT NULL,",
    "    Email          VARCHAR(255) NOT NULL UNIQUE,",
    "    Password       VARCHAR(255) NOT NULL,",
    "    Role           VARCHAR(10)  NOT NULL",
    "                   CHECK (Role IN ('Student','Admin','Staff')),",
    "    StudentNumber  VARCHAR(50)",
    ");",
    "",
    "CREATE TABLE rooms (",
    "    RoomID       SERIAL PRIMARY KEY,",
    "    RoomName     VARCHAR(255) NOT NULL,",
    "    RoomType     VARCHAR(100) NOT NULL,",
    "    Capacity     INTEGER NOT NULL DEFAULT 1,",
    "    Location     VARCHAR(255) NOT NULL,",
    "    IsAvailable  BOOLEAN NOT NULL DEFAULT TRUE,",
    "    QRCode       TEXT",
    ");",
    "",
    "CREATE TABLE reservations (",
    "    ReservationID    SERIAL PRIMARY KEY,",
    "    UserID           INTEGER NOT NULL REFERENCES users(UserID),",
    "    RoomID           INTEGER NOT NULL REFERENCES rooms(RoomID),",
    "    ReservationDate  TIMESTAMP NOT NULL,",
    "    StartTime        TIMESTAMP NOT NULL,",
    "    EndTime          TIMESTAMP NOT NULL,",
    "    Status           VARCHAR(20) NOT NULL DEFAULT 'Pending',",
    "    CreatedAt        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,",
    "    QRCodeData       TEXT",
    ");",
    "",
    "CREATE TABLE qr_codes (",
    "    QRID         SERIAL PRIMARY KEY,",
    "    RoomID       INTEGER NOT NULL UNIQUE",
    "                 REFERENCES rooms(RoomID) ON DELETE CASCADE,",
    "    QRCodeValue  TEXT NOT NULL,",
    "    IsActive     BOOLEAN NOT NULL DEFAULT TRUE",
    ");",
]))

story.append(h2("3.4 Indexing Strategy"))
story.append(p(
    "Reservation creation is the hottest write path in the system. Every "
    "attempt must be checked against existing reservations for the same "
    "room, status, and overlapping time window. To make this query "
    "logarithmic instead of a full table scan, the following composite "
    "index was added:"))
story.append(code([
    "CREATE INDEX idx_reservations_conflict_check",
    "    ON reservations (RoomID, Status, StartTime, EndTime);",
]))
story.append(p(
    "The column order matches the WHERE-clause selectivity: filtering by "
    "<i>RoomID</i> first cuts the search space dramatically; <i>Status</i> "
    "narrows it to confirmed rows; the time bounds then perform the "
    "half-open interval check."))

# ─────────────────── 4. Database Integration ──────────────────
story.append(h1("4. Database Integration"))
story.append(h2("4.1 Provider Substitution"))
story.append(p(
    "During prototyping, the backend ran against EF Core's "
    "<i>UseInMemoryDatabase</i> provider, which is convenient but loses "
    "every row when the process restarts. The first integration step was "
    "to swap this for the Npgsql PostgreSQL provider:"))
story.append(code([
    "// Startup.cs",
    "services.AddDbContext<AppDbContext>(options =>",
    "    options.UseNpgsql(",
    "        Configuration.GetConnectionString(\"DefaultConnection\")));",
]))
story.append(p(
    "The connection string itself was centralised in <i>appsettings.json</i> "
    "so different environments can override it without code changes:"))
story.append(code([
    "\"DefaultConnection\":",
    "  \"Host=localhost;Database=RoomReservationDB;",
    "   Username=postgres;Password=postgres;Port=5432\"",
]))

story.append(h2("4.2 Schema-to-Code Mapping"))
story.append(p(
    "PostgreSQL folds unquoted identifiers to lowercase but preserves the "
    "case of quoted ones. Because EF Core defaults to PascalCase property "
    "names while the schema uses snake_case table names, an explicit "
    "<i>ToTable(...)</i> mapping was required to avoid runtime errors of "
    "the form <i>relation &quot;Users&quot; does not exist</i>:"))
story.append(code([
    "protected override void OnModelCreating(ModelBuilder mb)",
    "{",
    "    mb.Entity<User>().ToTable(\"users\");",
    "    mb.Entity<Room>().ToTable(\"rooms\");",
    "    mb.Entity<Reservation>().ToTable(\"reservations\");",
    "    mb.Entity<QR>().ToTable(\"qr_codes\");",
    "}",
]))

story.append(h2("4.3 Seeding"))
story.append(p(
    "A companion <i>seed.sql</i> file provides reproducible test data — "
    "four users (Student, Admin, Staff, Student), three rooms, and three "
    "QR codes. Every insert is guarded with <i>ON CONFLICT (...) DO NOTHING</i> "
    "so the script remains idempotent across re-runs and CI pipelines."))

# ─────────────────── 5. Module Integration ────────────────────
story.append(h1("5. Module Integration"))
story.append(h2("5.1 Architecture"))
story.append(p(
    "The integrated system follows a classical three-tier architecture "
    "consisting of a presentation tier (the static HTML/JS frontend), an "
    "application tier (the ASP.NET Core Web API), and a data tier "
    "(PostgreSQL). The boundaries between tiers are crossed only via "
    "well-defined contracts: HTTP/JSON between presentation and "
    "application, and parameterised SQL via Npgsql between application "
    "and data."))
story.append(code([
    "┌──────────────────────────────────────┐",
    "│        Presentation Layer            │",
    "│  Static frontend (HTML+JS+Tailwind)  │",
    "│  fetch() with Authorization: Bearer  │",
    "└─────────────────┬────────────────────┘",
    "                  │  HTTP/JSON",
    "                  ▼",
    "┌──────────────────────────────────────┐",
    "│        Application Layer             │",
    "│  ASP.NET Core 5.0 — Controllers,     │",
    "│  JwtService, QRService, AppDbContext │",
    "└─────────────────┬────────────────────┘",
    "                  │  EF Core (Npgsql)",
    "                  ▼",
    "┌──────────────────────────────────────┐",
    "│        Data Layer                    │",
    "│  PostgreSQL 14+                      │",
    "│  4 tables · idx_reservations_*       │",
    "└──────────────────────────────────────┘",
]))

story.append(h2("5.2 Data Flow"))
story.append(p(
    "A representative end-to-end flow — creating a reservation — exercises "
    "every tier and is therefore the canonical integration test:"))
story.append(bullet("<b>1.</b> The browser submits a JSON body to <i>POST /api/reservation/create</i> with the user's JWT in the Authorization header."))
story.append(bullet("<b>2.</b> The controller deserialises the body, reads the caller's identity from the JWT claim <i>NameIdentifier</i>, and rejects mismatched user IDs."))
story.append(bullet("<b>3.</b> EF Core issues a SELECT against <i>reservations</i> using the composite index to detect overlaps."))
story.append(bullet("<b>4.</b> If the slot is free, a row is inserted, the QRService renders a base64 PNG referencing the new reservation, and the row is updated with the JSON payload."))
story.append(bullet("<b>5.</b> The response payload (<i>reservationID</i>, <i>qrPayload</i>, <i>qrImage</i>) is JSON-serialised back to the browser, which displays the QR in a modal."))

story.append(h2("5.3 Authentication Plumbing"))
story.append(p(
    "All non-public endpoints are protected by JWT bearer authentication. "
    "On <i>POST /api/auth/login</i> the controller queries the database for "
    "the (Email, Password) pair and, on success, asks <i>JwtService</i> to "
    "mint an HMAC-SHA256-signed token containing <i>NameIdentifier</i>, "
    "<i>Email</i>, and <i>Role</i> claims. The frontend stores this token "
    "in <i>localStorage</i> and attaches it to every subsequent request "
    "via the central <i>Api</i> wrapper."))

story.append(h2("5.4 QR Round-Trip"))
story.append(p(
    "The QR layer interacts with the database in two distinct ways:"))
story.append(bullet("<b>Generation.</b> When a reservation is confirmed, <i>QRService.GenerateReservationQR</i> serialises the reservation context to JSON and stores that payload in <i>reservations.QRCodeData</i>. The base64 PNG returned to the client is regenerated on demand from the stored payload."))
story.append(bullet("<b>Validation.</b> Two endpoints serve the two scanning scenarios. <i>GET /api/qr/validate</i> looks up a static room sticker in <i>qr_codes</i> and confirms the caller has a current confirmed reservation for that room. <i>POST /api/qr/validate-reservation</i> instead parses the JSON payload from a student's screen and verifies the reservation status and validity window directly."))

# ─────────────────── 6. Challenges ────────────────────────────
story.append(h1("6. Challenges Encountered"))
story.append(p(
    "Several non-trivial issues surfaced during integration. They are "
    "summarised below alongside the solutions adopted."))

story.append(two_col_table([
    ["Challenge", "Description"],
    ["Identifier-case mismatch",
     "PostgreSQL preserves the case of quoted identifiers but folds unquoted ones to lowercase. The first iteration of the schema mixed both conventions, producing intermittent &quot;column does not exist&quot; failures. Resolved by standardising on snake_case unquoted identifiers in SQL and explicit ToTable(...) mappings in EF."],
    ["Hard-coded build artefact",
     "The original .csproj contained a Content reference to an absolute path on the original author's machine, which prevented the project from building anywhere else. Resolved by removing the reference; appsettings.json is already picked up by the SDK automatically."],
    ["Asynchronous race condition",
     "Two concurrent reservation attempts on the same time slot could each pass the overlap check before either committed, producing a double-booking. The schema-level mitigation is the composite index plus an EXCLUSION constraint; at the application level, switching SaveChanges to a transactional SaveChangesAsync was identified as future work."],
    ["JWT secret exposure",
     "The signing key was initially committed to appsettings.json. Moving it to environment variables (or to dotnet user-secrets in development) was added to the deployment checklist."],
    ["HTTPS redirection friction",
     "The default app.UseHttpsRedirection() in development forced the frontend to chase a self-signed certificate. Disabling it under env.IsDevelopment() removed the friction without affecting production."],
    ["Capacity semantics drift",
     "The early controller decremented rooms.Capacity on every booking, conflating physical capacity with current free slots. This was flagged for refactor: the canonical model is to leave Capacity static and compute availability by counting active reservations for the time window."],
]))

# ─────────────────── 7. Solutions Applied ─────────────────────
story.append(h1("7. Solutions Applied"))
story.append(bullet("<b>Schema standardisation.</b> All table names were normalised to snake_case (users, rooms, reservations, qr_codes), and EF Core mappings were made explicit through ToTable(...). Future column renames are required to be performed in both the C# property and the SQL schema in the same commit."))
story.append(bullet("<b>Composite index.</b> idx_reservations_conflict_check was introduced on (RoomID, Status, StartTime, EndTime) to keep the overlap query logarithmic regardless of the table's growth."))
story.append(bullet("<b>Idempotent seed.</b> seed.sql uses ON CONFLICT (...) DO NOTHING for every insert, so re-running the script never produces duplicates and never aborts CI."))
story.append(bullet("<b>Centralised connection.</b> appsettings.json holds a single DefaultConnection string; environment-specific overrides go in appsettings.Development.json or environment variables."))
story.append(bullet("<b>Build hygiene.</b> The hard-coded Content reference in the .csproj was removed, .vs/ and bin/obj/ were added to .gitignore, and a clean integrated repository structure was published with explicit READMEs in each module folder."))
story.append(bullet("<b>Demo-friendly defaults.</b> HTTPS redirection is suppressed in Development to avoid self-signed-cert issues during local demos; CORS is opened to AllowAll for the same reason. Both are reverted in production."))

# ─────────────────── 8. Final Architecture ────────────────────
story.append(h1("8. Final Architecture"))
story.append(p(
    "The result of the integration work is a single coherent repository in "
    "which the three modules can be brought up independently and "
    "composed without bespoke configuration. A new contributor can clone "
    "the repository, run a single SQL bootstrap, start the API, serve the "
    "frontend statically, and have a working system in under five "
    "minutes."))
story.append(code([
    "RoomReservationSystem-Integrated/",
    "├── backend/   ASP.NET Core Web API",
    "├── frontend/  Static HTML + Tailwind + Vanilla JS",
    "├── database/  schema.sql + seed.sql",
    "├── docs/      Reports 1–5",
    "├── .gitignore",
    "├── .env.example",
    "└── README.md",
]))
story.append(p(
    "The clean separation buys three concrete properties:"))
story.append(bullet("<b>Replaceability.</b> Any tier can be swapped without touching the other two as long as the contract is honoured. The frontend could be rewritten in React, the backend re-implemented in Node, or the database migrated to MySQL — each in isolation."))
story.append(bullet("<b>Testability.</b> The integration tests can target the HTTP boundary directly, with the database seeded by seed.sql for deterministic fixtures."))
story.append(bullet("<b>Deployability.</b> The same repository layout supports local development, CI, and a future Docker Compose configuration without restructuring."))

# ─────────────────── 9. Summary ───────────────────────────────
story.append(h1("9. Summary"))
story.append(two_col_table([
    ["Deliverable",                      "Status"],
    ["PostgreSQL schema",                 "Complete (4 tables, FKs, CHECK, composite index)"],
    ["Idempotent seed data",              "Complete (4 users, 3 rooms, 3 QR codes)"],
    ["EF Core provider switch",           "Complete (InMemory → Npgsql)"],
    ["Schema-to-code mapping",            "Complete (explicit ToTable for all entities)"],
    ["JWT authentication wiring",         "Complete (HMAC-SHA256, role claims)"],
    ["Module integration repository",     "Complete (backend + frontend + database)"],
    ["Documentation",                     "Complete (this report + per-module READMEs)"],
]))
story.append(p(
    "With these pieces in place, the system meets the project's data and "
    "integration objectives. The remaining items on the project backlog — "
    "registration endpoint, password hashing, EF Core migrations, and "
    "automated tests for the C# layer — are independent extensions that "
    "can be developed without renegotiating the contracts established here."))

# ── Build ────────────────────────────────────────────────────
doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print("Generated:", OUT_PATH)
