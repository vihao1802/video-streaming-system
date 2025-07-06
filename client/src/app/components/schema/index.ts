import { z } from "zod";

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

export const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().optional(),
  video_thumbnail: z
    .any()
    .refine((files) => files?.length > 0, "Thumbnail is required")
    .refine(
      (files) =>
        files?.[0]?.type ? ACCEPTED_IMAGE_TYPES.includes(files[0].type) : false,
      ".jpg, .jpeg, .png and .webp files are accepted."
    ),
  video_file: z
    .any()
    .refine((files) => files?.length > 0, "Video file is required")
    .refine(
      (files) =>
        files?.[0]?.type ? ACCEPTED_VIDEO_TYPES.includes(files[0].type) : false,
      ".mp4, .webm, .mov files are accepted."
    ),
});
