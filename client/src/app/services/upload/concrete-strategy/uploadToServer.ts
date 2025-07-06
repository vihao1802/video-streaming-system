import { SERVER_URL } from "@/app/config";
import { IUploadStrategy } from "../IUploadStrategy";

class UploadToServer implements IUploadStrategy {
  async uploadToS3(file: FileList, thumbnail_id?: string): Promise<Response> {
    try {
      const fileToUpload = file[0];

      if (!fileToUpload) {
        throw new Error("No file provided for upload");
      }

      const isVideo = fileToUpload.type === "video/mp4";

      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("isVideo", isVideo.toString());
      formData.append("thumbnail_id", thumbnail_id || "");

      const response = await fetch(`${SERVER_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log(data);

      return data;
    } catch (error) {
      console.error("Error uploading file directly:", error);
      throw error;
    }
  }
}

export const uploadToServer = new UploadToServer();
