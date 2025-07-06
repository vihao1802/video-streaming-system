# Video Streaming System - Development Setup

This document explains how to set up and run the development environment using Docker.

## Prerequisites

- Docker (with Docker Compose)
- Git (for version control)

## Getting Started

1. **Clone the repository** (if you haven't already):

   ```bash
   git clone <repository-url>
   cd video-streaming-system
   ```

2. **Start the development environment**:

   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```

   This will start all services in development mode with hot-reloading enabled.

## Accessing Services

- **Frontend (React)**: http://localhost:5173
- **Backend API (FastAPI)**: http://localhost:8000
- **MinIO Console**: http://localhost:9001 (Username: minioadmin, Password: minioadmin)
- **PostgreSQL**:
  - Host: localhost
  - Port: 5432
  - Database: video_streaming
  - Username: postgres
  - Password: postgres
- **Redis**:
  - Host: localhost
  - Port: 6379

## Development Workflow

- The client and server code are mounted as volumes, so changes will be reflected immediately.
- The client uses Vite's development server with hot module replacement.
- The server uses uvicorn with auto-reload enabled.
- The transcoder service will automatically restart if its code changes.

## Stopping the Environment

To stop all services:

```bash
docker compose -f docker-compose.dev.yml down
```

To stop and remove volumes (including database data):

```bash
docker compose -f docker-compose.dev.yml down -v
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/video_streaming
REDIS_URL=redis://redis:6379/0
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=video-streaming

# Client
VITE_API_URL=/api
```

## Troubleshooting

- If you encounter permission issues with mounted volumes, try running:

  ```bash
  chmod -R a+rwx .
  ```

  on Linux/Mac or adjust folder permissions on Windows.

- If services fail to start, check the logs:
  ```bash
  docker compose -f docker-compose.dev.yml logs <service_name>
  ```

## Production Deployment

For production deployment, use the production Dockerfiles and configuration (not included in this setup).
