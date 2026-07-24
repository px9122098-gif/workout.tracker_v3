# Workout Tracker v2

## Description
An app for tracking workouts, exercises, sets, and workout volume.

## Stack
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL
- HTML/CSS/JavaScript

## Features
- Create workouts
- View workout details
- Add, edit, and delete exercises
- Add, edit, and delete sets
- Delete data with confirmation
- Add workout notes
- Calculate set, exercise, and workout volume
- Store data in PostgreSQL
- Manage database changes with Alembic migrations

## Getting Started
1. Create a virtual environment.
2. Install dependencies.
3. Create `.env` based on `.env.example`.
4. Start PostgreSQL.
5. Apply migrations.
6. Start FastAPI.

## Commands
```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\uvicorn.exe main:app --reload
```

## Start PostgreSQL
```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D "$env:USERPROFILE\postgres-data" -l "$env:USERPROFILE\postgres-data\postgres.log" start
```

## Auth endpoints:
POST /api/v1/auth/register
POST /api/v1/auth/login
GET /api/v1/auth/me

Protected endpoints require:
Authorization: Bearer <access_token>

## Database
The project uses PostgreSQL. Database schema changes are managed with Alembic migrations.

## Roadmap

### v3 Goals
- Add user registration and login
- Store hashed passwords instead of plain text passwords
- Connect workouts to users
- Protect API endpoints so users can access only their own data
- Improve frontend structure
- Consider moving the frontend to React
- Improve responsive UI for mobile screens

### v4 Ideas
- Workout programs
- Exercise history and progress charts
- Better analytics
- PWA/mobile-friendly experience
