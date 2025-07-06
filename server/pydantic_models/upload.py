from pydantic import BaseModel

class UploadMetadata(BaseModel):
    video_id: str
    title: str
    description: str