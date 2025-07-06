from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import upload
from database.engine import get_db

app = FastAPI(
    title="Video Streaming System",
    description="Video Streaming System API",
    version="1.0.0",
)

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)

@app.get("/")
def root():
    return {
        "message": "Welcome to Video Streaming System",
        "docs": "http://127.0.0.1:8000/docs",
    }