# Thumbnail Setup Guide

## MinIO Thumbnail Configuration

### Current Setup
- **MinIO API Endpoint**: `http://localhost:9000`
- **MinIO Console**: `http://localhost:9001`
- **Thumbnail Bucket**: `video-thumbnails`
- **Thumbnail Path Pattern**: `video-thumbnails/{video-id}`

### Your Data Structure
Based on your example:
- **MinIO Path**: `video-thumbnails/thumbnails/a16c6076-5144-48c7-a6dd-c5a28aa49ebf`
- **Video ID in DB**: `thumbnails/a16c6076-5144-48c7-a6dd-c5a28aa49ebf`

### Thumbnail URL Construction
The thumbnail URL is now constructed as:
```
http://localhost:9000/{BUCKET}/{OBJECT_KEY}
```

With your setup:
```
http://localhost:9000/video-thumbnails/video-thumbnails/thumbnails/a16c6076-5144-48c7-a6dd-c5a28aa49ebf
```

## Configuration Files

### 1. Client Environment Variables
Update `client/.env`:
```env
NEXT_PUBLIC_SERVER_URL=http://localhost:8001
NEXT_PUBLIC_MINIO_URL=http://localhost:9000
NEXT_PUBLIC_MINIO_THUMBNAIL_BUCKET=video-thumbnails
```

### 2. Server Environment Variables
Your `server/.env` should have:
```env
MINIO_VIDEO_THUMBNAIL_BUCKET=video-thumbnails
```

## Making MinIO Publicly Accessible

For thumbnails to load in the browser, MinIO needs to allow anonymous access to the thumbnail bucket.

### Option 1: Set Bucket Policy (Recommended)
```bash
# Install MinIO Client
brew install minio/stable/mc  # macOS
# or
curl https://dl.min.io/client/mc/release/linux-amd64/mc -o mc
chmod +x mc

# Configure MinIO alias
mc alias set myminio http://localhost:9000 admin 12345678

# Set public read policy for thumbnail bucket
mc anonymous set download myminio/video-thumbnails
```

### Option 2: Using MinIO Console
1. Go to http://localhost:9001
2. Login with `admin` / `12345678`
3. Navigate to Buckets → `video-thumbnails`
4. Click "Manage" → "Access Rules"
5. Add a rule:
   - Prefix: `*`
   - Access: `readonly`

### Option 3: Using Docker Exec
```bash
docker compose exec minio mc alias set local http://localhost:9000 admin 12345678
docker compose exec minio mc anonymous set download local/video-thumbnails
```

## Testing Thumbnail Access

### 1. Test Direct MinIO Access
```bash
# Test if thumbnail is accessible
curl -I "http://localhost:9000/video-thumbnails/video-thumbnails/thumbnails/a16c6076-5144-48c7-a6dd-c5a28aa49ebf"

# Should return 200 OK with content-type: image/jpeg
```

### 2. Test in Browser
Open in browser:
```
http://localhost:9000/video-thumbnails/video-thumbnails/thumbnails/a16c6076-5144-48c7-a6dd-c5a28aa49ebf
```

### 3. Check Frontend
Visit `http://localhost:3000` and thumbnails should appear in the video list.

## Troubleshooting

### Thumbnail Not Loading (403 Forbidden)
**Cause**: MinIO bucket is not public

**Solution**: Apply one of the public access options above

### Thumbnail Not Loading (404 Not Found)
**Cause**: Incorrect path or file doesn't exist

**Solutions**:
1. Check MinIO console to verify file exists
2. Verify the exact path in MinIO
3. Check if video ID matches the path structure

### CORS Errors
**Cause**: MinIO CORS not configured

**Solution**: Restart MinIO with CORS environment variable:
```yaml
# In docker-compose.yml
minio:
  environment:
    MINIO_BROWSER_REDIRECT_URL: http://localhost:9001
```

Or set CORS policy:
```bash
mc admin config set myminio api cors_allow_origin="*"
mc admin service restart myminio
```

## Video Upload Workflow

When uploading videos, ensure thumbnails are stored with this structure:
```
Bucket: video-thumbnails
Path: video-thumbnails/{video-id}
```

Where `{video-id}` matches the ID stored in the database.

## Alternative: Using Presigned URLs

If you don't want to make the bucket public, you can generate presigned URLs on the backend:

```python
# In server/routes/video.py
from datetime import timedelta

@router.get("/{video_id}/thumbnail-url")
def get_thumbnail_presigned_url(video_id: str):
    s3_client = get_s3_client()
    url = s3_client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': settings.MINIO_VIDEO_THUMBNAIL_BUCKET,
            'Key': f'video-thumbnails/{video_id}'
        },
        ExpiresIn=3600  # 1 hour
    )
    return {"url": url}
```

Then fetch this URL from the frontend instead of constructing it directly.
