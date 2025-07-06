from pydantic import BaseModel

class VideoSchema(BaseModel):
    id: str
    title: str
    description: str
    processing_status: str
    created_at: str
    updated_at: str
