# API Endpoints Documentation

## Video Endpoints

### 1. Get All Videos
```
GET /videos/
```

**Query Parameters:**
- `limit` (optional, default: 100) - Maximum number of videos to return
- `offset` (optional, default: 0) - Number of videos to skip for pagination

**Response:**
```json
{
  "success": true,
  "message": "Videos retrieved successfully",
  "data": {
    "videos": [
      {
        "id": "video-123",
        "title": "My Video",
        "description": "Video description",
        "processing_status": "COMPLETED",
        "created_at": "2026-01-18T12:00:00",
        "updated_at": "2026-01-18T12:05:00"
      }
    ],
    "total": 10,
    "limit": 100,
    "offset": 0
  }
}
```

### 2. Get Video By ID
```
GET /videos/{video_id}
```

**Response:**
```json
{
  "success": true,
  "message": "Video found",
  "data": {
    "id": "video-123",
    "title": "My Video",
    "description": "Video description",
    "processing_status": "COMPLETED",
    "created_at": "2026-01-18T12:00:00",
    "updated_at": "2026-01-18T12:05:00"
  }
}
```

### 3. Get Video Manifest (DASH)
```
GET /videos/{video_id}/manifest
```

**Response:** Returns the DASH manifest file (.mpd) for video streaming

### 4. Get Video Segment
```
GET /videos/{video_id}/segment/{segment_path}
```

**Response:** Returns the video segment file (.m4s)

### 5. Update Video Status
```
PUT /videos/?id={video_id}
```

**Response:**
```json
{
  "success": true,
  "message": "Video status updated successfully"
}
```

## Processing Status Values

- `IN_PROGRESS` - Video is currently being transcoded
- `COMPLETED` - Video is ready to watch
- `FAILED` - Video processing failed

## Example Usage

### Fetch all videos:
```bash
curl http://localhost:8000/videos/
```

### Fetch videos with pagination:
```bash
curl http://localhost:8000/videos/?limit=10&offset=0
```

### Fetch specific video:
```bash
curl http://localhost:8000/videos/video-123
```

### Get video manifest:
```bash
curl http://localhost:8000/videos/video-123/manifest
```
