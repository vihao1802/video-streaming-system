from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    POSTGRES_DB_URL: str = ""
    MINIO_ROOT_USER: str = ""
    MINIO_ROOT_PASSWORD: str = ""
    MINIO_URL: str = ""
    MINIO_ACCESS_KEY: str = ""
    MINIO_SECRET_KEY: str = ""
    MINIO_RAW_VIDEO_BUCKET: str = ""
    MINIO_VIDEO_THUMBNAIL_BUCKET: str = ""
    MINIO_PREVIEW_IMAGE_ENDPOINT: str = ""

settings = Settings()
