"use client";

import { IAttachmentMedia } from "@workspace/common-logic/models/media.types";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, X } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { BaseDialog } from "../dialogs/base-dialog";
import NiceModal, { NiceModalHocProps } from "../nice-modal";
import MediaComponents from "./media-components";

// ============================================================================
// TYPES
// ============================================================================

export interface MediaDialogConfig {
  title?: string;
  description?: string;
  allowUpload?: boolean;
  allowDelete?: boolean;
  allowSelection?: boolean;
  showFilters?: boolean;
  showPagination?: boolean;
  perPage?: number;
  initialFileType?: string;
}

export interface MediaDialogFunctions {
  fetchList: (params: {
    search: string;
    mimeType: string;
    skip: number;
    take: number;
  }) => Promise<{ items: IAttachmentMedia[]; total: number; hasMore?: boolean }>;
  deleteItem?: (id: string) => Promise<void>;
  uploadFile: (files: File[], type: string) => Promise<IAttachmentMedia[]>;
}

const getMediaQueryKey = (
  searchTerm: string,
  fileType: string,
  page: number,
  perPage: number
) => ["media-browser", searchTerm, fileType, page, perPage];

const MediaBrowserContent: React.FC<{
  onSelect: (media: IAttachmentMedia) => void;
  onTotalChange?: (total: number) => void;
  functions: MediaDialogFunctions;
  config: Required<MediaDialogConfig>;
}> = ({ onSelect, onTotalChange, functions, config }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedFileType, setSelectedFileType] = useState<string>(
    config.initialFileType,
  );
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Debounce search term to limit API requests while typing
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const mapTypeToMime = useCallback((type: string) => {
    if (type === "image") return "image/";
    if (type === "video") return "video/";
    if (type === "audio") return "audio/";
    if (type === "document") return "application/";
    if (type === "json") return "application/json";
    return "";
  }, []);

  const { data: queryResult, isLoading, isError, error, refetch } = useQuery({
    queryKey: getMediaQueryKey(
      debouncedSearchTerm,
      selectedFileType,
      currentPage,
      config.perPage
    ),
    queryFn: async () => {
      const mimeType = selectedFileType !== "all" ? mapTypeToMime(selectedFileType) : "";
      return await functions.fetchList({
        search: debouncedSearchTerm || "",
        mimeType,
        skip: currentPage * config.perPage,
        take: config.perPage,
      });
    },
    enabled: true,
  });

  const items = queryResult?.items || [];
  const total = queryResult?.total || 0;
  const errorText = error instanceof Error ? error.message : "Failed to load media";

  // Update total when data changes
  useEffect(() => {
    if (total > 0) {
      onTotalChange?.(total);
    }
  }, [total, onTotalChange]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(0);
  }, []);

  const handleMimeTypeFilterChange = useCallback((type: string) => {
    setSelectedFileType(type);
    setCurrentPage(0);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {config.showFilters && (
        <MediaComponents.MediaFilters
          typeValue={selectedFileType}
          setTypeValue={handleMimeTypeFilterChange}
          searchTermValue={searchTerm}
          setSearchTermValue={handleSearchChange}
          viewModeValue={viewMode}
          setViewModeValue={setViewMode as any}
          showFilters={config.showFilters}
          showViewToggle
        />
      )}

      {viewMode === "grid" ? (
        <MediaComponents.MediaGrid
          items={items}
          isLoading={isLoading}
          isError={isError}
          errorText={errorText}
          onRetry={() => refetch()}
          onSelect={onSelect}
          compact={false}
        />
      ) : (
        <MediaComponents.MediaList
          items={items}
          onSelect={onSelect}
          compact={false}
        />
      )}

      {config.showPagination && items.length > 0 && (
        <div className="mt-auto px-4 pb-4">
          <MediaComponents.PaginationBar
            page={currentPage}
            total={total}
            perPage={config.perPage}
            onChange={handlePageChange}
            disabled={isLoading}
          />
        </div>
      )}
    </div>
  );
};

// Enhanced File Upload Component with better design
const FileUploadTab: React.FC<{
  type: string;
  uploadFile: MediaDialogFunctions["uploadFile"];
  onComplete?: (media: IAttachmentMedia) => void;
}> = ({ type, uploadFile: uploadFileFn, onComplete }) => {
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
      const results = await uploadFileFn(selectedFiles, type);
      
      if (results.length > 0) {
        const lastResult = results[results.length - 1];
        if (lastResult) {
          onComplete?.(lastResult);
        }
        toast.success(`Successfully uploaded ${results.length} file${results.length > 1 ? 's' : ''}`);
      }

      setSelectedFiles([]);
      setUploadProgress(0);
    } catch (err) {
      console.error("Upload error:", err);
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  }, [selectedFiles, uploadFileFn, type, onComplete]);

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


const MediaBrowserComponent = (
  props: {
    config?: Partial<MediaDialogConfig>;
    functions: MediaDialogFunctions;
    type?: string;
    selectMode?: boolean;
    selectedMedia?: IAttachmentMedia | null;
  } & NiceModalHocProps,
) => {
  const { config: configProp, functions, type = "page", selectMode, selectedMedia } = props;
  
  const config: Required<MediaDialogConfig> = {
    title: "Media Library",
    description: "Browse and manage your media files",
    allowUpload: true,
    allowDelete: false,
    allowSelection: true,
    showFilters: true,
    showPagination: true,
    perPage: 20,
    initialFileType: "all",
    ...configProp,
  };

  const { visible, hide, resolve } = NiceModal.useModal();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"browse" | "upload">("browse");
  const [internalSelectedMedia, setInternalSelectedMedia] =
    useState<IAttachmentMedia | null>(selectedMedia || null);
  const [total, setTotal] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleMediaSelect = (media: IAttachmentMedia) => {
    setInternalSelectedMedia(media);
  };

  const handleClose = () => {
    resolve({ reason: "cancel", data: null });
    hide();
  };

  const handleSubmit = useCallback(
    (media: IAttachmentMedia) => {
      resolve({ reason: "submit", data: media });
      hide();
    },
    [hide],
  );

  const handleUploadComplete = useCallback(
    (media: IAttachmentMedia) => {
      queryClient.invalidateQueries({ queryKey: ["media-browser"] });
      setActiveTab("browse");
      if (selectMode) {
        setInternalSelectedMedia(media);
      } else {
        handleSubmit(media);
      }
    },
    [queryClient, selectMode, handleSubmit]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!functions.deleteItem) return;
      
      const confirmed = window.confirm("Are you sure you want to delete this media file?");
      if (!confirmed) return;
      
      setIsDeleting(true);
      try {
        await functions.deleteItem(id);
        queryClient.invalidateQueries({ queryKey: ["media-browser"] });
        toast.success("Media deleted successfully");
      } catch (error) {
        toast.error(`Failed to delete media: ${error instanceof Error ? error.message : "Unknown error"}`);
      } finally {
        setIsDeleting(false);
      }
    },
    [functions, queryClient]
  );

  const emptyAction = useMemo(() => {
    if (!config.allowUpload) return null;
    return (
      <button
        onClick={() => setActiveTab("upload")}
        className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <Upload className="h-4 w-4 mr-2" />
        Upload Media
      </button>
    );
  }, [config.allowUpload]);

  return (
    <BaseDialog
      open={visible}
      onOpenChange={(v) => {
        if (!v) {
          handleClose();
        }
      }}
      title={config.title}
      description={config.description}
      maxWidth="7xl"
      maxHeight="h-[90vh] max-h-[90vh]"
    >
      <div className="overflow-hidden flex flex-col min-h-0">
        {activeTab === "browse" && total > 0 && (
          <div className="px-4 pb-2">
            <Badge variant="outline">
              {total} total items
            </Badge>
          </div>
        )}
        <div className="flex-1 flex flex-col min-h-0">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "browse" | "upload")}
            className="w-full h-full flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="browse">Browse Media</TabsTrigger>
              {config.allowUpload && (
                <TabsTrigger value="upload">Upload Files</TabsTrigger>
              )}
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
                  onSelect={config.allowSelection ? handleMediaSelect : () => {}}
                  onTotalChange={setTotal}
                  functions={functions}
                  config={config}
                />
              </div>
            </TabsContent>

            {config.allowUpload && (
              <TabsContent value="upload" className="flex-1 min-h-0">
                <FileUploadTab
                  type={type}
                  uploadFile={functions.uploadFile}
                  onComplete={handleUploadComplete}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </BaseDialog>
  );
};

// Create the modal with proper typing
export const MediaBrowserNiceDialog = NiceModal.create<
  React.ComponentProps<typeof MediaBrowserComponent> & NiceModalHocProps,
  { reason: "cancel"; data: null } | { reason: "submit"; data: IAttachmentMedia }
>(MediaBrowserComponent);
