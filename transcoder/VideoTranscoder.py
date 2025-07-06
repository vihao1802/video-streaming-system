import os
import requests
import boto3
import subprocess
from botocore.client import Config
from settings import settings
from pathlib import Path

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
        # DASH
        command = [
            "ffmpeg",
            "-i",
            input_path,
            "-filter_complex",
            "[0:v]split=3[v1][v2][v3];"
            "[v1]scale=640:360:flags=fast_bilinear[360p];"
            "[v2]scale=1280:720:flags=fast_bilinear[720p];"
            "[v3]scale=1920:1080:flags=fast_bilinear[1080p]",
            # 360p video stream
            "-map",
            "[360p]",
            "-c:v:0",
            "libx264",
            "-b:v:0",
            "1000k",
            "-preset",
            "veryfast",
            "-profile:v",
            "high",
            "-level:v",
            "4.1",
            "-g",
            "48",
            "-keyint_min",
            "48",
            # 720p video stream
            "-map",
            "[720p]",
            "-c:v:1",
            "libx264",
            "-b:v:1",
            "4000k",
            "-preset",
            "veryfast",
            "-profile:v",
            "high",
            "-level:v",
            "4.1",
            "-g",
            "48",
            "-keyint_min",
            "48",
            # 1080p video stream
            "-map",
            "[1080p]",
            "-c:v:2",
            "libx264",
            "-b:v:2",
            "8000k",
            "-preset",
            "veryfast",
            "-profile:v",
            "high",
            "-level:v",
            "4.1",
            "-g",
            "48",
            "-keyint_min",
            "48",
            # Audio stream
            "-map",
            "0:a",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            # DASH specific settings
            "-use_timeline",
            "1",
            "-use_template",
            "1",
            "-window_size",
            "5",
            "-adaptation_sets",
            "id=0,streams=v id=1,streams=a",
            "-f",
            "dash",
            f"{output_dir}/manifest.mpd",
        ]
        process = subprocess.run(command, check=True)
        print(f"Video processed to DASH at {output_dir}")

        if process.returncode != 0:
            print(process.stderr)
            raise Exception("Transcoding failed!")

    def upload_processed_files(self, prefix, local_dir):
        try:
            # Ensure the local directory exists
            if not os.path.exists(local_dir):
                print(f"Error: Local directory {local_dir} does not exist")
                return

            # Ensure the bucket exists
            bucket_exists = True
            try:
                self.s3.head_bucket(Bucket=settings.MINIO_PROCESS_VIDEO_BUCKET)
                print(f"Bucket {settings.MINIO_PROCESS_VIDEO_BUCKET} exists")
            except Exception as e:
                if "404" in str(e):  # Bucket doesn't exist
                    bucket_exists = False
                    print(f"Bucket {settings.MINIO_PROCESS_VIDEO_BUCKET} does not exist, creating...")
                else:
                    print(f"Error checking bucket {settings.MINIO_PROCESS_VIDEO_BUCKET}: {e}")
                    raise

            if not bucket_exists:
                try:
                    # For MinIO, we need to use make_bucket instead of create_bucket
                    self.s3.create_bucket(Bucket=settings.MINIO_PROCESS_VIDEO_BUCKET)
                    print(f"Successfully created bucket: {settings.MINIO_PROCESS_VIDEO_BUCKET}")
                except Exception as create_error:
                    print(f"Failed to create bucket {settings.MINIO_PROCESS_VIDEO_BUCKET}: {create_error}")
                    return

            # Upload files
            for root, _, files in os.walk(local_dir):
                for file in files:
                    try:
                        local_path = os.path.join(root, file)
                        relative_path = os.path.relpath(local_path, local_dir)
                        s3_key = f"{prefix}/{relative_path}"
                        
                        print(f"Uploading {local_path} to s3://{settings.MINIO_PROCESS_VIDEO_BUCKET}/{s3_key}")
                        
                        self.s3.upload_file(
                            local_path,
                            settings.MINIO_PROCESS_VIDEO_BUCKET,
                            s3_key
                        )
                        print(f"Successfully uploaded {s3_key}")
                        
                    except Exception as file_error:
                        print(f"Error uploading {file}: {file_error}")
                        continue  # Continue with next file if one fails
                        
        except Exception as e:
            print(f"Unexpected error in upload_processed_files: {e}")
            raise

    def update_video_status(self, url, object_key):
        try:
            response = requests.put(
                f"{url}/videos?id={object_key}"
            )
            print(f"Status updated. Server responded with: {response.status_code}")
        except requests.RequestException as e:
            print(f"Failed to notify status: {e}")

    def process_video(self, object_key):
        work_dir = Path("/tmp/workspace")
        work_dir.mkdir(exist_ok=True)
        input_path = work_dir / "input.mp4"
        output_path = work_dir / "output"
        output_path.mkdir(exist_ok=True)

        print("Processing video: ", object_key)

        try:
            self.download_video(
                bucket_name=settings.MINIO_RAW_VIDEO_BUCKET,
                object_key=object_key,
                download_path=input_path
            )
            self.transcode_video(
                input_path=input_path,
                output_dir=output_path
            )
            self.upload_processed_files(
                prefix=object_key,
                local_dir=output_path
            )
            self.update_video_status(
                url=settings.SERVER_URL,
                object_key=object_key
            )

        finally:
            if input_path.exists():
                input_path.unlink()
            if output_path.exists():
                import shutil
                shutil.rmtree(str(output_path)) 
