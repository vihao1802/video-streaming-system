import { IUploadStrategy } from "./IUploadStrategy";
import { uploadToMinIO } from "./concrete-strategy/uploadToMinio";

export class UploadStrategyContext {
  private upload: IUploadStrategy;

  constructor(upload: IUploadStrategy) {
    this.upload = upload;
  }

  setUpload(upload: IUploadStrategy) {
    this.upload = upload;
  }

  uploadToS3(file: FileList, thumbnail_id?: string): Promise<Response> {
    return this.upload.uploadToS3(file, thumbnail_id);
  }
}
