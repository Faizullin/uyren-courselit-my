import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { FileText, UploadIcon, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useDialogControl } from "../hooks/use-dialog-control";
import { BaseDialog } from "./base-dialog";

interface AttachmentUploadDialogProps {
  control: ReturnType<typeof useDialogControl<{
    uploadFn: (files: File[]) => Promise<{ success: boolean; files: File[]; error?: string }>;
    title?: string;
    description?: string;
    maxFiles?: number;
    acceptedFileTypes?: Record<string, string[]>;
    maxFileSize?: number;
  }>>;
}

export function AttachmentUploadDialog({
  control,
}: AttachmentUploadDialogProps) {
  const {
    uploadFn,
    title = "Upload Attachments",
    description = "Upload files to attach to this resume",
    maxFiles = 5,
    acceptedFileTypes = {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    maxFileSize = 10 * 1024 * 1024, // 10MB
  } = control.data || {};

  const { isVisible, hide } = control;
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: acceptedFileTypes,
    maxFiles,
    maxSize: maxFileSize,
    onDrop: useCallback((acceptedFiles: File[]) => {
      setFiles(prev => {
        const newFiles = [...prev, ...acceptedFiles];
        return newFiles.slice(0, maxFiles);
      });
    }, [maxFiles]),
    onError: useCallback((error: Error) => {
      console.error("Dropzone error:", error);
    }, []),
  });

  const handleRemoveFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = useCallback(async () => {
    if (files.length === 0 || !uploadFn) return;

    setIsUploading(true);
    try {
      const result = await uploadFn(files);

      if (result.success) {
        setFiles([]);
        hide();
      }
      // If upload failed, keep dialog open and let user try again
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  }, [files, uploadFn, hide]);

  const handleCancel = useCallback(() => {
    setFiles([]);
    hide();
  }, [hide]);

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
      return <FileText className="h-4 w-4 text-blue-500" />;
    }
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  return (
    <BaseDialog
      open={isVisible}
      onOpenChange={(open) => {
        if (!open) {
          hide();
        }
      }}
      title={title}
      description={description}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Upload Area */}
        <div className="space-y-4">
          <Button
            className={cn(
              'relative h-auto w-full flex-col overflow-hidden p-8',
              isDragActive && 'outline-none ring-1 ring-ring',
            )}
            disabled={isUploading}
            type="button"
            variant="outline"
            {...getRootProps()}
          >
            <input {...getInputProps()} disabled={isUploading} />
            <div className="flex flex-col items-center justify-center">
              <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <UploadIcon size={16} />
              </div>
              {files.length > 0 ? (
                <>
                  <p className="my-2 w-full truncate font-medium text-sm">
                    {files.length > 3
                      ? `${files.slice(0, 3).map(f => f.name).join(', ')} and ${files.length - 3} more`
                      : files.map(f => f.name).join(', ')}
                  </p>
                  <p className="w-full text-wrap text-muted-foreground text-xs">
                    Drag and drop or click to replace
                  </p>
                </>
              ) : (
                <>
                  <p className="my-2 w-full truncate text-wrap font-medium text-sm">
                    Upload {maxFiles === 1 ? 'a file' : 'files'}
                  </p>
                  <p className="w-full truncate text-wrap text-muted-foreground text-xs">
                    Drag and drop or click to upload
                  </p>
                  <p className="text-wrap text-muted-foreground text-xs">
                    Accepted formats: PDF, DOC, DOCX, TXT, JPG, PNG
                  </p>
                </>
              )}
            </div>
          </Button>

          <div className="text-xs text-muted-foreground">
            <p>Maximum file size: {formatFileSize(maxFileSize)}</p>
            <p>Maximum files: {maxFiles}</p>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Selected Files ({files.length}/{maxFiles})</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(file)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(index)}
                    disabled={isUploading}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
            className="gap-2"
          >
            {isUploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Uploading...
              </>
            ) : (
              <>
                Upload {files.length > 0 && `(${files.length})`}
              </>
            )}
          </Button>
        </div>
      </div>
    </BaseDialog>
  );
}
