"use client";

import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Edit,
  ExternalLink,
  FileIcon,
  Maximize,
  MoreVertical,
  Trash,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";


// Media type components defined within the same file
function ImageMedia({
  url,
  alt,
  onLoad,
}: {
  url: string;
  alt?: string;
  onLoad: (aspectRatio: number) => void;
}) {
  return (
    <img
      src={url}
      alt={alt}
      className="w-full !max-w-xl h-auto rounded-lg"
      onLoad={(e) => {
        const img = e.currentTarget;
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        onLoad(aspectRatio);
      }}
    />
  );
}

function VideoMedia({ url }: { url: string }) {
  return <video src={url} controls className="w-full h-auto rounded-lg" />;
}

function AudioMedia({ url }: { url: string }) {
  return <audio src={url} controls className="w-full" />;
}

function PdfMedia({ url, title }: { url: string; title?: string }) {
  return (
    <div className="w-full rounded-lg border bg-background overflow-hidden">
      <iframe
        src={url}
        className="w-full h-96 border-0"
        title={title || "PDF Document"}
      />
    </div>
  );
}

function UnsupportedMedia({ url, title, mimeType }: { url: string; title?: string; mimeType?: string }) {
  const fileName = title || url.split("/").pop() || "Download File";
  const fileType = mimeType ? mimeType.split("/")[1]?.toUpperCase() : "FILE";
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full rounded-lg border bg-card p-6 transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
          <FileIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{fileName}</p>
            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{fileType}</p>
        </div>
      </div>
    </a>
  );
}

const getMediaType = (url: string, mimeType?: string): string => {
  if (!url) return "unknown";

  if (mimeType) {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType === "application/pdf" || mimeType.includes("pdf")) return "pdf";
  }

  const extension = url.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(extension || ""))
    return "image";
  if (["mp4", "webm", "ogg", "mov", "avi", "mkv", "flv"].includes(extension || ""))
    return "video";
  if (["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(extension || "")) 
    return "audio";
  if (extension === "pdf") return "pdf";

  return "unknown";
};

export function MediaViewComponent(props: NodeViewProps) {
  const { node, editor, selected, deleteNode, updateAttributes } = props;
  const [editingCaption, setEditingCaption] = useState(false);
  const [caption, setCaption] = useState(node.attrs.asset?.caption || "");
  const [openedMore, setOpenedMore] = useState(false);
  const mediaRef = useRef<HTMLDivElement>(null);

  const { asset, display } = useMemo(() => ({
    asset: node.attrs.asset,
    display: node.attrs.display,
  }), [node.attrs.asset, node.attrs.display]);

  const { url, media } = asset || {};
  const { width, align } = display || {};
  const handleCaptionUpdate = useCallback((newCaption: string) => {
    setCaption(newCaption);
    updateAttributes({
      asset: {
        ...node.attrs.asset,
        caption: newCaption,
      },
    });
  }, [node.attrs.asset, updateAttributes]);

  const handleDelete = useCallback(() => {
    deleteNode();
  }, [deleteNode]);

  const handleAspectRatioUpdate = useCallback((aspectRatio: number) => {
    updateAttributes({
      display: {
        ...node.attrs.display,
        aspectRatio,
      },
    });
  }, [node.attrs.display, updateAttributes]);

  const mediaType = useMemo(() => getMediaType(url, media?.mimeType), [url, media?.mimeType]);

  const renderMediaContent = useMemo(() => {
    switch (mediaType) {
      case "image":
        return (
          <ImageMedia
            url={url}
            alt={caption}
            onLoad={handleAspectRatioUpdate}
          />
        );
      case "video":
        return <VideoMedia url={url} />;
      case "audio":
        return <AudioMedia url={url} />;
      case "pdf":
        return <PdfMedia url={url} title={media?.originalFileName} />;
      default:
        return (
          <UnsupportedMedia 
            url={url} 
            title={media?.originalFileName || caption} 
            mimeType={media?.mimeType}
          />
        );
    }
  }, [mediaType, url, caption, media?.originalFileName, media?.mimeType, handleAspectRatioUpdate]);

  const handleAlignLeft = useCallback(() => {
    updateAttributes({
      display: {
        ...node.attrs.display,
        align: "left",
      },
    });
  }, [node.attrs.display, updateAttributes]);

  const handleAlignCenter = useCallback(() => {
    updateAttributes({
      display: {
        ...node.attrs.display,
        align: "center",
      },
    });
  }, [node.attrs.display, updateAttributes]);

  const handleAlignRight = useCallback(() => {
    updateAttributes({
      display: {
        ...node.attrs.display,
        align: "right",
      },
    });
  }, [node.attrs.display, updateAttributes]);

  const handleFullWidth = useCallback(() => {
    const aspectRatio = node.attrs.display?.aspectRatio;
    if (aspectRatio) {
      const parentWidth = mediaRef.current?.parentElement?.offsetWidth ?? 0;
      updateAttributes({
        display: {
          ...node.attrs.display,
          width: parentWidth,
          height: parentWidth / aspectRatio,
        },
      });
    }
  }, [node.attrs.display, updateAttributes]);

  const handleCaptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCaption(e.target.value);
  }, []);

  const handleCaptionBlur = useCallback(() => {
    handleCaptionUpdate(caption);
    setEditingCaption(false);
  }, [caption, handleCaptionUpdate]);

  const handleCaptionKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCaptionUpdate(caption);
      setEditingCaption(false);
    }
  }, [caption, handleCaptionUpdate]);

  const handleStartEditCaption = useCallback(() => {
    if (editor?.isEditable) {
      setEditingCaption(true);
    }
  }, [editor?.isEditable]);

  return (
    <NodeViewWrapper
      ref={mediaRef}
      className={cn(
        "mediaView-component relative flex flex-col rounded-md border-2 border-transparent transition-all duration-200",
        selected ? "border-blue-300" : "",
        align === "left" && "left-0 -translate-x-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "right" && "left-full -translate-x-full",
      )}
      style={{ width }}
    >
      <div className="group relative flex flex-col rounded-md">
        <div className="relative">{renderMediaContent}</div>

        {editingCaption ? (
          <Input
            value={caption}
            onChange={handleCaptionChange}
            onBlur={handleCaptionBlur}
            onKeyDown={handleCaptionKeyDown}
            className="mt-2 text-center text-sm text-muted-foreground focus:ring-0"
            placeholder="Add a caption..."
            autoFocus
          />
        ) : (
          <div
            className="mt-2 cursor-text text-center text-sm text-muted-foreground"
            onClick={handleStartEditCaption}
          >
            {caption || "Add a caption..."}
          </div>
        )}

        {editor?.isEditable && (
          <div
            className={cn(
              "absolute right-4 top-4 flex items-center gap-1 rounded-md border bg-background/80 p-1 opacity-0 backdrop-blur transition-opacity",
              "group-hover:opacity-100",
              openedMore && "opacity-100",
            )}
          >
            <Button
              size="icon"
              className={cn("size-7", align === "left" && "bg-accent")}
              variant="ghost"
              onClick={handleAlignLeft}
            >
              <AlignLeft className="size-4" />
            </Button>
            <Button
              size="icon"
              className={cn("size-7", align === "center" && "bg-accent")}
              variant="ghost"
              onClick={handleAlignCenter}
            >
              <AlignCenter className="size-4" />
            </Button>
            <Button
              size="icon"
              className={cn("size-7", align === "right" && "bg-accent")}
              variant="ghost"
              onClick={handleAlignRight}
            >
              <AlignRight className="size-4" />
            </Button>

            <Separator orientation="vertical" className="h-[20px]" />

            <DropdownMenu open={openedMore} onOpenChange={setOpenedMore}>
              <DropdownMenuTrigger asChild>
                <Button size="icon" className="size-7" variant="ghost">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                alignOffset={-90}
                className="mt-1 text-sm"
              >
                <DropdownMenuItem onClick={() => setEditingCaption(true)}>
                  <Edit className="mr-2 size-4" /> Edit Caption
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleFullWidth}>
                  <Maximize className="mr-2 size-4" /> Full Width
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash className="mr-2 size-4" /> Delete Media
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
