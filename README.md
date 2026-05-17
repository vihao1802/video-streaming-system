# Video Streaming System - Development Setup

This document explains how to set up and run the development environment using Docker.

## Prerequisites

- Docker (with Docker Compose)
- Git (for version control)

## Technologies Used

This project leverages the following technologies:

- **Frontend**:
  - **React** - A JavaScript library for building user interfaces
  - **Vite** - Next Generation Frontend Tooling for fast development
  - **TypeScript** - Static type checking for JavaScript

- **Backend**:
  - **FastAPI** - Modern, fast (high-performance) web framework for building APIs
  - **PostgreSQL** - Powerful, open-source object-relational database system
  - **Redis** - In-memory data structure store, used for caching and message brokering
  - **Alembic** - Database migration tool for SQLAlchemy

- **Storage & Media Processing**:
  - **MinIO** - High Performance Object Storage, S3 compatible
  - **FFmpeg** - For video transcoding and processing

- **Message Queue**:
  - **Kafka** - Distributed event streaming platform for handling real-time data feeds

- **Containerization & Orchestration**:
  - **Docker** - Containerization platform
  - **Docker Compose** - Tool for defining and running multi-container applications

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

## Database Migrations

### Running Migrations

1. **Apply pending migrations**:
   ```bash
   docker compose exec server alembic upgrade head
   ```

2. **Create a new migration**:
   ```bash
   docker compose exec server alembic revision --autogenerate -m "description of changes"
   ```

3. **View current migration status**:
   ```bash
   docker compose exec server alembic current
   ```

4. **Rollback to a previous migration**:
   ```bash
   docker compose exec server alembic downgrade -1  # rollback one migration
   # or
   docker compose exec server alembic downgrade <migration_id>
   ```

### Migration Best Practices

- Always create a new migration when making schema changes
- Test migrations in a development environment before applying to production
- Keep migration files in version control
- Write idempotent migrations that can be run multiple times safely
- Include both `upgrade` and `downgrade` functions in each migration
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
