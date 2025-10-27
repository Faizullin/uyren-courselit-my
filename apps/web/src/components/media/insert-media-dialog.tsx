"use client";

import { listLessonMedia } from "@/server/actions/lms/lesson-media";
import { IAttachmentMedia } from "@workspace/common-logic/models/media.types";
import { BaseDialog, MediaComponents, NiceModal, NiceModalHocProps, useToast } from "@workspace/components-library";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { useCallback, useEffect, useState } from "react";

type FilterType  = "document" | "image" | "video" | "audio" | "json" | "all";


function InsertMediaDialog(props: {
    args: {
      selectMode?: boolean;
      selectedMedia?: IAttachmentMedia | null;
      initialFileType?: FilterType;
      courseId: string;
      lessonId?: string;
    }
  } & NiceModalHocProps) {
    const { visible, hide, resolve } = NiceModal.useModal();
    const { toast } = useToast();
    
    const [activeTab, setActiveTab] = useState<"browse" | "upload">("browse");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [type, setType] = useState<FilterType>(props.args.initialFileType ?? "all");
    const [search, setSearch] = useState<string>("");
    const [page, setPage] = useState(0);
    const take = 20;

    const [items, setItems] = useState<IAttachmentMedia[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadMedia = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await listLessonMedia({
                filter: {
                    courseId: props.args.courseId,
                    lessonId: props.args.lessonId,
                    mimeType: type !== "all" ? mapTypeToMime(type) : undefined,
                },
                search: search ? { q: search } : undefined,
                pagination: { skip: page * take, take, includePaginationCount: true },
                orderBy: { field: "createdAt", direction: "desc" },
            });

            if (result.success && result.items) {
                setItems(result.items as any);
                setTotal(result.total || 0);
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to load media",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Failed to load media:", error);
            toast({
                title: "Error",
                description: "Failed to load media",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }, [props.args.courseId, props.args.lessonId, type, search, page, take, toast]);

    useEffect(() => {
        if (visible) {
            loadMedia();
        }
    }, [visible, loadMedia]);

    const handleDelete = useCallback(async (item: IAttachmentMedia) => {
        if (!item.mediaId) {
            toast({
                title: "Error",
                description: "Invalid media item",
                variant: "destructive",
            });
            return;
        }

        setIsDeleting(true);
        try {
            const response = await fetch("/api/lms/course/lesson/remove", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mediaId: item.mediaId }),
            });

            const result = await response.json();

            if (result.success) {
                toast({
                    title: "Success",
                    description: "Media deleted successfully",
                });
                loadMedia();
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to delete media",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Failed to delete media:", error);
            toast({
                title: "Error",
                description: "Failed to delete media",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    }, [loadMedia, toast]);

    const handleRetry = useCallback(() => {
        loadMedia();
    }, [loadMedia]);

    const handleChoose = useCallback((item: IAttachmentMedia) => {
        resolve({ reason: "submit", data: item });
        hide();
    }, [resolve, hide]);

    const handleCancel = useCallback(() => {
        resolve({ reason: "cancel", data: null });
        hide();
    }, [resolve, hide]);

    const handleUploaded = useCallback(async (attachment: IAttachmentMedia) => {
        loadMedia();
        setActiveTab("browse");
    }, [loadMedia]);

  const config = {
    title: "Media Library",
    allowUpload: !!props.args.lessonId,
    allowDelete: !!props.args.lessonId,
    allowSelection: true,
    showFilters: true,
    showPagination: true,
  };

  return (
    <BaseDialog
      open={visible}
      onOpenChange={(open: boolean) => {
        if (!open) {
          handleCancel();
        }
      }}
      title="Insert Media"
      maxWidth="6xl"
    >
      <div className="flex flex-col h-[80vh]">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="w-full h-full flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            {config.allowUpload && (
              <TabsTrigger value="upload">Upload</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="browse" className="flex-1 min-h-0 flex flex-col mt-4">
            <MediaComponents.MediaFilters
              typeValue={type}
              setTypeValue={setType} 
              searchTermValue={search}
              setSearchTermValue={setSearch}
              viewModeValue={viewMode}
              setViewModeValue={setViewMode as any}
              showFilters
              showViewToggle
            />

            {viewMode === "grid" ? (
              <MediaComponents.MediaGrid
                items={items}
                isLoading={isLoading}
                isError={false}
                onRetry={handleRetry}
                onSelect={props.args.selectMode ? handleChoose : undefined}
                onDelete={config.allowDelete ? handleDelete : undefined}
                deleting={isDeleting}
              />
            ) : (
              <MediaComponents.MediaList
                items={items}
                onSelect={props.args.selectMode ? handleChoose : undefined}
              />
            )}

            <div className="mt-auto px-4 pb-4">
              <MediaComponents.PaginationBar
                page={page}
                total={total}
                perPage={take}
                onChange={setPage}
                disabled={isLoading}
              />
            </div>
          </TabsContent>

          {config.allowUpload && props.args.lessonId && (
            <TabsContent value="upload" className="flex-1 overflow-auto mt-4">
              <MediaComponents.UploadArea
                onUploaded={handleUploaded}
                uploadFile={async (file: File, _storageProvider?: string) => {
                  if (!file) {
                    throw new Error("File is required");
                  }

                  const formData = new FormData();
                  formData.append("file", file);
                  formData.append("lessonId", props.args.lessonId!);

                  const response = await fetch("/api/lms/course/lesson/upload", {
                    method: "POST",
                    body: formData,
                  });

                  const result = await response.json();
                  
                  if (!result.success || !result.media) {
                    throw new Error(result.error || "Upload failed");
                  }

                  toast({
                    title: "Success",
                    description: "Media uploaded successfully",
                  });

                  return result.media;
                }}
                className="p-6"
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </BaseDialog>
  );
}

function mapTypeToMime(type: string | undefined) {
  if (!type) return undefined;
  if (type === "image") return "image/";
  if (type === "video") return "video/";
  if (type === "audio") return "audio/";
  if (type === "document") return "application/";
  if (type === "json") return "application/json";
  return undefined;
}

// Create the modal with proper typing
export const InsertMediaNiceDialog = NiceModal.create<
  React.ComponentProps<typeof InsertMediaDialog> & NiceModalHocProps,
  { reason: "cancel"; data: null } | { reason: "submit"; data: IAttachmentMedia }
>(InsertMediaDialog);
