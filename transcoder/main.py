import json
import time
import threading
import logging
from kafka import KafkaConsumer, errors
from kafka.errors import NoBrokersAvailable
from settings import settings
from VideoTranscoder import VideoTranscoder
from utils import get_url_decoded

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('transcoder')

topic_name = settings.KAFKA_TOPIC

def create_kafka_consumer():
    """Create and return a Kafka consumer with retry logic."""
    max_retries = 10
    retry_delay = 5
    
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Attempt {attempt}: Connecting to Kafka at {settings.KAFKA_BROKER}")
            consumer = KafkaConsumer(
                topic_name,
                bootstrap_servers=settings.KAFKA_BROKER,
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                auto_offset_reset='latest',  # Only process new messages
                group_id='video-transcoder-group',  # Add consumer group
                enable_auto_commit=True,
                session_timeout_ms=10000,  # 10 seconds
                request_timeout_ms=11000,  # 11 seconds
                max_poll_interval_ms=300000  # 5 minutes
            )
            logger.info("Successfully connected to Kafka")
            return consumer
        except NoBrokersAvailable:
            if attempt == max_retries:
                logger.error("No Kafka brokers available after multiple retries")
                raise
            logger.warning(f"No brokers available. Retrying in {retry_delay} seconds... (Attempt {attempt}/{max_retries})")
            time.sleep(retry_delay)
        except Exception as e:
            logger.error(f"Unexpected error connecting to Kafka: {e}")
            if attempt == max_retries:
                raise
            time.sleep(retry_delay)
    
    raise Exception("Failed to create Kafka consumer after multiple attempts")

def process_message(message):
    """Process a single Kafka message."""
    try:
        logger.info(f"Received message: {message.value}")
        
        # Extract object key from the message
        records = message.value.get('Records', [])
        if not records:
            logger.warning("No Records found in message")
            return
            
        raw_key = records[0].get('s3', {}).get('object', {}).get('key')
        if not raw_key:
            logger.warning("No object key found in message")
            return
            
        object_key = get_url_decoded(raw_key)
        logger.info(f"Processing video: {object_key}")
        
        # Process the video
        processor = VideoTranscoder()
        processor.process_video(object_key=object_key)
        
        logger.info(f"Successfully processed video: {object_key}")
        
    except Exception as e:
        logger.error(f"Error processing message: {e}", exc_info=True)

def consume_messages():
    """Continuously consume messages from Kafka."""
    consumer = None
    
    while True:  # Outer loop for reconnection
        try:
            if consumer is None:
                consumer = create_kafka_consumer()
                logger.info("Starting to consume messages...")
            
            # This will block until a message is received
            for message in consumer:
                process_message(message)
                
        except Exception as e:
            logger.error(f"Error in Kafka consumer: {e}")
            
            # Close the consumer if it exists
            if consumer is not None:
                try:
                    consumer.close()
                except:
                    pass
                consumer = None
                
            # Wait before reconnecting
            logger.info("Attempting to reconnect in 10 seconds...")
            time.sleep(10)

def init_kafka_listener():
    """Initialize the Kafka listener in a separate thread."""
    try:
        logger.info("Starting Kafka listener thread...")
        thread = threading.Thread(target=consume_messages, daemon=True)
        thread.start()
        logger.info(f"Kafka listener started for topic: {topic_name}")
        return thread
    except Exception as e:
        logger.error(f"Failed to start Kafka listener: {e}")
        raise

if __name__ == "__main__":
    logger.info("Starting video transcoder service...")
    
    # Start the Kafka listener
    kafka_thread = init_kafka_listener()
    
    # Keep the main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
    finally:
        logger.info("Video transcoder service stopped")
