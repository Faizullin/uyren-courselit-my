"use client";

import { Address, Media, Profile } from "@workspace/common-models";
import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Progress } from "@workspace/ui/components/progress";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { Upload, X } from "lucide-react";
import React, { ChangeEvent, useEffect, useState } from "react";
import Dialog2 from "../dialog2";
import { useToast } from "../hooks/use-toast";
import { Image } from "../image";
import Access from "./access";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

interface Strings {
  buttonCaption?: string;
  dialogTitle?: string;
  cancelCaption?: string;
  dialogSelectCaption?: string;
  header?: string;
  loadMoreText?: string;
  editingArea?: string;
  buttonAddFile?: string;
  fileUploaded?: string;
  uploadFailed?: string;
  uploading?: string;
  uploadButtonText?: string;
  headerMediaPreview?: string;
  originalFileNameHeader?: string;
  previewPDFFile?: string;
  directUrl?: string;
  urlCopied?: string;
  fileType?: string;
  changesSaved?: string;
  mediaDeleted?: string;
  deleteMediaPopupHeader?: string;
  popupCancelAction?: string;
  popupOKAction?: string;
  deleteMediaButton?: string;
  publiclyAvailable?: string;
  removeButtonCaption?: string;
}

interface MediaSelectorProps {
  profile: Omit<Profile, "fetched">;
  onError?: (err: Error) => void;
  address: Address;
  title: string;
  src: string;
  srcTitle: string;
  onSelection: (...args: any[]) => void;
  onRemove?: (...args: any[]) => void;
  mimeTypesToShow?: string[];
  access?: Access;
  strings: Strings;
  mediaId?: string;
  type: "course" | "lesson" | "page" | "user" | "domain" | "community";
  hidePreview?: boolean;
  tooltip?: string;
  disabled?: boolean;
}

const mediaSelectorSchema = z.object({
  file: z.any().optional(),
  caption: z.string().optional(),
});
type MediaSelectorFormData = z.infer<typeof mediaSelectorSchema>;

const MediaSelector = (props: MediaSelectorProps) => {
  const [dialogOpened, setDialogOpened] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const defaultUploadData = {
    caption: "",
    uploading: false,
    public: props.access === "public",
  };
  const [uploadData, setUploadData] = useState(defaultUploadData);
  const fileInput = React.createRef<HTMLInputElement>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const { toast } = useToast();
  const {
    strings,
    address,
    src,
    title,
    srcTitle,
    tooltip,
    disabled = false,
    onError = (err: Error) => {
      toast({
        title: "Error",
        description: `Media upload: ${err.message}`,
        variant: "destructive",
      });
    },
  } = props;
  const form = useForm<MediaSelectorFormData>({
    resolver: zodResolver(mediaSelectorSchema),
    defaultValues: {
      file: undefined,
      caption: "",
    },
  });

  const onSelection = (media: Media) => {
    props.onSelection(media);
  };

  useEffect(() => {
    if (!dialogOpened) {
      setSelectedFile(null);
      setCaption("");
      setUploadProgress(0);
    }
  }, [dialogOpened]);

  const uploadToCloudinary = async (file: File, caption: string): Promise<Media> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("caption", caption);
    formData.append("access", uploadData.public ? "public" : "private");
    formData.append("type", props.type);

    // Create XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round(
            (event.loaded / event.total) * 100,
          );
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          try {
            const media = JSON.parse(xhr.responseText);
            resolve(media);
          } catch (err) {
            reject(new Error("Invalid response format"));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.message || "Upload failed"));
          } catch (err) {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"));
      });

      xhr.open(
        "POST",
        `${address.backend}/api/services/media/upload?storageType=cloudinary`,
      );
      xhr.send(formData);
    });
  };

  const uploadFile = async (data: MediaSelectorFormData) => {
    const file = data.file;

    if (!file) {
      setError("File is required");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      const media = await uploadToCloudinary(file, data.caption || "");
      onSelection(media);
      toast({
        title: "Success",
        description: strings.fileUploaded || "File uploaded successfully",
      });
    } catch (err: any) {
      onError(err);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setSelectedFile(null);
      setCaption("");
      setDialogOpened(false);
    }
  };

  const removeFile = async () => {
    try {
      setUploading(true);
      const response = await fetch(
        `${address.backend}/api/services/media/${props.mediaId}?storageType=cloudinary`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Delete failed");
      }

      if (props.onRemove) {
        props.onRemove();
      }

      toast({
        title: "Success",
        description: strings.mediaDeleted || "Media deleted successfully",
      });
    } catch (err: any) {
      onError(err);
    } finally {
      setUploading(false);
      setDialogOpened(false);
    }
  };

  return (
    <div className="">
      <div className="flex items-center gap-4 rounded-lg border-2 border-dashed p-4 relative">
        {!props.hidePreview && (
          <div className="flex flex-col gap-2 items-center">
            <Image
              src={src}
              width="w-[80px]"
              height="h-[80px]"
              className="rounded-md"
            />
            <Tooltip>
              <TooltipTrigger>
                <p className="text-xs w-12 truncate text-muted-foreground">
                  {srcTitle}
                </p>
              </TooltipTrigger>
              <TooltipContent>{srcTitle}</TooltipContent>
            </Tooltip>
          </div>
        )}
        {props.mediaId && (
          <Button
            onClick={removeFile}
            disabled={uploading || disabled}
            size="sm"
            variant="outline"
          >
            <X className="mr-2 h-4 w-4" />
            {uploading ? "Working..." : strings.removeButtonCaption || "Remove"}
          </Button>
        )}
        {!props.mediaId && (
          <div>
            <Dialog2
              title={strings.dialogTitle || "Select media"}
              trigger={
                <Button size="sm" variant="secondary" disabled={disabled}>
                  {strings.buttonCaption || "Select media"}
                </Button>
              }
              open={dialogOpened}
              onOpenChange={setDialogOpened}
              okButton={
                <Button
                  type="submit"
                  form="media-upload-form"
                  disabled={uploading}
                >
                  {uploading
                    ? strings.uploading || "Uploading"
                    : strings.uploadButtonText || "Upload"}
                </Button>
              }
            >
              {error && <div>{error}</div>}
              <Form {...form}>
                <form
                  id="media-upload-form"
                  encType="multipart/form-data"
                  className="flex flex-col gap-4"
                  onSubmit={form.handleSubmit((data) => uploadFile(data))}
                >
                  <FormField
                    control={form.control}
                    name="file"
                    render={({ field: { onChange, value, ...field } }) => (
                      <FormItem>
                        <FormLabel>File</FormLabel>
                        <FormControl>
                          <Input
                            ref={fileInput}
                            type="file"
                            accept={props.mimeTypesToShow?.join(",")}
                            onChange={(e: any) => {
                              const file = e.target.files?.[0];
                              setSelectedFile(file);
                              onChange(file);
                            }}
                            disabled={uploading}
                            className="mt-2"
                            required
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedFile && (
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Upload className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">
                          {selectedFile.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>

                      {uploading && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Uploading...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <Progress value={uploadProgress} className="h-2" />
                        </div>
                      )}
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="caption"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Caption</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={5}
                            disabled={uploading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </Dialog2>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaSelector;
