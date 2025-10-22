"use client";

import { ITextEditorContent } from "@workspace/common-logic/lib/text-editor-content";
import {
  MediaBrowserNiceDialog,
  NiceModal,
} from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import {
  FileTextIcon,
  ImageIcon,
  Plus,
  VideoIcon,
  Volume2,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useToolbar } from "./toolbar-provider";

type AssetType = ITextEditorContent["assets"][number];

export function MediaDropdownToolbar({ className }: { className?: string }) {
  const { editor } = useToolbar();
  const [isOpen, setIsOpen] = useState(false);

  const openMediaDialog = useCallback(
    async (fileType: string) => {
      try {
        const result = await NiceModal.show(MediaBrowserNiceDialog, {
          selectMode: true,
          selectedMedia: null,
          initialFileType: fileType,
        });

        if (result.reason === "submit" && editor) {
          const asset: AssetType = {
            url: result.data.url,
            caption: result.data.caption || result.data.originalFileName || "",
            media: result.data,
          };
          
          // Insert the media view
          editor.chain().focus().setMediaView(asset).run();
        }

        setIsOpen(false);
        return result;
      } catch (error) {
        console.error("Failed to open media dialog:", error);
        setIsOpen(false);
        return null;
      }
    },
    [editor],
  );

  if (!editor) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 p-0 sm:h-9 sm:w-9",
                editor?.isActive("mediaView") && "bg-accent",
                className,
              )}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <span>Insert Media</span>
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={() => openMediaDialog("image/")}>
          <ImageIcon className="h-4 w-4 mr-2" />
          Image
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openMediaDialog("video/")}>
          <VideoIcon className="h-4 w-4 mr-2" />
          Video
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openMediaDialog("audio/")}>
          <Volume2 className="h-4 w-4 mr-2" />
          Audio
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openMediaDialog("application/pdf")}>
          <FileTextIcon className="h-4 w-4 mr-2" />
          PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
