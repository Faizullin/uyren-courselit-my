"use client";

import { IAttachmentMedia } from "@workspace/common-logic/models/media.types";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Progress } from "@workspace/ui/components/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, X } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BaseDialog } from "../dialogs/base-dialog";
import NiceModal, { NiceModalHocProps } from "../nice-modal";
import MediaComponents, { FileTypeFilter } from "./media-components";

// ============================================================================
// TYPES
// ============================================================================

export interface MediaDialogStrings {
  title?: string;
  description?: string;
  browse_tab?: string;
  upload_tab?: string;
  total_items?: string;
  selected?: string;
  select_file_prompt?: string;
  select_button?: string;
  delete_confirm?: string;
  upload_title?: string;
  upload_description?: string;
  choose_files?: string;
  selected_file?: string;
  selected_file_number?: string;
  clear?: string;
  upload_count?: string;
  upload_count_plural?: string;
  upload_media?: string;
  uploading_count?: string;
  uploading_count_plural?: string;
  upload_success?: string;
  upload_success_plural?: string;
  uploading?: string;
  upload_failed?: string;
  media_deleted?: string;
  delete_failed?: string;
  delete_error?: string;
  storage_provider?: string;
  local_storage?: string;
  cloudinary_storage?: string;
}

export interface MediaDialogConfig {
  title?: string;
  description?: string;
  allowUpload?: boolean;
  allowDelete?: boolean;
  allowSelection?: boolean;
  showFilters?: boolean;
  showPagination?: boolean;
  perPage?: number;
  initialFileType?: FileTypeFilter;
}

export interface MediaDialogFunctions {
  fetchList: (params: {
    search: string;
    mimeType: string;
    skip: number;
    take: number;
  }) => Promise<{ items: IAttachmentMedia[]; total: number; hasMore?: boolean }>;
  deleteItem?: (id: string) => Promise<void>;
  uploadFile: (files: File[], type: string, storageProvider?: string) => Promise<IAttachmentMedia[]>;
}

const getMediaQueryKey = (
  searchTerm: string,
  fileType: string,
  page: number,
  perPage: number
) => ["media-browser", searchTerm, fileType, page, perPage];

const getPreferredStorageProvider = (files: File[]): string => {
  if (files.length === 0) return "local";
  
  const firstFile = files[0];
  if (!firstFile) return "local";
  
  const isImage = firstFile.type.startsWith("image/");
  const isSmallVideo = firstFile.type.startsWith("video/") && firstFile.size < 50 * 1024 * 1024;
  
  return isImage || isSmallVideo ? "cloudinary" : "local";
};

const MediaBrowserContent: React.FC<{
  onSelect: (media: IAttachmentMedia) => void;
  onTotalChange?: (total: number) => void;
  functions: MediaDialogFunctions;
  config: Required<MediaDialogConfig>;
}> = ({ onSelect, onTotalChange, functions, config }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedFileType, setSelectedFileType] = useState<FileTypeFilter>(
    (config.initialFileType as FileTypeFilter) || "all"
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

  const handleMimeTypeFilterChange = useCallback((type: "document" | "image" | "video" | "audio" | "json" | "all") => {
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
  strings: MediaDialogStrings;
}> = ({ type, uploadFile: uploadFileFn, onComplete, strings }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [storageProvider, setStorageProvider] = useState<string>("local");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length > 0) {
        setSelectedFiles((prev) => [...prev, ...files]);
        setError(null);
        
        const preferredProvider = getPreferredStorageProvider(files);
        setStorageProvider(preferredProvider);
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
      const results = await uploadFileFn(selectedFiles, type, storageProvider);
      
      if (results.length > 0) {
        const lastResult = results[results.length - 1];
        if (lastResult) {
          onComplete?.(lastResult);
        }
        const successMsg = results.length > 1 
          ? strings.upload_success_plural!.replace("{{count}}", results.length.toString())
          : strings.upload_success!.replace("{{count}}", results.length.toString());
        toast.success(successMsg);
      }

      setSelectedFiles([]);
      setUploadProgress(0);
    } catch (err) {
      console.error("Upload error:", err);
      const errorMessage = err instanceof Error ? err.message : strings.upload_failed!;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  }, [selectedFiles, uploadFileFn, type, storageProvider, onComplete, strings]);

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
            {strings.upload_title}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {strings.upload_description}
          </p>
        </div>

        {/* Storage Provider Selection */}
        <div className="max-w-xs mx-auto mb-4">
          <Label htmlFor="storage-provider" className="text-sm font-medium mb-2 block text-left">
            {strings.storage_provider}
          </Label>
          <Select value={storageProvider} onValueChange={setStorageProvider} disabled={uploading}>
            <SelectTrigger id="storage-provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local">{strings.local_storage}</SelectItem>
              <SelectItem value="cloudinary">{strings.cloudinary_storage}</SelectItem>
            </SelectContent>
          </Select>
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
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? strings.uploading : strings.choose_files}
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
                {selectedFiles.length > 1 
                  ? strings.selected_file_number!.replace("{{number}}", (index + 1).toString())
                  : strings.selected_file}
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
                    type="button"
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
              {selectedFiles.length > 1
                ? strings.uploading_count_plural!.replace("{{count}}", selectedFiles.length.toString())
                : strings.uploading_count!.replace("{{count}}", selectedFiles.length.toString())}...
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
            type="button"
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
                {selectedFiles.length > 1
                  ? strings.upload_count_plural!.replace("{{count}}", selectedFiles.length.toString())
                  : strings.upload_count!.replace("{{count}}", selectedFiles.length.toString())}
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSelectedFiles([])}
            disabled={uploading}
            size="lg"
          >
            {strings.clear}
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
    strings?: Partial<MediaDialogStrings>;
    type?: string;
    selectMode?: boolean;
    selectedMedia?: IAttachmentMedia | null;
  } & NiceModalHocProps,
) => {
  const { config: configProp, functions, strings: stringsProp, type = "page", selectMode, selectedMedia } = props;
  const { t } = useTranslation(["dashboard", "common"]);
  
  const strings: MediaDialogStrings = {
    title: stringsProp?.title || t("dashboard:media.browser.title"),
    description: stringsProp?.description || t("dashboard:media.browser.description"),
    browse_tab: stringsProp?.browse_tab || t("dashboard:media.browser.browse_tab"),
    upload_tab: stringsProp?.upload_tab || t("dashboard:media.browser.upload_tab"),
    total_items: stringsProp?.total_items || t("dashboard:media.browser.total_items"),
    selected: stringsProp?.selected || t("dashboard:media.browser.selected"),
    select_file_prompt: stringsProp?.select_file_prompt || t("dashboard:media.browser.select_file_prompt"),
    select_button: stringsProp?.select_button || t("common:select"),
    delete_confirm: stringsProp?.delete_confirm || t("dashboard:media.browser.delete_confirm"),
    upload_title: stringsProp?.upload_title || t("dashboard:media.browser.upload_title"),
    upload_description: stringsProp?.upload_description || t("dashboard:media.browser.upload_description"),
    choose_files: stringsProp?.choose_files || t("dashboard:media.browser.choose_files"),
    selected_file: stringsProp?.selected_file || t("dashboard:media.browser.selected_file"),
    selected_file_number: stringsProp?.selected_file_number || t("dashboard:media.browser.selected_file_number"),
    clear: stringsProp?.clear || t("common:clear"),
    upload_count: stringsProp?.upload_count || t("dashboard:media.browser.upload_count"),
    upload_count_plural: stringsProp?.upload_count_plural || t("dashboard:media.browser.upload_count_plural"),
    upload_media: stringsProp?.upload_media || t("dashboard:media.browser.upload_media"),
    uploading_count: stringsProp?.uploading_count || t("dashboard:media.browser.uploading_count"),
    uploading_count_plural: stringsProp?.uploading_count_plural || t("dashboard:media.browser.uploading_count_plural"),
    upload_success: stringsProp?.upload_success || t("dashboard:media.browser.upload_success"),
    upload_success_plural: stringsProp?.upload_success_plural || t("dashboard:media.browser.upload_success_plural"),
    uploading: stringsProp?.uploading || t("dashboard:media.selector.uploading"),
    upload_failed: stringsProp?.upload_failed || t("dashboard:media.toast.upload_failed"),
    media_deleted: stringsProp?.media_deleted || t("dashboard:media.toast.media_deleted"),
    delete_failed: stringsProp?.delete_failed || t("dashboard:media.toast.delete_failed"),
    delete_error: stringsProp?.delete_error || t("dashboard:media.toast.delete_error"),
    storage_provider: stringsProp?.storage_provider || t("dashboard:media.browser.storage_provider"),
    local_storage: stringsProp?.local_storage || t("dashboard:media.browser.local_storage"),
    cloudinary_storage: stringsProp?.cloudinary_storage || t("dashboard:media.browser.cloudinary_storage"),
  };
  
  const config: Required<MediaDialogConfig> = {
    title: strings.title!,
    description: strings.description!,
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
      
      const confirmed = window.confirm(strings.delete_confirm);
      if (!confirmed) return;
      
      setIsDeleting(true);
      try {
        await functions.deleteItem(id);
        queryClient.invalidateQueries({ queryKey: ["media-browser"] });
        toast.success(strings.media_deleted);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        toast.error(strings.delete_error!.replace("{{error}}", errorMsg));
      } finally {
        setIsDeleting(false);
      }
    },
    [functions, queryClient, strings]
  );

  const emptyAction = useMemo(() => {
    if (!config.allowUpload) return null;
    return (
      <button
        onClick={() => setActiveTab("upload")}
        className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <Upload className="h-4 w-4 mr-2" />
        {strings.upload_media}
      </button>
    );
  }, [config.allowUpload, strings]);

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
              {strings.total_items!.replace("{{count}}", total.toString())}
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
              <TabsTrigger value="browse">{strings.browse_tab}</TabsTrigger>
              {config.allowUpload && (
                <TabsTrigger value="upload">{strings.upload_tab}</TabsTrigger>
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
                      ? strings.selected!.replace("{{filename}}", internalSelectedMedia.originalFileName)
                      : strings.select_file_prompt}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (internalSelectedMedia) {
                        handleSubmit(internalSelectedMedia);
                      }
                    }}
                    disabled={!internalSelectedMedia}
                  >
                    {strings.select_button}
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
                  strings={strings}
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
