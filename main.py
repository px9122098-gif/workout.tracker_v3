from pathlib import Path

from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from fastapi import FastAPI
from app.config import settings
from app.api.v1.auth import router as auth_router
from app.api.v1.workouts import router as workouts_router
from app.api.v1.exercises import router as exercises_router
from app.api.v1.sets import router as sets_router
from app.api.v1.progress import router as progress_router

app = FastAPI()
STATIC_DIR = Path(__file__).resolve().parent / "app" / "static"
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router, prefix="/api/v1/auth")
app.include_router(workouts_router, prefix="/api/v1")
app.include_router(exercises_router, prefix="/api/v1")
app.include_router(sets_router, prefix="/api/v1")
app.include_router(progress_router, prefix="/api/v1")


@app.get("/api/health", tags=["system"])
def health_check():
    return {"status": "ok"}

app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

