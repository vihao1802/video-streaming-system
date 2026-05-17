from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import upload, video
from database.engine import get_db
import os

app = FastAPI(
    title="Video Streaming System",
    description="Video Streaming System API",
    version="1.0.0",
)

origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://0.0.0.0:3001"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(video.router)

@app.get("/")
def root():
    return {
        "message": "Welcome to Video Streaming System",
        "docs": f"http://127.0.0.1:{os.getenv('PORT') or 8000}/docs",
    }
