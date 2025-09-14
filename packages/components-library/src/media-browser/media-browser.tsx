"use client";

import { Media } from "@workspace/common-models";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Progress } from "@workspace/ui/components/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  Upload,
  X
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import NiceModal, { NiceModalHocProps } from "../nice-modal";
import MediaComponents from "./media-components";
// Main MediaBrowser component (merged into MediaDialog)
const MediaBrowserContent: React.FC<{
  onSelect: (media: Media) => void;
  onUpload?: (media: Media) => void;
  onTotalChange?: (total: number) => void;
  type?: string;
  initialFileType?: string;
}> = ({ onSelect, onTotalChange, initialFileType }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedFileType, setSelectedFileType] = useState<string>(
    initialFileType ?? "all",
  );
  const [currentPage, setCurrentPage] = useState(0);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const PER_PAGE = 20;

  // Debounce search term to limit API requests while typing
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const mapTypeToMime = (type: string) => {
    if (type === "image") return "image/";
    if (type === "video") return "video/";
    if (type === "audio") return "audio/";
    if (type === "document") return "application/";
    if (type === "json") return "application/json";
    return "";
  };

  const loadMedia = useCallback(
    async (page: number, reset: boolean = false) => {
      try {
        setLoading(true);
        setError(null);
        const query: any = {
          q: debouncedSearchTerm || "",
          skip: (page * PER_PAGE).toString(),
          take: String(PER_PAGE),
        };
        if (selectedFileType !== "all") {
          const mapped = mapTypeToMime(selectedFileType);
          if (mapped) query.mimeType = mapped;
        }
        const url = "/api/services/media?" + new URLSearchParams(query);
        const response = await fetch(url);
        const result = await response.json();

        setMedia(result.items);
        if (reset) setCurrentPage(page);

        setTotal(result.total);
        // Support both result.hasMore and result.meta?.hasMore
        const nextHasMore = result.hasMore ?? result.meta?.hasMore ?? false;
        setHasMore(!!nextHasMore);
        onTotalChange?.(result.total);
      } catch (error) {
        console.error("Failed to fetch media:", error);
        setError("Failed to load media");
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearchTerm, selectedFileType],
  );

  // Load initial data
  useEffect(() => {
    loadMedia(0, true);
  }, [loadMedia]);

  // Reset and reload when search or filter changes
  useEffect(() => {
    setMedia([]);
    loadMedia(0, true);
  }, [debouncedSearchTerm, selectedFileType]);

  const handlePageChange = useCallback(
    (page: number) => {
      if (!loading) {
        loadMedia(page, true);
      }
    },
    [loading, loadMedia],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleMimeTypeFilterChange = useCallback((type: string) => {
    setSelectedFileType(type);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <MediaComponents.MediaFilters
        typeValue={selectedFileType}
        setTypeValue={handleMimeTypeFilterChange}
        searchTermValue={searchTerm}
        setSearchTermValue={handleSearchChange}
        viewModeValue={viewMode}
        setViewModeValue={setViewMode as any}
        showFilters
        showViewToggle
      />

      {viewMode === "grid" ? (
        <MediaComponents.MediaGrid
          items={media}
          isLoading={loading}
          isError={!!error}
          errorText={error || undefined}
          onRetry={() => loadMedia(currentPage, true)}
          onSelect={onSelect}
          compact={false}
        />
      ) : (
        <MediaComponents.MediaList
          items={media}
          onSelect={onSelect}
          compact={false}
        />
      )}

      <div className="mt-auto px-4 pb-4">
        <MediaComponents.PaginationBar
          page={currentPage}
          total={total}
          perPage={PER_PAGE}
          onChange={handlePageChange}
          disabled={loading}
        />
      </div>
    </div>
  );
};

// Enhanced File Upload Component with better design
const FileUploadTab: React.FC<{
  type?: string;
  onUpload?: (media: Media) => void;
  onComplete?: (media: Media) => void;
}> = ({ type = "page", onUpload, onComplete }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length > 0) {
        setSelectedFiles((prev) => [...prev, ...files]);
        setError(null);
      }
    },
    [],
  );

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const uploadFiles = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        if (!file) continue;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("caption", file.name);
        formData.append("access", "public");
        formData.append("type", type);

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const fileProgress = Math.round((event.loaded / event.total) * 100);
            const totalProgress = Math.round(
              ((i + fileProgress / 100) / selectedFiles.length) * 100,
            );
            setUploadProgress(totalProgress);
          }
        });

        const uploadPromise = new Promise<Media>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status === 200) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch (e) {
                reject(new Error("Invalid response format"));
              }
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error("Upload failed"));

          xhr.open("POST", `/api/services/media/upload?storageType=cloudinary`);
          xhr.send(formData);
        });

        const result = await uploadPromise;
        onUpload?.(result);

        // Complete callback for last file
        if (i === selectedFiles.length - 1) {
          onComplete?.(result);
        }
      }

      // Reset form
      setSelectedFiles([]);
      setUploadProgress(0);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [selectedFiles, onUpload, onComplete]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Upload Section */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
          <Upload className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Upload Files
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Select images, videos, audio, or PDF files
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,.pdf"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : "Choose Files"}
        </Button>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="p-4 bg-blue-50/50 rounded-lg border border-blue-100"
            >
              <h4 className="font-medium mb-2 text-blue-900">
                Selected File {selectedFiles.length > 1 ? `${index + 1}` : ""}
              </h4>
              <div className="flex items-center justify-between">
                <span className="truncate flex-1 mr-2 text-sm">
                  {file.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    variant="ghost"
                    size="sm"
                    disabled={uploading}
                    className="h-6 w-6 p-0 hover:bg-red-100"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>
              Uploading {selectedFiles.length} file
              {selectedFiles.length > 1 ? "s" : ""}...
            </span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Upload and Clear Buttons */}
      {selectedFiles.length > 0 && (
        <div className="flex gap-3">
          <Button
            onClick={uploadFiles}
            disabled={uploading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            size="lg"
          >
            {uploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {selectedFiles.length} File
                {selectedFiles.length > 1 ? "s" : ""}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setSelectedFiles([])}
            disabled={uploading}
            size="lg"
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
};

// MediaBrowserNiceDialog component
const MediaBrowserComponent = (
  props: {
    selectMode?: boolean;
    selectedMedia?: Media | null;
    initialFileType?: string;
  } & NiceModalHocProps,
) => {
  const { selectMode = false, selectedMedia } = props;
  const { visible, hide, resolve } = NiceModal.useModal();
  const [activeTab, setActiveTab] = useState("browse");
  const [internalSelectedMedia, setInternalSelectedMedia] =
    useState<Media | null>(selectedMedia || null);
  const [total, setTotal] = useState(0);

  const handleMediaSelect = (media: Media) => {
    setInternalSelectedMedia(media);
  };

  const handleClose = () => {
    resolve({ reason: "cancel", data: null });
    hide();
  };

  const handleSubmit = useCallback(
    (media: Media) => {
      resolve({ reason: "submit", data: media });
      hide();
    },
    [hide],
  );

  const handleUploadComplete = (media: Media) => {
    setActiveTab("browse");
    if (selectMode) {
      setInternalSelectedMedia(media);
    } else {
      handleSubmit(media);
    }
  };

  return (
    <Dialog
      open={visible}
      onOpenChange={(v) => {
        if (!v) {
          handleClose();
        }
      }}
    >
      <DialogContent className="!max-w-[1000px] w-[1000px] h-[90vh] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">
            Media Library
            {activeTab === "browse" && total > 0 && (
              <Badge variant="outline" className="ml-2 align-middle">
                {total} total
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full h-full flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="browse">Browse Media</TabsTrigger>
              <TabsTrigger value="upload">Upload Files</TabsTrigger>
            </TabsList>

            <TabsContent
              value="browse"
              className="flex-1 min-h-0 flex flex-col"
            >
              {selectMode && (
                <div className="flex items-center justify-between px-4 py-2 border-b">
                  <div className="text-sm text-muted-foreground">
                    {internalSelectedMedia
                      ? `Selected: ${internalSelectedMedia.originalFileName}`
                      : "Select a file from the list"}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (internalSelectedMedia) {
                        handleSubmit(internalSelectedMedia);
                      }
                    }}
                    disabled={!internalSelectedMedia}
                  >
                    Select
                  </Button>
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <MediaBrowserContent
                  onSelect={handleMediaSelect}
                  // onUpload={onUpload}
                  onTotalChange={setTotal}
                  // type={type}
                  initialFileType={(props as any).initialFileType}
                />
              </div>
            </TabsContent>

            <TabsContent value="upload" className="flex-1 min-h-0">
              <FileUploadTab
                // type={type}
                // onUpload={onUpload}
                onComplete={handleUploadComplete}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Create the modal with proper typing
export const MediaBrowserNiceDialog = NiceModal.create<
  React.ComponentProps<typeof MediaBrowserComponent> & NiceModalHocProps,
  { reason: "cancel"; data: null } | { reason: "submit"; data: Media }
>(MediaBrowserComponent);
