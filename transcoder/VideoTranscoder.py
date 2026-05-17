import os
import requests
import boto3
import subprocess
from botocore.client import Config
from settings import settings
from pathlib import Path
from ffmpeg_presets import get_dash_transcode_preset, get_hls_transcode_preset

class VideoTranscoder:
    def __init__(self):
        self.s3 = boto3.client(
            's3',
            endpoint_url=settings.MINIO_URL,
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            region_name='us-east-1',
            config=Config(signature_version='s3v4')
        )

    def download_video(self, bucket_name, object_key, download_path='input.mp4'):
        self.s3.download_file(bucket_name, object_key, download_path)
        print(f"Downloaded video to {download_path}")

    def transcode_video(self, input_path='input.mp4', output_dir='output'):
        try:
            dash_command = get_dash_transcode_preset(input_path, str(output_dir))
            subprocess.run(dash_command, check=True)
            
            hls_command = get_hls_transcode_preset(input_path, str(output_dir))
            subprocess.run(hls_command, check=True)

            print(f"Video processed to DASH and HLS at {output_dir}")

        except subprocess.CalledProcessError as e:
            print(f"Error during transcoding: {e}")
            raise

    def upload_processed_files(self, prefix: str, local_dir: str) -> None:
        """
        Upload processed files from local directory to S3 bucket.
        
        Args:
            prefix: S3 key prefix for the uploaded files
            local_dir: Local directory containing files to upload
            
        Raises:
            FileNotFoundError: If local directory doesn't exist
            Exception: For other S3-related errors
        """
        try:
            self._ensure_local_dir_exists(local_dir)
            self._ensure_bucket_exists(settings.MINIO_PROCESS_VIDEO_BUCKET)
            
            # Upload all files in the directory
            for root, _, files in os.walk(local_dir):
                for file in files:
                    local_path = os.path.join(root, file)
                    relative_path = os.path.relpath(local_path, local_dir)
                    s3_key = f"{prefix}/{relative_path}"
                    self._upload_file_to_s3(local_path, settings.MINIO_PROCESS_VIDEO_BUCKET, s3_key)
                    
        except Exception as e:
            print(f"Error in upload_processed_files: {e}")
            raise

    def _ensure_local_dir_exists(self, local_dir: str) -> None:
        """Verify that the local directory exists."""
        if not os.path.exists(local_dir):
            raise FileNotFoundError(f"Local directory {local_dir} does not exist")

    def _ensure_bucket_exists(self, bucket_name: str) -> None:
        """Ensure the specified bucket exists, create it if it doesn't."""
        try:
            self.s3.head_bucket(Bucket=bucket_name)
            print(f"Bucket {bucket_name} exists")
            return
            
        except Exception as e:
            if "404" not in str(e):
                print(f"Error checking bucket {bucket_name}: {e}")
                raise
                
        print(f"Bucket {bucket_name} does not exist, creating...")
        try:
            self.s3.create_bucket(Bucket=bucket_name)
            print(f"Successfully created bucket: {bucket_name}")
        except Exception as e:
            print(f"Failed to create bucket {bucket_name}: {e}")
            raise

    def _upload_file_to_s3(self, local_path: str, bucket_name: str, s3_key: str) -> bool:
        try:
            print(f"Uploading {local_path} to s3://{bucket_name}/{s3_key}")
            self.s3.upload_file(local_path, bucket_name, s3_key)
            print(f"Successfully uploaded {s3_key}")
            return True
        except Exception as e:
            print(f"Error uploading {os.path.basename(local_path)}: {e}")
            return False

    def update_video_status(self, url, object_key):
        try:
            response = requests.put(
                f"{url}/videos?id={object_key}"
            )
            print(f"Status updated. Server responded with: {response.status_code}")
        except requests.RequestException as e:
            print(f"Failed to notify status: {e}")

    def process_video(self, object_key, bucket_name=None):
        work_dir = Path("/tmp/workspace")
        work_dir.mkdir(exist_ok=True)
        input_path = work_dir / "input.mp4"
        output_path = work_dir / "output"
        output_path.mkdir(exist_ok=True)

        print(f"Processing video: {object_key} from bucket: {bucket_name}")

        try:
            # Extract video_id from object_key (e.g., 'videos/uuid.mp4' -> 'uuid')
            import os
            base_name = os.path.basename(object_key)
            video_id = os.path.splitext(base_name)[0]

            # Use provided bucket_name or fall back to settings
            bucket_to_use = bucket_name or settings.MINIO_RAW_VIDEO_BUCKET
            self.download_video(
                bucket_name=bucket_to_use,
                object_key=object_key,
                download_path=input_path
            )
            self.transcode_video(
                input_path=input_path,
                output_dir=output_path
            )
            self.upload_processed_files(
                prefix=video_id,
                local_dir=output_path
            )
            self.update_video_status(
                url=settings.SERVER_URL,
                object_key=video_id
            )

        finally:
            if input_path.exists():
                input_path.unlink()
            if output_path.exists():
                import shutil
                shutil.rmtree(str(output_path)) 
