"use client";

import { IAttachmentMedia } from "@workspace/common-logic/models/media.types";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import {
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    FileAudio,
    File as FileIcon,
    FileImage,
    FileVideo,
    Filter,
    Grid3X3,
    List as ListIcon,
    MoreVertical,
    Search,
    Trash2,
    Upload,
} from "lucide-react";
import Image from "next/image";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// ============================================================================
// TYPES & UTILS
// ============================================================================

type FileKind = "image" | "video" | "audio" | "document" | "json";
type ViewMode = "grid" | "list";

const getFileType = (mimeType: string | null | undefined): FileKind => {
    if (!mimeType || typeof mimeType !== 'string') return "document";
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType === "application/json") return "json";
    return "document";
};

const formatSize = (bytes?: number): string => {
    if (!bytes || bytes <= 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getFileIcon = (kind: FileKind) => {
    const iconClass = "w-4 h-4";
    switch (kind) {
        case "image": return <FileImage className={iconClass} />;
        case "video": return <FileVideo className={iconClass} />;
        case "audio": return <FileAudio className={iconClass} />;
        default: return <FileIcon className={iconClass} />;
    }
};

const ACCEPTED_EXT = "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar,.7z,.json";

// ============================================================================
// MEDIA CARD
// ============================================================================

interface MediaCardProps {
    media: IAttachmentMedia;
    onSelect?: (media: IAttachmentMedia) => void;
    onView?: (media: IAttachmentMedia) => void;
    onDownload?: (media: IAttachmentMedia) => void;
    onDelete?: (media: IAttachmentMedia) => void | Promise<void>;
    deleting?: boolean;
    compact?: boolean;
}

const MediaCard = memo(function MediaCard({
    media,
    onSelect,
    onView,
    onDownload,
    onDelete,
    deleting,
    compact = false,
}: MediaCardProps) {
    const fileType = getFileType(media.mimeType);
    const [imgError, setImgError] = useState(false);

    const handleDelete = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete) await onDelete(media);
    }, [media, onDelete]);

    const handleView = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (onView) onView(media);
    }, [media, onView]);

    const handleDownload = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDownload) onDownload(media);
    }, [media, onDownload]);

    const handleSelect = useCallback(() => {
        if (onSelect) onSelect(media);
    }, [media, onSelect]);

    const aspectRatio = compact ? "aspect-[4/3]" : "aspect-square";

    return (
        <Card className="cursor-pointer transition-all hover:shadow-md p-0" onClick={handleSelect}>
            <CardContent className={compact ? "p-1" : "p-2"}>
                <div className={`${aspectRatio} bg-gray-100 rounded-md mb-2 relative overflow-hidden`}>
                    {fileType === "image" && media.url && !imgError ? (
                        <Image
                            src={media.url}
                            alt={media.originalFileName || "Media file"}
                            width={compact ? 120 : 200}
                            height={compact ? 90 : 200}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center w-full h-full text-gray-400">
                            {getFileIcon(fileType)}
                        </div>
                    )}

                    <div className="absolute top-2 right-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 bg-white/80">
                                    <MoreVertical className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {onView && (
                                    <DropdownMenuItem onClick={handleView}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        Preview
                                    </DropdownMenuItem>
                                )}
                                {onDownload && (
                                    <DropdownMenuItem onClick={handleDownload}>
                                        <Download className="h-4 w-4 mr-2" />
                                        Download
                                    </DropdownMenuItem>
                                )}
                                {onDelete && (
                                    <DropdownMenuItem className="text-red-600" onClick={handleDelete} disabled={!!deleting}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="absolute bottom-2 left-2">
                        <Badge variant="secondary" className="text-xs">
                            {getFileIcon(fileType)}
                        </Badge>
                    </div>
                </div>

                <div className="space-y-1">
                    <p className={`font-medium truncate ${compact ? "text-xs" : "text-sm"}`} title={media.file}>
                        {media.originalFileName}
                    </p>
                    <p className={`text-gray-500 ${compact ? "text-[10px]" : "text-xs"}`}>
                        {formatSize(media.size)}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
});

// ============================================================================
// MEDIA GRID
// ============================================================================

interface MediaGridProps {
    items: IAttachmentMedia[];
    isLoading: boolean;
    isError: boolean;
    errorText?: string;
    onRetry?: () => void;
    onSelect?: (media: IAttachmentMedia) => void;
    onView?: (media: IAttachmentMedia) => void;
    onDownload?: (media: IAttachmentMedia) => void;
    onDelete?: (media: IAttachmentMedia) => void | Promise<void>;
    deleting?: boolean;
    emptyAction?: React.ReactNode;
    compact?: boolean;
}

function MediaGrid({
    items,
    isLoading,
    isError,
    errorText,
    onRetry,
    onSelect,
    onView,
    onDownload,
    onDelete,
    deleting,
    emptyAction,
    compact = false,
}: MediaGridProps) {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-48 space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <div className="text-sm text-muted-foreground">Loading media...</div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center h-48 space-y-4">
                <div className="text-red-500">
                    <FileIcon className="h-12 w-12 mx-auto mb-2" />
                </div>
                <div className="text-sm text-center">
                    <div className="font-medium text-red-600 mb-2">Failed to load media</div>
                    <div className="text-muted-foreground">{errorText || "Something went wrong"}</div>
                </div>
                {onRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry}>
                        Try Again
                    </Button>
                )}
            </div>
        );
    }

    if (!items?.length) {
        return (
            <div className="text-center py-12">
                <FileIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No media found</p>
                {emptyAction}
            </div>
        );
    }

    const gridCols = compact
        ? "grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

    return (
        <div className={`grid ${gridCols} gap-4 p-4`}>
            {items.map((media, index) => (
                <MediaCard
                    key={index}
                    media={media}
                    onSelect={onSelect}
                    onView={onView}
                    onDownload={onDownload}
                    onDelete={onDelete}
                    deleting={deleting}
                    compact={compact}
                />
            ))}
        </div>
    );
}

// ============================================================================
// MEDIA LIST
// ============================================================================

interface MediaListProps {
    items: IAttachmentMedia[];
    onSelect?: (media: IAttachmentMedia) => void;
    onView?: (media: IAttachmentMedia) => void;
    onDownload?: (media: IAttachmentMedia) => void;
    onDelete?: (media: IAttachmentMedia) => void | Promise<void>;
    deleting?: boolean;
    compact?: boolean;
}

function MediaList({
    items,
    onSelect,
    onView,
    onDownload,
    onDelete,
    deleting,
    compact = false,
}: MediaListProps) {
    const handleSelect = useCallback((media: IAttachmentMedia) => {
        if (onSelect) onSelect(media);
    }, [onSelect]);

    const handleView = useCallback((media: IAttachmentMedia) => {
        if (onView) onView(media);
    }, [onView]);

    const handleDownload = useCallback((media: IAttachmentMedia) => {
        if (onDownload) onDownload(media);
    }, [onDownload]);

    const handleDelete = useCallback(async (media: IAttachmentMedia) => {
        if (onDelete) await onDelete(media);
    }, [onDelete]);

    return (
        <div className="space-y-2 p-4">
            {items.map((media, index) => {
                const fileType = getFileType(media.mimeType);
                const thumbnailSize = compact ? 48 : 64;

                return (
                    <Card
                        key={index}
                        className={`cursor-pointer transition-all hover:shadow-sm p-0 ${compact ? "hover:shadow-none" : ""}`}
                        onClick={() => handleSelect(media)}
                    >
                        <CardContent className={compact ? "p-3" : "p-4"}>
                            <div className="flex items-center gap-4">
                                <div className={`bg-gray-100 rounded-md overflow-hidden flex-shrink-0 ${compact ? "w-12 h-12" : "w-16 h-16"}`}>
                                    {fileType === "image" && media.url ? (
                                        <Image
                                            src={media.url}
                                            alt={media.originalFileName || media.file || "Media file"}
                                            width={thumbnailSize}
                                            height={thumbnailSize}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-full text-gray-500">
                                            {getFileIcon(fileType)}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className={`flex items-center gap-2 mb-1 ${compact ? "mb-0" : ""}`}>
                                        {getFileIcon(fileType)}
                                        <h3 className={`font-medium truncate ${compact ? "text-sm" : ""}`}>
                                            {media.file}
                                        </h3>
                                    </div>

                                    {/* {!compact && (
                                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                                            <span>{formatSize(media.size)}</span>
                                            <span>{media.createdAt?.toLocaleDateString()}</span>
                                        </div>
                                    )} */}

                                    {/* {compact && (
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>{formatSize(media.size)}</span>
                                            <span>•</span>
                                            <span>{media.createdAt.toLocaleDateString()}</span>
                                        </div>
                                    )} */}
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="sm">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        {onView && (
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleView(media);
                                                }}
                                                disabled={!media.url}
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                Preview
                                            </DropdownMenuItem>
                                        )}
                                        {onDownload && (
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownload(media);
                                                }}
                                                disabled={!media.url}
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                Download
                                            </DropdownMenuItem>
                                        )}
                                        {onDelete && (
                                            <DropdownMenuItem
                                                className="text-red-600"
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    await handleDelete(media);
                                                }}
                                                disabled={!!deleting}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

// ============================================================================
// MEDIA FILTERS
// ============================================================================

interface MediaFiltersProps {
    typeValue: string;
    setTypeValue: (value: string) => void;
    searchTermValue: string;
    setSearchTermValue: (value: string) => void;
    viewModeValue: ViewMode;
    setViewModeValue: (mode: ViewMode) => void;
    showFilters?: boolean;
    showViewToggle?: boolean;
}

function MediaFilters({
    typeValue,
    setTypeValue,
    searchTermValue,
    setSearchTermValue,
    viewModeValue,
    setViewModeValue,
    showFilters = true,
    showViewToggle = true,
}: MediaFiltersProps) {
    if (!showFilters) return null;

    const fileTypeFilters = useMemo(() => [
        { label: "All", value: "all" },
        { label: "Images", value: "image" },
        { label: "Videos", value: "video" },
        { label: "Audio", value: "audio" },
        { label: "Documents", value: "document" },
        { label: "JSON", value: "json" },
    ], []);

    return (
        <div className="flex-shrink-0 border-b bg-white">
            <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50">
                <div className="flex-1 min-w-[220px]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search files..."
                            value={searchTermValue}
                            onChange={(e) => setSearchTermValue(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                <Select value={typeValue} onValueChange={setTypeValue}>
                    <SelectTrigger className="w-[160px]">
                        {typeValue ? (
                            <>
                                {typeValue === "image" && <FileImage className="h-4 w-4" />}
                                {typeValue === "audio" && <FileAudio className="h-4 w-4" />}
                                {typeValue === "video" && <FileVideo className="h-4 w-4" />}
                                {typeValue === "all" && <Filter className="h-4 w-4" />}
                            </>
                        ) : (
                            <Filter className="h-4 w-4" />
                        )}
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {fileTypeFilters.map((filter) => (
                            <SelectItem key={filter.value} value={filter.value}>
                                <span>{filter.label}</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {showViewToggle && (
                    <div className="flex gap-1">
                        <Button
                            variant={viewModeValue === "grid" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setViewModeValue("grid")}
                            title="Grid view"
                        >
                            <Grid3X3 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewModeValue === "list" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setViewModeValue("list")}
                            title="List view"
                        >
                            <ListIcon className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// PAGINATION BAR
// ============================================================================

interface PaginationBarProps {
    page: number;
    total: number;
    perPage: number;
    onChange: (page: number) => void;
    disabled?: boolean;
}

function PaginationBar({
    page,
    total,
    perPage,
    onChange,
    disabled,
}: PaginationBarProps) {
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const hasPrev = page > 0;
    const hasNext = page < totalPages - 1;

    const pages = (() => {
        const arr: number[] = [];
        if (totalPages <= 5) {
            for (let i = 0; i < totalPages; i++) arr.push(i);
            return arr;
        }
        if (page <= 2) return [0, 1, 2, 3, 4];
        if (page >= totalPages - 3)
            return [totalPages - 5, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1];
        return [page - 2, page - 1, page, page + 1, page + 2];
    })();

    const start = page * perPage + 1;
    const end = Math.min((page + 1) * perPage, total);

    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 rounded-lg border border-gray-100">
            <div className="text-sm text-gray-600">
                Showing {start} to {end} of {total} results
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onChange(Math.max(0, page - 1))}
                    disabled={!hasPrev || !!disabled}
                    className="h-8 px-3"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                </Button>
                <div className="flex items-center gap-1">
                    {pages.map((p) => (
                        <Button
                            key={p}
                            variant={page === p ? "default" : "outline"}
                            size="sm"
                            onClick={() => onChange(p)}
                            disabled={!!disabled}
                            className="h-8 w-8 p-0"
                        >
                            {p + 1}
                        </Button>
                    ))}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
                    disabled={!hasNext || !!disabled}
                    className="h-8 px-3"
                >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
            </div>
        </div>
    );
}

// ============================================================================
// UPLOAD AREA
// ============================================================================

// type SerializedAttachmentMedia = Omit<IAttachmentMedia, "_id" | "ownerId" | "orgId"> & { 
//     _id: string,
//     ownerId: string,
//     orgId: string,
// };

interface UploadAreaProps {
    onUploaded: (attachment: any) => void;
    uploadFile?: (file: File) => Promise<any>;
    className?: string;
    compact?: boolean;
    acceptedTypes?: string;
}

function UploadArea({
    onUploaded,
    uploadFile,
    className = "",
    compact = false,
    acceptedTypes = ACCEPTED_EXT
}: UploadAreaProps) {
    const [drag, setDrag] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);

    const handleSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) setFile(f);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) setFile(f);
    }, []);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDrag(true);
        if (e.type === "dragleave") setDrag(false);
    }, []);

    const upload = useCallback(async () => {
        if (!file) return toast.error("Please select a file");
        if (!uploadFile) return toast.error("Upload function not available");

        setBusy(true);
        try {
            const attachment = await uploadFile(file);
            toast.success("Media uploaded successfully");
            onUploaded(attachment);
            setFile(null);
        } catch (err: any) {
            toast.error(`Failed to upload media: ${err?.message || "Unknown error"}`);
        } finally {
            setBusy(false);
        }
    }, [file, uploadFile, onUploaded]);

    const padding = compact ? "p-4" : "p-8";
    const iconSize = compact ? "w-8 h-8" : "w-16 h-16";
    const iconContainerSize = compact ? "w-12 h-12" : "w-16 h-16";

    const inputUploadRef = useRef<HTMLInputElement>(null);

    return (
        <div className={className}>
            <div
                className={`relative border-2 border-dashed rounded-xl ${padding} text-center transition-all duration-300 ${drag
                    ? "border-blue-400 bg-blue-50/50"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50/30"
                    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    ref={inputUploadRef}
                    type="file"
                    accept={acceptedTypes}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleSelect}
                />
                <div className="space-y-4 pointer-events-none">
                    <div className={`mx-auto ${iconContainerSize} bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center`}>
                        <Upload className={`${iconSize} text-blue-600`} />
                    </div>
                    <div>
                        <p className={`font-semibold text-gray-900 mb-2 ${compact ? "text-base" : "text-lg"}`}>
                            Drop files here or click to browse
                        </p>
                        {!compact && (
                            <p className="text-sm text-gray-500 mb-4">
                                Support for images, documents, videos, and more
                            </p>
                        )}
                        <Button
                            type="button"
                            onClick={() => {
                                inputUploadRef.current?.click();
                            }}
                            disabled={busy}
                            className="pointer-events-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                            size={compact ? "sm" : "default"}
                        >
                            {busy ? "Uploading..." : "Choose Files"}
                        </Button>
                    </div>
                </div>
            </div>

            {file && (
                <div className={`mt-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100 ${compact ? "p-3" : ""}`}>
                    <h4 className={`font-medium mb-2 text-blue-900 ${compact ? "text-sm" : ""}`}>
                        Selected File
                    </h4>
                    <div className="flex items-center justify-between">
                        <span className={`truncate flex-1 mr-2 ${compact ? "text-xs" : "text-sm"}`}>
                            {file.name}
                        </span>
                        <span className={`text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
                            {formatSize(file.size)}
                        </span>
                    </div>
                </div>
            )}

            <div className={`flex gap-3 ${compact ? "mt-4" : "mt-6"}`}>
                <Button
                    onClick={upload}
                    disabled={!file || busy}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    size={compact ? "sm" : "default"}
                >
                    {busy ? (
                        <>
                            <Upload className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload File
                        </>
                    )}
                </Button>
                <Button
                    variant="outline"
                    onClick={() => setFile(null)}
                    disabled={busy}
                    size={compact ? "sm" : "default"}
                >
                    Clear
                </Button>
            </div>
        </div>
    );
}

const MediaComponents = {
    MediaGrid,
    MediaList,
    MediaFilters,
    PaginationBar,
    UploadArea,
}

export default MediaComponents;