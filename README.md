# ELDERLY Backend

Production-oriented FastAPI backend for the ELDERLY senior companion service.

## Features

- Async FastAPI and Async SQLAlchemy with PostgreSQL
- Alembic migration setup
- JWT authentication with RBAC for `Customer`, `Worker`, and `Admin`
- Geofenced visit check-in flow using GPS coordinates
- Worker audit middleware and explicit audit trail entries
- Celery and Redis powered SOS alert dispatch
- Customer reporting endpoint for recent visit summaries

## Quick Start

1. Copy `.env.example` to `.env`.
2. Start services with `docker compose up --build`.
3. Run migrations with `docker compose exec api alembic upgrade head`.
4. Open docs at [http://localhost:8000/docs](http://localhost:8000/docs).

## Notes

- Public registration is limited to `Customer` and `Worker`.
- `Admin` can be bootstrapped from `.env` using `FIRST_ADMIN_*`.
- Workers must be verified by an admin before they can be assigned to elders.
