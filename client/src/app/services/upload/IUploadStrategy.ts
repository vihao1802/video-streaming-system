export interface IUploadStrategy {
  uploadToS3(file: FileList, thumbnail_id?: string): Promise<Response>;
}
