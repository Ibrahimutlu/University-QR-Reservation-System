# Documentation

Project documentation for the QR-Integrated University Room Reservation System.

## Current Technical Docs

| File | Purpose |
|---|---|
| `api-endpoints.md` | API routes, roles, request/response examples |
| `deployment-guide.md` | Railway, PostgreSQL, and Vercel deployment notes |
| `final-integration-report.md` | Integration summary and test checklist |

## Course Reports

| File | Topic |
|---|---|
| `Report1-*.pdf` | Initial requirements/design report |
| `Report2-*.pdf` | Conflict-control algorithm report |
| `Report3-*.pdf` | Implementation report |
| `Report4-*.pdf` | Backend implementation report |
| `Report5-DatabaseAndIntegration.pdf` | Database design and integration report |

The live API contract is available through Swagger when the backend is running
locally at http://localhost:5000/swagger. Swagger is disabled in production by
default unless `ENABLE_SWAGGER=true` is configured.
