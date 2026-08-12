# Workout Tracker v3

## Description
A full-stack workout journal for planning sessions, recording exercises and sets,
and following training consistency, volume, and strength progress.

## Stack
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL
- HTML/CSS/JavaScript

## Features
- Registration and JWT authentication
- Private workout data for every account
- Create, edit, complete, filter, and delete workouts
- Record notes, exercises, sets, and perceived effort
- Live dashboard with weekly totals, recent workouts, goals, and personal best
- Progress analytics for volume, strength, consistency, and personal records
- Responsive desktop and mobile interface
- PostgreSQL storage and Alembic migrations
- Isolated SQLite test database

## Getting Started
1. Create and activate a virtual environment.
2. Install the dependencies.
3. Copy `.env.example` to `.env` and set a strong `SECRET_KEY`.
4. Create and start a PostgreSQL database.
5. Apply the migrations.
6. Start FastAPI and open `http://127.0.0.1:8000`.

## Commands
```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\uvicorn.exe main:app --reload
```

Run the test suite:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

## Start PostgreSQL
```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D "$env:USERPROFILE\postgres-data" -l "$env:USERPROFILE\postgres-data\postgres.log" start
```

## API

Authentication starts at:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

Protected endpoints require `Authorization: Bearer <access_token>`.
Interactive API documentation is available at `http://127.0.0.1:8000/docs`.

## Database
The project uses PostgreSQL. Database schema changes are managed with Alembic migrations.

Before a production deployment, provide the environment variables from
`.env.example`, use a managed PostgreSQL database, run `alembic upgrade head`,
and serve the application over HTTPS. Never commit `.env` or production secrets.

## Deploy to Render

The repository includes `render.yaml`, which creates a FastAPI web service and
a PostgreSQL database in the same Frankfurt region.

1. Push the latest commit to GitHub.
2. In Render, choose **New > Blueprint** and connect this repository.
3. Review the two resources and apply the Blueprint.
4. Wait for the build, migrations, and health check to complete.
5. Open the generated `onrender.com` URL and create a new account.

The free web service sleeps after 15 minutes without traffic. The free Render
PostgreSQL database expires after 30 days and has no backups, so it is suitable
only for a first demo deployment. Upgrade the database before storing data that
must be retained.

## Project status

Version 3 is feature-complete for local use. The next version can focus on a
React frontend, reusable workout programs, an exercise catalogue, and deeper
analytics.

### v4 Ideas
- React frontend
- Workout programs
- Exercise catalogue and aliases
- Better analytics
- PWA/mobile-friendly experience
