"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Progress } from "@workspace/ui/components/progress";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { Upload, X } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast as sonnerToast } from "sonner";
import { z } from "zod";
import Dialog2 from "../dialog2";
import { useToast } from "../hooks/use-toast";
import Access from "./access";

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

interface MediaSelectorFunctions {
  uploadFile: (files: File[], type: string) => Promise<any[]>;
}

interface MediaSelectorProps {
  title: string;
  src: string;
  srcTitle: string;
  onSelection: (media: any) => void;
  onRemove?: () => void;
  functions: MediaSelectorFunctions;
  strings: Strings;
  mediaId?: string;
  type: "course" | "lesson" | "page" | "user" | "domain" | "community";
  hidePreview?: boolean;
  disabled?: boolean;
  access?: Access;
  mimeTypesToShow?: string[];
}

const mediaSelectorSchema = z.object({
  file: z.any().optional(),
  caption: z.string().optional(),
});
type MediaSelectorFormData = z.infer<typeof mediaSelectorSchema>;

const MediaSelector = (props: MediaSelectorProps) => {
  const [dialogOpened, setDialogOpened] = useState(false);
  const fileInput = React.createRef<HTMLInputElement>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    strings,
    src,
    srcTitle,
    functions,
    disabled = false,
    access = "public",
  } = props;
  const form = useForm<MediaSelectorFormData>({
    resolver: zodResolver(mediaSelectorSchema),
    defaultValues: {
      file: undefined,
      caption: "",
    },
  });

  const onSelection = (media: any) => {
    props.onSelection(media);
  };

  useEffect(() => {
    if (!dialogOpened) {
      setSelectedFile(null);
      form.reset();
    }
  }, [dialogOpened, form]);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, caption }: { file: File; caption: string }) => {
      const results = await functions.uploadFile([file], props.type);
      return results[0];
    },
    onSuccess: (media) => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      onSelection(media);
      sonnerToast.success(strings.fileUploaded || "File uploaded successfully");
      setSelectedFile(null);
      form.reset();
      setDialogOpened(false);
    },
    onError: (err: any) => {
      const errorMessage = err.message || "Upload failed";
      sonnerToast.error(errorMessage);
    },
  });

  const handleUploadFile = (data: MediaSelectorFormData) => {
    const file = data.file;
    if (!file) return;

    uploadMutation.mutate({ file, caption: data.caption || "" });
  };

  const removeMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      const response = await fetch(
        `/api/services/media/${mediaId}?storageType=cloudinary`,
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

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      if (props.onRemove) {
        props.onRemove();
      }
      sonnerToast.success(strings.mediaDeleted || "Media deleted successfully");
      setDialogOpened(false);
    },
    onError: (err: any) => {
      sonnerToast.error(`Media delete: ${err.message || "Delete failed"}`);
    },
  });

  const removeFile = () => {
    if (props.mediaId) {
      removeMutation.mutate(props.mediaId);
    }
  };

  return (
    <div className="">
      <div className="flex items-center gap-4 rounded-lg border-2 border-dashed p-4 relative">
        {!props.hidePreview && (
          <div className="flex flex-col gap-2 items-center">
            <Image
              src={src}
              width={80}
              height={80}
              alt={srcTitle}
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
            disabled={removeMutation.isPending || disabled}
            size="sm"
            variant="outline"
          >
            <X className="mr-2 h-4 w-4" />
            {removeMutation.isPending
              ? "Working..."
              : strings.removeButtonCaption || "Remove"}
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
                  disabled={uploadMutation.isPending || !selectedFile}
                >
                  {uploadMutation.isPending
                    ? strings.uploading || "Uploading..."
                    : strings.uploadButtonText || "Upload"}
                </Button>
              }
            >
              <form
                id="media-upload-form"
                encType="multipart/form-data"
                className="flex flex-col gap-4"
                onSubmit={form.handleSubmit((data) => handleUploadFile(data))}
              >
                <FieldGroup>
                  <Controller
                    control={form.control}
                    name="file"
                    render={({ field: { onChange, value, ...field }, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>File</FieldLabel>
                        <Input
                          ref={fileInput}
                          type="file"
                          accept={props.mimeTypesToShow?.join(",")}
                            onChange={(e: any) => {
                            const file = e.target.files?.[0];
                            setSelectedFile(file);
                            onChange(file);
                          }}
                          disabled={uploadMutation.isPending}
                          required
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
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

                      {uploadMutation.isPending && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Uploading...</span>
                          </div>
                          <Progress className="h-2" />
                        </div>
                      )}
                      
                      {uploadMutation.isError && (
                        <div className="text-sm text-destructive">
                          {(uploadMutation.error as any)?.message || "Upload failed"}
                        </div>
                      )}
                    </div>
                  )}

                  <Controller
                    control={form.control}
                    name="caption"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>Caption</FieldLabel>
                        <Textarea
                          {...field}
                          rows={5}
                          disabled={uploadMutation.isPending}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                </FieldGroup>
              </form>
            </Dialog2>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaSelector;
