from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    KAFKA_BROKER: str = "" 
    KAFKA_TOPIC: str = ""
    SERVER_URL: str = ""
    MINIO_URL: str = ""
    MINIO_ACCESS_KEY: str = ""
    MINIO_SECRET_KEY: str = ""
    MINIO_RAW_VIDEO_BUCKET: str = ""
    MINIO_PROCESS_VIDEO_BUCKET: str = ""

settings = Settings()