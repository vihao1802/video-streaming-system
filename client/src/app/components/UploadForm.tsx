"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormControl,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useRef,
  useState,
  forwardRef,
  useCallback,
  ChangeEvent,
  InputHTMLAttributes,
  Ref,
  RefObject,
} from "react";
import { Loader2, Upload as UploadIcon, X } from "lucide-react";
import {
  formSchema,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
} from "./schema";
import { toast } from "sonner";
import { uploadService } from "../services/upload/upload";

type FormValues = z.infer<typeof formSchema>;

interface FileInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  onChange: (files: FileList | null) => void;
  inputRef?: Ref<HTMLInputElement>;
}

const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  ({ onChange, inputRef, ...props }, ref) => {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.files);
    };

    return (
      <input
        type="file"
        ref={(e) => {
          if (inputRef) {
            if (typeof inputRef === "function") {
              inputRef(e);
            } else {
              (inputRef as RefObject<HTMLInputElement | null>).current = e;
            }
          }
          if (ref) {
            if (typeof ref === "function") {
              ref(e);
            } else {
              (ref as RefObject<HTMLInputElement | null>).current = e;
            }
          }
        }}
        onChange={handleChange}
        {...props}
      />
    );
  }
);
FileInput.displayName = "FileInput";

const UploadForm = () => {
  const thumbnailRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      video_thumbnail: undefined,
      video_file: undefined,
    },
  });

  const handleThumbnailChange = useCallback((files: FileList | null) => {
    const file = files?.[0];
    if (file && ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      return true;
    } else if (files?.[0]) {
      // File type not accepted
      return false;
    } else {
      setThumbnailPreview(null);
      return true;
    }
  }, []);

  const removeThumbnail = useCallback(() => {
    setThumbnailPreview(null);
    if (thumbnailRef.current) {
      thumbnailRef.current.value = "";
    }
    form.setValue("video_thumbnail", undefined as unknown as FileList, {
      shouldValidate: true,
    });
  }, [form]);

  // use with presigned urls approach
  /* const onSubmit = async (values: FormValues) => {
    try {
      const response = await uploadService.getPresignedUrls();

      if (!response) {
        throw new Error("Failed to get presigned URLs");
      }

      const { video_url, video_id, thumbnail_url, thumbnail_id } = response;

      const videoResponse = await uploadService.uploadToS3(
        video_url,
        values.video_file
      );
      const thumbnailResponse = await uploadService.uploadToS3(
        thumbnail_url,
        values.video_thumbnail
      );

      if (videoResponse && thumbnailResponse) {
        // TODO: Upload metadata to database
      }
    } catch (error) {
      toast.error("Error submitting form");
      console.error("Error submitting form:", error);
    }
  }; */

  // use with direct upload approach
  const onSubmit = async (values: FormValues) => {
    try {
      const videoResponse = await uploadService.uploadFile(
        values.video_file,
        "server"
      );

      const thumbnailResponse = await uploadService.uploadFile(
        values.video_thumbnail,
        "server",
        videoResponse.object_id
      );

      if (videoResponse && thumbnailResponse) {
        console.log({ videoResponse, thumbnailResponse });

        // TODO: Upload metadata to database
        const res = await uploadService.uploadMetadata({
          title: values.title,
          description: values.description || "",
          video_id: videoResponse.object_id,
        });

        console.log("[uploadForm] res: ", res);
        toast.success("Video uploaded successfully");
        form.reset();
        removeThumbnail();
      }
    } catch (error) {
      toast.error("Error submitting form");
      console.error("Error submitting form:", error);
    }
  };

  return (
    <div className="w-full mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Upload New Video</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Title Field */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter video title"
                    {...field}
                    className="w-full"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description Field */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter video description"
                    {...field}
                    rows={4}
                    className="w-full"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Thumbnail Upload */}
          <FormField
            control={form.control}
            name="video_thumbnail"
            render={({ field: { onChange, value, ...field } }) => (
              <FormItem>
                <FormLabel>Thumbnail</FormLabel>
                <FormControl>
                  <div className="flex flex-col gap-2">
                    <div className="space-y-2">
                      <FileInput
                        accept={ACCEPTED_IMAGE_TYPES.join(",")}
                        className="hidden"
                        onChange={(files) => {
                          const isValid = handleThumbnailChange(files);
                          if (isValid) {
                            onChange(files);
                          } else {
                            form.setError("video_thumbnail", {
                              type: "manual",
                              message:
                                "Please upload a valid image file (JPG, PNG, or WebP)",
                            });
                          }
                        }}
                        inputRef={thumbnailRef}
                        {...field}
                      />
                      {!thumbnailPreview ? (
                        <div
                          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => thumbnailRef.current?.click()}
                        >
                          <UploadIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            JPG, PNG, or WebP (max. 5MB)
                          </p>
                        </div>
                      ) : (
                        <div className="relative group">
                          <div className="relative aspect-video overflow-hidden rounded-lg">
                            <img
                              src={thumbnailPreview}
                              alt="Thumbnail preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeThumbnail();
                              }}
                              className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {form.watch("video_thumbnail")?.[0]?.name}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </FormControl>
                <FormDescription>
                  Upload a thumbnail image (JPEG, PNG, or WebP)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Video Upload */}
          <FormField
            control={form.control}
            name="video_file"
            render={({ field: { onChange, value, ...field } }) => (
              <FormItem>
                <FormLabel>Video File</FormLabel>
                <FormControl>
                  <div className="flex flex-col gap-2">
                    <Input
                      type="file"
                      accept={ACCEPTED_VIDEO_TYPES.join(",")}
                      className="hidden"
                      onChange={(e) =>
                        onChange(
                          e.target.files && e.target.files[0]
                            ? e.target.files
                            : null
                        )
                      }
                      {...field}
                      ref={(e) => {
                        // Forward the ref to both react-hook-form and our ref
                        field.ref(e);
                        if (videoRef.current !== e) {
                          // @ts-ignore
                          videoRef.current = e;
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => videoRef.current?.click()}
                      className="w-full"
                    >
                      <UploadIcon className="mr-2 h-4 w-4" />
                      {form.getValues("video_file")?.[0]?.name ||
                        "Select video file"}
                    </Button>
                    {form.getValues("video_file")?.[0]?.name && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {form.getValues("video_file")[0].name}
                      </p>
                    )}
                  </div>
                </FormControl>
                <FormDescription>
                  Upload a video file (MP4, WebM, or MOV)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full cursor-pointer"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload Video"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default UploadForm;
