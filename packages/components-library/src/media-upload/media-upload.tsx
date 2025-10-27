"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { CheckCircle2, Upload, X, Paperclip } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface IAttachmentMedia {
  url: string;
  originalFileName: string;
  size: number;
}

interface MediaUploadProps {
  onUpload: (file: File) => Promise<{ success: boolean; url?: string }>;
  onRemove?: (index: number) => void;
  attachments?: IAttachmentMedia[];
  maxFiles?: number;
  maxFileSize?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
  className?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export function MediaUpload({
  onUpload,
  onRemove,
  attachments = [],
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024,
  acceptedTypes = ["image/*", "video/*", "audio/*", "application/pdf", "application/zip", "text/*"],
  disabled = false,
  className,
}: MediaUploadProps) {
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        if (attachments.length + Object.keys(uploading).length >= maxFiles) break;
        
        setUploading(prev => ({ ...prev, [file.name]: true }));
        
        try {
          await onUpload(file);
        } catch (error) {
          console.error("Upload error:", error);
        } finally {
          setUploading(prev => {
            const newState = { ...prev };
            delete newState[file.name];
            return newState;
          });
        }
      }
    },
    [attachments.length, uploading, maxFiles, onUpload]
  );

  const handleRemoveFile = useCallback(
    (index: number) => {
      onRemove?.(index);
    },
    [onRemove]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: maxFileSize,
    maxFiles,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    disabled: disabled || attachments.length >= maxFiles,
  });

  return (
    <div className={cn("space-y-3", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          isDragActive && "border-primary bg-primary/5",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "hover:border-primary"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm">
          {isDragActive ? "Drop files here" : "Click or drag files to upload"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Max {formatFileSize(maxFileSize)} per file
        </p>
      </div>

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment, idx) => {
            const isUploading = uploading[attachment.originalFileName];
            
            return (
              <div
                key={`attachment-${idx}`}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate text-sm" title={attachment.originalFileName}>
                    {attachment.originalFileName}
                  </span>
                  <span className="text-muted-foreground text-xs flex-shrink-0">
                    {formatFileSize(attachment.size)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isUploading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  )}
                  {onRemove && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(idx)}
                      disabled={disabled || isUploading}
                      className="h-8 w-8 p-0 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
