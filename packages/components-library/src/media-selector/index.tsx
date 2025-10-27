"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IAttachmentMedia } from "@workspace/common-logic/models/media.types";
import { Button } from "@workspace/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Progress } from "@workspace/ui/components/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { FileAudio, FileVideo, FileText, File as FileIcon, Upload, X } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast as sonnerToast } from "sonner";
import { z } from "zod";
import { useToast } from "../hooks/use-toast";
import { BaseDialog } from "../dialogs/base-dialog";

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
  uploadFile: (files: File[], type: string, storageProvider?: string, caption?: string) => Promise<any[]>;
  removeFile?: (mediaId: string) => Promise<void>;
}

interface MediaSelectorProps {
  title?: string;
  media?: IAttachmentMedia | null;
  onSelection?: (media: any) => void;
  onRemove?: () => void;
  functions: MediaSelectorFunctions;
  strings?: Strings;
  type: "course" | "lesson" | "page" | "user" | "domain" | "community";
  hidePreview?: boolean;
  disabled?: boolean;
  mimeTypesToShow?: string[];
}

const mediaSelectorSchema = z.object({
  file: z.any().optional(),
  caption: z.string().optional(),
  storageProvider: z.string().optional(),
});
type MediaSelectorFormData = z.infer<typeof mediaSelectorSchema>;


const defaultSrc = "/courselit_backdrop.webp";
const defaultSrcTitle = "Courselit Backdrop";

const getFileIcon = (mimeType?: string) => {
  if (!mimeType) return <FileIcon className="w-12 h-12 text-gray-400" />;
  
  if (mimeType.startsWith("video/")) {
    return <FileVideo className="w-12 h-12 text-purple-500" />;
  }
  if (mimeType.startsWith("audio/")) {
    return <FileAudio className="w-12 h-12 text-blue-500" />;
  }
  if (mimeType.startsWith("application/pdf")) {
    return <FileText className="w-12 h-12 text-red-500" />;
  }
  if (mimeType.startsWith("application/") || mimeType.startsWith("text/")) {
    return <FileText className="w-12 h-12 text-gray-500" />;
  }
  
  return <FileIcon className="w-12 h-12 text-gray-400" />;
};

const canDisplayAsImage = (mimeType?: string) => {
  return mimeType?.startsWith("image/") || false;
};

const MediaSelector = (props: MediaSelectorProps) => {
  const { t } = useTranslation(["dashboard", "common"]);
  const [dialogOpened, setDialogOpened] = useState(false);
  const fileInput = React.createRef<HTMLInputElement>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const queryClient = useQueryClient();
  const {
    strings: propStrings,
    media,
    functions,
    disabled = false,
  } = props;

  const strings = {
    buttonCaption: propStrings?.buttonCaption || t("dashboard:media.selector.button_caption"),
    dialogTitle: propStrings?.dialogTitle || t("dashboard:media.selector.dialog_title"),
    cancelCaption: propStrings?.cancelCaption || t("common:cancel"),
    uploadButtonText: propStrings?.uploadButtonText || t("common:upload"),
    uploading: propStrings?.uploading || t("dashboard:media.selector.uploading"),
    fileUploaded: propStrings?.fileUploaded || t("dashboard:media.toast.file_uploaded"),
    uploadFailed: propStrings?.uploadFailed || t("dashboard:media.toast.upload_failed"),
    mediaDeleted: propStrings?.mediaDeleted || t("dashboard:media.toast.media_deleted"),
    removeButtonCaption: propStrings?.removeButtonCaption || t("common:remove"),
    header: propStrings?.header || t("dashboard:media.selector.file_label"),
    editingArea: propStrings?.editingArea || t("dashboard:media.selector.caption_label"),
  };

  const src = media?.thumbnail;
  const srcTitle = media?.originalFileName;
  const mediaId = media?.mediaId;
  const form = useForm<MediaSelectorFormData>({
    resolver: zodResolver(mediaSelectorSchema),
    defaultValues: {
      file: undefined,
      caption: "",
      storageProvider: "local",
    },
  });

  const onSelection = (media: any) => {
    props.onSelection?.(media);
  };

  useEffect(() => {
    if (!dialogOpened) {
      setSelectedFile(null);
      form.reset();
    }
  }, [dialogOpened, form]);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, caption, storageProvider }: { file: File; caption: string; storageProvider?: string }) => {
      const results = await functions.uploadFile([file], props.type, storageProvider, caption);
      return results[0];
    },
    onSuccess: (media) => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      onSelection(media);
      sonnerToast.success(strings.fileUploaded);
      setSelectedFile(null);
      form.reset();
      setDialogOpened(false);
    },
    onError: (err: any) => {
      const errorMessage = err.message || strings.uploadFailed;
      sonnerToast.error(errorMessage);
    },
  });

  const handleUploadFile = (data: MediaSelectorFormData) => {
    const file = data.file;
    if (!file) return;

    uploadMutation.mutate({ 
      file, 
      caption: data.caption || "", 
      storageProvider: data.storageProvider 
    });
  };

  const removeMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      if (functions.removeFile) {
        return await functions.removeFile(mediaId);
      }
      throw new Error("Remove function not provided");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      if (props.onRemove) {
        props.onRemove();
      }
      sonnerToast.success(strings.mediaDeleted);
      setDialogOpened(false);
    },
    onError: (err: any) => {
      sonnerToast.error(`Media delete: ${err.message || "Delete failed"}`);
    },
  });

  const removeFile = () => {
    if (mediaId) {
      removeMutation.mutate(mediaId);
    }
  };

  return (
    <div className="">
      <div className="flex items-center gap-4 rounded-lg border-2 border-dashed p-4 relative">
        {!props.hidePreview && (
          <div className="flex flex-col gap-2 items-center">
            {canDisplayAsImage(media?.mimeType) ? (
              <Image
                src={src || defaultSrc}
                width={80}
                height={80}
                alt={srcTitle || defaultSrcTitle}
                className="rounded-md"
              />
            ) : (
              <div className="w-20 h-20 flex items-center justify-center bg-gray-50 rounded-md">
                {getFileIcon(media?.mimeType)}
              </div>
            )}
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
        {mediaId && (
          <Button
            onClick={removeFile}
            disabled={removeMutation.isPending || disabled}
            size="sm"
            variant="outline"
          >
            <X className="mr-2 h-4 w-4" />
            {removeMutation.isPending
              ? "Working..."
              : strings.removeButtonCaption}
          </Button>
        )}
        {!mediaId && (
          <div>
            <Button 
              size="sm" 
              variant="secondary" 
              disabled={disabled}
              onClick={() => setDialogOpened(true)}
            >
              {strings.buttonCaption}
            </Button>
            <BaseDialog
              title={strings.dialogTitle}
              open={dialogOpened}
              onOpenChange={setDialogOpened}
              maxWidth="2xl"
              footer={
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpened(false)}
                  >
                    {strings.cancelCaption}
                  </Button>
                  <Button
                    type="submit"
                    form="media-upload-form"
                    disabled={uploadMutation.isPending || !selectedFile}
                  >
                    {uploadMutation.isPending
                      ? strings.uploading
                      : strings.uploadButtonText}
                  </Button>
                </>
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
                    name="storageProvider"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="storage-provider-selector">
                          Storage Provider
                        </FieldLabel>
                        <Select 
                          value={field.value} 
                          onValueChange={field.onChange} 
                          disabled={uploadMutation.isPending}
                        >
                          <SelectTrigger id="storage-provider-selector">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="local">Local Storage</SelectItem>
                            <SelectItem value="cloudinary">Cloudinary</SelectItem>
                          </SelectContent>
                        </Select>
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="file"
                    render={({ field: { onChange, value, ...field }, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>{strings.header || "File"}</FieldLabel>
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
                            <span>{strings.uploading}</span>
                          </div>
                          <Progress className="h-2" />
                        </div>
                      )}
                      
                      {uploadMutation.isError && (
                        <div className="text-sm text-destructive">
                          {(uploadMutation.error as any)?.message || strings.uploadFailed}
                        </div>
                      )}
                    </div>
                  )}

                  <Controller
                    control={form.control}
                    name="caption"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>{strings.editingArea || "Caption"}</FieldLabel>
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
            </BaseDialog>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaSelector;
