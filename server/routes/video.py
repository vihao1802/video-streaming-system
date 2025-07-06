from fastapi import APIRouter
from database.engine import get_db
from sqlalchemy.orm import Session
from pydantic_models.response import Response
from database.models.video import Video
from fastapi import HTTPException
import logging
from database.models.video import ProcessingStatus
from fastapi import Depends
from pydantic_models.response import Response

router = APIRouter(
    prefix="/videos",
    tags=["Videos"],
)

@router.put("/")
def update_video_status_by_id(
    id: str,
    db: Session = Depends(get_db)
):
    try:
        video = db.query(Video).filter(Video.id == id).first()
        if not video:
            return Response.error("Video not found")
        
        video.processing_status = ProcessingStatus.COMPLETED
        db.commit()
        
        return Response.success("Video status updated successfully")
    except Exception as e:
        logging.error(e)
        raise HTTPException(status_code=500, detail="Server error")