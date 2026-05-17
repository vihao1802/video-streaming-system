from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from database.engine import get_db
from sqlalchemy.orm import Session
from pydantic_models.response import Response
from database.models.video import Video, ProcessingStatus
import logging
import boto3
from botocore.client import Config
from botocore.exceptions import BotoCoreError, ClientError
from settings import settings
import io

router = APIRouter(
    prefix="/videos",
    tags=["Videos"],
)

def get_s3_client():
    """Get or create S3 client for MinIO"""
    try:
        endpoint_url = settings.MINIO_URL
        if not endpoint_url.startswith('http'):
            endpoint_url = f"http://{endpoint_url}"
            
        return boto3.client(
            's3',
            endpoint_url=endpoint_url,
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            region_name='us-east-1',
            config=Config(signature_version='s3v4')
        )
    except Exception as e:
        logging.error(f"Failed to create S3 client: {e}")
        raise HTTPException(status_code=500, detail="Storage service unavailable")

@router.get("/")
def get_all_videos(
    db: Session = Depends(get_db),
    limit: int = 100,
    offset: int = 0
):
    """Get all videos with pagination"""
    try:
        videos = db.query(Video).order_by(Video.created_at.desc()).offset(offset).limit(limit).all()
        video_list = [video.to_dict() for video in videos]
        
        return {
            "success": True,
            "message": "Videos retrieved successfully",
            "data": {
                "videos": video_list,
                "total": db.query(Video).count(),
                "limit": limit,
                "offset": offset
            }
        }
    except Exception as e:
        logging.error(f"Error fetching videos: {e}")
        raise HTTPException(status_code=500, detail="Server error")

@router.get("/{video_id}")
def get_video_by_id(
    video_id: str,
    db: Session = Depends(get_db)
):
    """Get video metadata by ID"""
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        return {
            "success": True,
            "message": "Video found",
            "data": video.to_dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(e)
        raise HTTPException(status_code=500, detail="Server error")

@router.get("/{video_id}/manifest")
def get_video_manifest(video_id: str):
    """Stream DASH manifest file from MinIO"""
    try:
        s3_client = get_s3_client()
        
        # Get manifest file from MinIO
        object_key = f"{video_id}/manifest.mpd"

        print(object_key)
        print(settings.MINIO_PROCESS_VIDEO_BUCKET)
        
        response = s3_client.get_object(
            Bucket=settings.MINIO_PROCESS_VIDEO_BUCKET,
            Key=object_key
        )
        
        content = response['Body'].read()
        
        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/dash+xml",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        logging.error(f"Error fetching manifest: {e}")
        raise HTTPException(status_code=404, detail="Manifest not found")

@router.get("/{video_id}/thumbnail")
def get_video_thumbnail(video_id: str):
    """Stream video thumbnail from MinIO"""
    try:
        s3_client = get_s3_client()
        
        # Construct thumbnail path in MinIO
        # Video ID is now just the UUID
        # MinIO bucket: video-thumbnails
        # Full object path: thumbnails/{uuid}
        object_key = f"thumbnails/{video_id}"
        
        response = s3_client.get_object(
            Bucket=settings.MINIO_VIDEO_THUMBNAIL_BUCKET,
            Key=object_key
        )
        
        content = response['Body'].read()
        
        return StreamingResponse(
            io.BytesIO(content),
            media_type="image/jpeg",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Cache-Control": "public, max-age=86400",
            }
        )
    except Exception as e:
        logging.error(f"Error fetching thumbnail for {video_id}: {e}")
        raise HTTPException(status_code=404, detail="Thumbnail not found")

@router.get("/{video_id}/{segment_path:path}")
def get_video_segment(video_id: str, segment_path: str):
    """Stream video segment files from MinIO"""
    try:
        s3_client = get_s3_client()
        
        # Get segment file from MinIO
        object_key = f"{video_id}/{segment_path}"
        
        response = s3_client.get_object(
            Bucket=settings.MINIO_PROCESS_VIDEO_BUCKET,
            Key=object_key
        )
        
        content = response['Body'].read()
        
        # Determine media type based on file extension
        media_type = "video/mp4"
        if segment_path.endswith('.m4s'):
            media_type = "video/iso.segment"
        elif segment_path.endswith('.mp4'):
            media_type = "video/mp4"
        
        return StreamingResponse(
            io.BytesIO(content),
            media_type=media_type,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Accept-Ranges": "bytes",
            }
        )
    except Exception as e:
        logging.error(f"Error fetching segment {segment_path}: {e}")
        raise HTTPException(status_code=404, detail="Segment not found")

@router.put("/")
def update_video_status_by_id(
    id: str,
    db: Session = Depends(get_db)
):
    try:
        video = db.query(Video).filter(Video.id == id).first()
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        video.processing_status = ProcessingStatus.COMPLETED
        db.commit()
        
        return {
            "success": True,
            "message": "Video status updated successfully"
        }
    except Exception as e:
        logging.error(e)
        raise HTTPException(status_code=500, detail="Server error")
