import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from minio import Minio
from settings import settings
import uuid
from pydantic_models.upload import UploadMetadata
from database.models.video import Video
from database.engine import get_db
from sqlalchemy.orm import Session
from datetime import timedelta
from pydantic_models.response import Response
from schemas.videoSchema import VideoSchema
from typing import Optional

router = APIRouter(
    prefix="/upload",
    tags=["Upload"],
)

minio_client = Minio(
    settings.MINIO_URL,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=False,
)

# Get presigned URLs for video and thumbnail upload
@router.get("/presigned-urls")
def get_presigned_urls():
    try:
        generated_id = uuid.uuid4()

        video_id = f"videos/{generated_id}.mp4"
        thumbnail_id = f"thumbnails/{generated_id}.jpg"

        # Check if the bucket exists
        if not minio_client.bucket_exists(settings.MINIO_RAW_VIDEO_BUCKET):
            minio_client.make_bucket(settings.MINIO_RAW_VIDEO_BUCKET)

        if not minio_client.bucket_exists(settings.MINIO_VIDEO_THUMBNAIL_BUCKET):
            minio_client.make_bucket(settings.MINIO_VIDEO_THUMBNAIL_BUCKET)

        video_presigned_url = minio_client.presigned_put_object(
            settings.MINIO_RAW_VIDEO_BUCKET,
            video_id,
            expires=timedelta(seconds=3600),
        )

        thumbnail_presigned_url = minio_client.presigned_put_object(
            settings.MINIO_VIDEO_THUMBNAIL_BUCKET,
            thumbnail_id,
            expires=timedelta(seconds=3600),
        )

        return {
            "video_url": video_presigned_url,
            "video_id": video_id,
            "thumbnail_url": thumbnail_presigned_url,
            "thumbnail_id": thumbnail_id,
        }

    except Exception as e:
        logging.error(e)
        raise HTTPException(
            status_code=500,
            detail="Server error"
        )

@router.post("/", status_code=201)
async def upload_file_directly(
    isVideo: bool = Form(...),
    file: UploadFile = File(...),
    thumbnail_id: Optional[str] = Form(None),
):
    try:
        # Decide bucket and object key prefix based on flag
        bucket = settings.MINIO_RAW_VIDEO_BUCKET if isVideo else settings.MINIO_VIDEO_THUMBNAIL_BUCKET
        prefix = "videos" if isVideo else "thumbnails"
        object_id = thumbnail_id.replace("videos","thumbnails") if thumbnail_id else f"{prefix}/{uuid.uuid4()}"

        # Ensure bucket exists
        if not minio_client.bucket_exists(bucket):
            minio_client.make_bucket(bucket)

        # Read the file into memory. For large files consider streaming.
        minio_client.put_object(
            bucket,
            object_id,
            file.file,
            length=-1,
            content_type=file.content_type or "application/octet-stream",
            part_size=10*1024*1024,
        )

        return {"message": "Upload successful", "object_id": object_id}
    except Exception as e:
        logging.error(e)
        raise HTTPException(status_code=500, detail="Upload failed")


@router.post("/metadata", status_code=201)
def upload_metadata(
    metadata: UploadMetadata,
    db: Session = Depends(get_db)
):
    try:
        video = Video(
            id=metadata.video_id,
            title=metadata.title,
            description=metadata.description,
        )

        print("video: ", video)

        db.add(video)
        db.commit()
        db.refresh(video)

        return {
            "message": "Video metadata uploaded successfully",
            "video": video.to_dict()
        }
        # return Response.success(message="Video metadata uploaded successfully")
    except Exception as e:
        print("Error uploading metadata: ", e)
        logging.error(e)
        raise HTTPException(status_code=500, detail="Server error")

