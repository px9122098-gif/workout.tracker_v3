from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from fastapi import FastAPI
from app.api.v1.auth import router as auth_router
from app.api.v1.workouts import router as workouts_router
from app.api.v1.exercises import router as exercises_router
from app.api.v1.sets import router as sets_router
from app.api.v1.progress import router as progress_router

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router, prefix="/api/v1/auth")
app.include_router(workouts_router, prefix="/api/v1")
app.include_router(exercises_router, prefix="/api/v1")
app.include_router(sets_router, prefix="/api/v1")
app.include_router(progress_router, prefix="/api/v1")

app.mount("/", StaticFiles(directory="app/static", html=True), name="static")

