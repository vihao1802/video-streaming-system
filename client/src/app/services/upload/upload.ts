import { Response } from "@/app/types/api/response";
import { PresignedUrls, UploadMetadata } from "../../types/api/upload";
import { uploadToMinIO } from "./concrete-strategy/uploadToMinio";
import { uploadToServer } from "./concrete-strategy/uploadToServer";
import { UploadStrategyContext } from "./uploadStrategyContext";
import { SERVER_URL } from "@/app/config";

class UploadService {
  async getPresignedUrls(): Promise<PresignedUrls> {
    try {
      const response = await fetch(`${SERVER_URL}/upload/presigned-urls`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching presigned URLs:", error);
      throw error;
    }
  }

  async uploadMetadata(
    metadata: UploadMetadata
  ): Promise<Response<UploadMetadata>> {
    try {
      const response = await fetch(`${SERVER_URL}/upload/metadata`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
      });
      const data: Response<UploadMetadata> = await response.json();
      return data;
    } catch (error) {
      console.error("Error uploading metadata:", error);
      throw error;
    }
  }

  async uploadFile(
    file: FileList,
    action: string = "minio",
    thumbnail_id?: string
  ): Promise<any> {
    const uploadStrategyContext = new UploadStrategyContext(uploadToMinIO);

    switch (action) {
      case "server":
        uploadStrategyContext.setUpload(uploadToServer);
        return uploadStrategyContext.uploadToS3(file, thumbnail_id);
      default:
        const response = await this.getPresignedUrls();

        if (!response) {
          throw new Error("Failed to get presigned URLs");
        }

        uploadToMinIO.setPresignedUrl(response.video_url);
        uploadStrategyContext.setUpload(uploadToMinIO);

        return uploadStrategyContext.uploadToS3(file, thumbnail_id);
    }
  }
}

export const uploadService = new UploadService();
