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
  Maximize,
  MoreVertical,
  Trash,
} from "lucide-react";
import { useRef, useState } from "react";


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
      className="w-full h-auto rounded-lg"
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
    <iframe
      src={url}
      className="w-full h-96 rounded-lg border"
      title={title || "PDF Document"}
    />
  );
}

function EmbedMedia({ url }: { url: string }) {
  return (
    <div
      className="w-full h-96 rounded-lg border bg-muted flex items-center justify-center"
      dangerouslySetInnerHTML={{ __html: url }}
    />
  );
}

export function MediaViewComponent(props: NodeViewProps) {
  const { node, editor, selected, deleteNode, updateAttributes } = props;
  const [editingCaption, setEditingCaption] = useState(false);
  const [caption, setCaption] = useState(node.attrs.asset?.caption || "");
  const [openedMore, setOpenedMore] = useState(false);
  const mediaRef = useRef<HTMLDivElement>(null);

  const { asset, display } = node.attrs;
  const { url, media } = asset || {};
  const { width, height, align } = display || {};

  const handleCaptionUpdate = (newCaption: string) => {
    setCaption(newCaption);
    updateAttributes({
      asset: {
        ...node.attrs.asset,
        caption: newCaption,
      },
    });
  };

  const handleDelete = () => {
    deleteNode();
  };

  const handleAspectRatioUpdate = (aspectRatio: number) => {
    // Store aspect ratio in display settings if needed
    updateAttributes({
      display: {
        ...node.attrs.display,
        aspectRatio,
      },
    });
  };

  const getMediaType = (url: string, mimeType?: string): string => {
    if (!url) return "unknown";

    if (mimeType) {
      if (mimeType.startsWith("image/")) return "image";
      if (mimeType.startsWith("video/")) return "video";
      if (mimeType.startsWith("audio/")) return "audio";
      if (mimeType === "application/pdf") return "pdf";
    }

    // Fallback to URL extension
    const extension = url.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension || ""))
      return "image";
    if (["mp4", "webm", "ogg", "mov", "avi"].includes(extension || ""))
      return "video";
    if (["mp3", "wav", "ogg", "aac"].includes(extension || "")) return "audio";
    if (extension === "pdf") return "pdf";

    return "unknown";
  };

  const renderMediaContent = () => {
    const mediaType = getMediaType(url, media?.mimeType);

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
          <div className="w-full h-32 rounded-lg border bg-muted flex items-center justify-center text-muted-foreground">
            <span>Unsupported media type</span>
          </div>
        );
    }
  };

  return (
    <NodeViewWrapper
      ref={mediaRef}
      className={cn(
        "media-view-component relative flex flex-col rounded-md border-2 border-transparent transition-all duration-200",
        selected ? "border-blue-300" : "",
        align === "left" && "left-0 -translate-x-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "right" && "left-full -translate-x-full",
      )}
      style={{ width }}
    >
      <div className="group relative flex flex-col rounded-md">
        <div className="relative">{renderMediaContent()}</div>

        {editingCaption ? (
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onBlur={() => {
              handleCaptionUpdate(caption);
              setEditingCaption(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCaptionUpdate(caption);
                setEditingCaption(false);
              }
            }}
            className="mt-2 text-center text-sm text-muted-foreground focus:ring-0"
            placeholder="Add a caption..."
            autoFocus
          />
        ) : (
          <div
            className="mt-2 cursor-text text-center text-sm text-muted-foreground"
            onClick={() => editor?.isEditable && setEditingCaption(true)}
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
              onClick={() =>
                updateAttributes({
                  display: {
                    ...node.attrs.display,
                    align: "left",
                  },
                })
              }
            >
              <AlignLeft className="size-4" />
            </Button>
            <Button
              size="icon"
              className={cn("size-7", align === "center" && "bg-accent")}
              variant="ghost"
              onClick={() =>
                updateAttributes({
                  display: {
                    ...node.attrs.display,
                    align: "center",
                  },
                })
              }
            >
              <AlignCenter className="size-4" />
            </Button>
            <Button
              size="icon"
              className={cn("size-7", align === "right" && "bg-accent")}
              variant="ghost"
              onClick={() =>
                updateAttributes({
                  display: {
                    ...node.attrs.display,
                    align: "right",
                  },
                })
              }
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

                <DropdownMenuItem
                  onClick={() => {
                    const aspectRatio = node.attrs.display?.aspectRatio;
                    if (aspectRatio) {
                      const parentWidth =
                        mediaRef.current?.parentElement?.offsetWidth ?? 0;
                      updateAttributes({
                        display: {
                          ...node.attrs.display,
                          width: parentWidth,
                          height: parentWidth / aspectRatio,
                        },
                      });
                    }
                  }}
                >
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
