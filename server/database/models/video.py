from database.engine import Base
from sqlalchemy import Column, TEXT, Enum, TIMESTAMP, func
import enum

class ProcessingStatus(enum.Enum):
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    IN_PROGRESS = "IN_PROGRESS"

class Video(Base):
    __tablename__ = "videos"

    id = Column(TEXT, primary_key=True)
    title = Column(TEXT, nullable=False)
    description = Column(TEXT, nullable=True)
    processing_status = Column(
        Enum(ProcessingStatus),
        nullable=False,
        default=ProcessingStatus.IN_PROGRESS
    )
    created_at = Column(TIMESTAMP, nullable=False, default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, default=func.now(), onupdate=func.now())

    #  serialize model instance to JSON
    def to_dict(self):
        result = {} 
        for c in self.__table__.columns:
            value = getattr(self, c.name)
            if isinstance(value, enum.Enum):
                value = value.value
            result[c.name] = value
        return result
