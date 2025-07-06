import { IUploadStrategy } from "../IUploadStrategy";

class UploadToMinIO implements IUploadStrategy {
  private presignedUrl: string = "";

  setPresignedUrl(url: string) {
    this.presignedUrl = url;
  }

  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  async uploadToS3(file: FileList): Promise<Response> {
    try {
      if (!this.presignedUrl) {
        throw new Error("Presigned URL is required");
      }
      // Handle both File and FileList inputs
      const fileToUpload = file[0];

      if (!fileToUpload) {
        throw new Error("No file provided for upload");
      }

      // Convert file to ArrayBuffer using FileReader for better compatibility
      const fileBuffer = await this.readFileAsArrayBuffer(fileToUpload);

      // Use the presigned URL as-is since we're using host network mode
      console.log("Uploading to presigned URL:", this.presignedUrl);

      // For MinIO, we don't set Content-Type header here as it's included in the presigned URL
      const response = await fetch(this.presignedUrl, {
        method: "PUT",
        body: fileBuffer,
        headers: {
          "Content-Length": fileToUpload.size.toString(),
          // MinIO requires the following header for direct uploads
          "x-amz-acl": "public-read",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Upload failed with status ${response.status}: ${errorText}`
        );
      }

      console.log("Upload successful:", {
        status: response.status,
        statusText: response.statusText,
        url: this.presignedUrl,
        file: fileToUpload.name,
        size: fileToUpload.size,
        type: fileToUpload.type,
      });

      return response;
    } catch (error) {
      console.error("Error uploading to S3:", error);
      throw error;
    }
  }
}

export const uploadToMinIO = new UploadToMinIO();
