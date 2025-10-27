"use client";

import { InsertMediaNiceDialog } from "@/components/media/insert-media-dialog";
import { AnyExtension, Editor } from "@tiptap/react";
import { ITextEditorContent } from "@workspace/common-logic/lib/text-editor-content";
import { NiceModal } from "@workspace/components-library";
import {
  ContentEditor,
  ContentEditorProps,
  EditorToolbarItems,
  MediaViewExtension,
  ToolbarProvider,
  useToolbar,
} from "@workspace/text-editor/tiptap-sh";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { ScrollArea, ScrollBar } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { FileTextIcon, ImageIcon, Plus, VideoIcon, Volume2 } from "lucide-react";
import { useMemo } from "react";

import "./description-editor.scss";

interface DescriptionEditorProps extends ContentEditorProps {
  courseId?: string;
}

type AssetType = ITextEditorContent["assets"][number];

const createMediaExtension = (courseId?: string) => {
  return MediaViewExtension.extend({
    addStorage() {
      return { courseId };
    },

    addCommands() {
      const parentCommands = this.parent?.();
      return {
        ...parentCommands,
        openMediaSelectDialog:
          ({ fileType }) =>
          ({ editor }) => {
            const storage = editor.storage.mediaView as { courseId?: string };
            
            NiceModal.show(InsertMediaNiceDialog, {
              args: {
                selectMode: true,
                selectedMedia: null,
                initialFileType: fileType,
                courseId: storage?.courseId || "",
              }
            })
              .then((result) => {
                if (result.reason === "submit" && result.data) {
                  const asset: AssetType = {
                    url: result.data.url,
                    caption: result.data.caption || result.data.originalFileName || "",
                    media: result.data,
                  };
                  editor.chain().focus().setMediaView(asset).run();
                }
              })
              .catch((error) => {
                console.error("Failed to insert media:", error);
              });

            return true;
          },
      };
    },
  });
};

export function DescriptionEditor({ courseId, ...props }: DescriptionEditorProps) {
  const extensionsDict: Record<string, AnyExtension | false> = useMemo(() => ({
    mediaView: createMediaExtension(courseId),
  }), [courseId]);

  return (
    <ContentEditor
      className={cn(
        "description-editor-wrapper",
        props.className,
        props.editable ? "" : "readonly",
      )}
      extraExtensions={extensionsDict}
      toolbar={props.toolbar !== undefined ? props.toolbar : EditorToolbar}
      {...props}
    />
  );
}

const EditorToolbar = ({ editor }: { editor: Editor }) => {
  return (
    <div className="sticky top-0 z-20 w-full border-b bg-background hidden sm:block">
      <ToolbarProvider editor={editor}>
        <TooltipProvider>
          <ScrollArea className="h-fit py-0.5 w-full">
            <div>
              <div className="flex items-center gap-1 px-2">
                <EditorToolbarItems.UndoToolbar />
                <EditorToolbarItems.RedoToolbar />
                <Separator orientation="vertical" className="mx-1 h-7" />

                <EditorToolbarItems.HeadingsToolbar />
                <EditorToolbarItems.BlockquoteToolbar />
                <Separator orientation="vertical" className="mx-1 h-7" />

                <EditorToolbarItems.BoldToolbar />
                <EditorToolbarItems.ItalicToolbar />
                <EditorToolbarItems.UnderlineToolbar />
                <EditorToolbarItems.StrikeThroughToolbar />
                <EditorToolbarItems.LinkToolbar />
                <Separator orientation="vertical" className="mx-1 h-7" />

                <EditorToolbarItems.BulletListToolbar />
                <EditorToolbarItems.OrderedListToolbar />
                <Separator orientation="vertical" className="mx-1 h-7" />

                <MediaInsertDropdown />
                <EditorToolbarItems.ColorHighlightToolbar />

                <div className="flex-1" />
              </div>
            </div>
            <ScrollBar className="hidden" orientation="horizontal" />
          </ScrollArea>
        </TooltipProvider>
      </ToolbarProvider>
    </div>
  );
};

const MediaInsertDropdown = () => {
  const { editor } = useToolbar();

  const handleInsertMedia = (fileType: "document" | "image" | "video" | "audio" | "json" | "all") => {
    if (editor) {
      editor.commands.openMediaSelectDialog({ fileType });
    }
  };

  if (!editor) return null;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className={cn(
                "h-8 w-8 p-0 sm:h-9 sm:w-9",
                editor?.isActive("mediaView") && "bg-accent",
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
        <DropdownMenuItem onClick={(e) => {
          e.preventDefault();
          handleInsertMedia("image");
        }}>
          <ImageIcon className="h-4 w-4 mr-2" />
          Image
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => {
          e.preventDefault();
          handleInsertMedia("video");
        }}>
          <VideoIcon className="h-4 w-4 mr-2" />
          Video
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => {
          e.preventDefault();
          handleInsertMedia("audio");
        }}>
          <Volume2 className="h-4 w-4 mr-2" />
          Audio
        </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => {
          e.preventDefault();
          handleInsertMedia("document");
        }}>
          <FileTextIcon className="h-4 w-4 mr-2" />
          PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
