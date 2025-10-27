"use client";

import { InsertMediaNiceDialog } from "@/components/media/insert-media-dialog";
import { AnyExtension, Editor } from "@tiptap/react";
import { ITextEditorContent } from "@workspace/common-logic/lib/text-editor-content";
import { NiceModal } from "@workspace/components-library";
import type { CommandSuggestionItem } from "@workspace/text-editor/tiptap-sh";
import {
  ContentEditor,
  ContentEditorProps,
  EditorToolbarItems,
  getSuggestion,
  MediaViewExtension,
  SlashCommand,
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
import { FileTextIcon, HelpCircleIcon, ImageIcon, Plus, VideoIcon, Volume2, FileUp } from "lucide-react";
import { useMemo } from "react";
import { AssignmentLinkNodeExtension } from "../../extensions/assignment-link/assignment-link-node-extension";
import { Extension } from "@tiptap/core";
import { ImportFileNiceDialog } from "../../dialogs/import-file-dialog";

import "./lesson-content-editor.scss";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fileImport: {
      openFileImportDialog: () => ReturnType;
    };
  }
}

interface ILessonMinimal {
  _id: string;
  courseId: string;
}

interface LessonContentEditorProps extends ContentEditorProps {
  lesson: ILessonMinimal;
}

type AssetType = ITextEditorContent["assets"][number];

// Create custom extension factories with lesson context

const createLessonMediaViewExtension = (lesson: ILessonMinimal) => {
  return MediaViewExtension.extend({

    addStorage() {
      return {
        lesson: lesson,
      };
    },

    addCommands() {
      const parentCommands = this.parent?.();
      return {
        ...parentCommands,
        openMediaSelectDialog:
          ({ fileType }) =>
          ({ editor, chain }) => {
            // Execute async logic but don't block command execution
            const storage = editor.storage.mediaView;
            
            NiceModal.show(InsertMediaNiceDialog, {
              args: {
                selectMode: true,
                selectedMedia: null,
                initialFileType: fileType,
                courseId: storage?.lesson?.courseId,
                lessonId: storage?.lesson?._id,
              }
            })
              .then((result) => {                
                if (result.reason === "submit" && result.data) {
                  const asset: AssetType = {
                    url: result.data.url,
                    caption: result.data.caption || result.data.originalFileName || "",
                    media: result.data,
                  };
                  
                  // Insert after dialog resolves
                  editor.chain().focus().setMediaView(asset).run();
                }
              })
              .catch((error) => {
                console.error("Failed to insert media:", error);
              });

            // Return true immediately to indicate command executed successfully
            return true;
          },
      };
    },
  });
};

export const LessonContentEditor = (props: LessonContentEditorProps) => {
  const { lesson, ...editorProps } = props;

  const customSuggestions = useMemo(() => {
    const mediaItems: CommandSuggestionItem[] = [
      {
        title: "Media",
        description: "Insert media from media library.",
        keywords: ["image", "photo", "picture", "img", "audio", "sound", "music", "mp3", "mp4", "pdf", "document", "file", "media"],
        icon: ImageIcon,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
          editor.commands.openMediaSelectDialog({
            fileType: "image",
          });
        },
      },
      {
        title: "Attach Assignment",
        description: "Attach assignment from assignment library.",
        keywords: ["assignment", "homework", "project", "submission", "grading", "feedback"],
        icon: FileTextIcon,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
          editor.commands.openAssignmentSelectDialog({ type: "assignment" });
        },
      },
      {
        title: "Attach Quiz",
        description: "Attach quiz from quiz library.",
        keywords: ["quiz", "test", "exam", "question", "answer", "evaluation"],
        icon: HelpCircleIcon,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
          editor.commands.openAssignmentSelectDialog({ type: "quiz" });
        },
      },
    ];

    return getSuggestion({ ai: true, customItems: mediaItems });
  }, []);

  const FileImportExtension = useMemo(() => {
    return Extension.create({
      name: "fileImport",
      
      addCommands() {
        return {
          openFileImportDialog: () => ({ editor }: { editor: Editor }) => {
            NiceModal.show(ImportFileNiceDialog, {})
              .then((result) => {
                if (result.reason === "submit" && result.content) {
                  console.log("result.content", result.content);
                  editor.commands.setContent(result.content);
                }
              })
              .catch((error: any) => {
                console.error("File import error:", error);
              });
            return true;
          },
        } as any;
      },
    });
  }, []);

  const extensionsDict: Record<string, AnyExtension | false> = useMemo(() => {
    return {
      slashCommand: SlashCommand.configure({
        suggestion: customSuggestions,
      }),
      mediaView: createLessonMediaViewExtension(lesson),
      assignmentLink: AssignmentLinkNodeExtension.extend({
        addStorage() {
          return {
            lesson: lesson,
          };
        },
      }),
      fileImport: FileImportExtension,
    };
  }, [customSuggestions, lesson, FileImportExtension]);

  return (
    <ContentEditor
      className={cn(
        "lesson-content-editor-wrapper",
        editorProps.className,
        editorProps.editable ? "" : "readonly",
      )}
      extraExtensions={extensionsDict}
      {...editorProps}
      toolbar={editorProps.toolbar !== undefined ? editorProps.toolbar : EditorToolbar}
    />
  );
};

const EditorToolbar = ({ editor }: { editor: Editor }) => {
  return (
    <div className="sticky top-0 z-20 w-full border-b bg-background hidden sm:block">
      <ToolbarProvider editor={editor}>
        <TooltipProvider>
          <ScrollArea className="h-fit py-0.5 w-full">
            <div>
              <div className="flex items-center gap-1 px-2">
                {/* History Group */}
                <EditorToolbarItems.UndoToolbar />
                <EditorToolbarItems.RedoToolbar />
                <Separator orientation="vertical" className="mx-1 h-7" />

                {/* Text Structure Group */}
                <EditorToolbarItems.HeadingsToolbar />
                <EditorToolbarItems.BlockquoteToolbar />
                <EditorToolbarItems.CodeToolbar />
                <EditorToolbarItems.CodeBlockToolbar />
                <Separator orientation="vertical" className="mx-1 h-7" />

                {/* Basic Formatting Group */}
                <EditorToolbarItems.BoldToolbar />
                <EditorToolbarItems.ItalicToolbar />
                <EditorToolbarItems.UnderlineToolbar />
                <EditorToolbarItems.StrikeThroughToolbar />
                <EditorToolbarItems.LinkToolbar />
                <Separator orientation="vertical" className="mx-1 h-7" />

                {/* Lists & Structure Group */}
                <EditorToolbarItems.BulletListToolbar />
                <EditorToolbarItems.OrderedListToolbar />
                <EditorToolbarItems.HorizontalRuleToolbar />
                <Separator orientation="vertical" className="mx-1 h-7" />

                {/* Alignment Group */}
                <EditorToolbarItems.AlignmentTooolbar />
                <Separator orientation="vertical" className="mx-1 h-7" />

                {/* Media & Styling Group */}
                <CustomMediaInsertDropdown />
                <EditorToolbarItems.ColorHighlightToolbar />
                <Separator orientation="vertical" className="mx-1 h-7" />
                <InsertAssignmentToolbar />

                <div className="flex-1" />
                
                <ImportFileToolbar />

                {/* Utility Group */}
                {/* <EditorToolbarItems.SearchAndReplaceToolbar /> */}
              </div>
            </div>
            <ScrollBar className="hidden" orientation="horizontal" />
          </ScrollArea>
        </TooltipProvider>
      </ToolbarProvider>
    </div>
  );
};

const InsertAssignmentToolbar = () => {
  const { editor } = useToolbar();

  const handleInsertAssignment = (type: "assignment" | "quiz") => {
    editor.commands.openAssignmentSelectDialog({ type });
  };

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 sm:h-9 sm:w-9"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <span>Insert Assignment</span>
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={(e) => {
          e.preventDefault();
          handleInsertAssignment("assignment");
        }}>
          <FileTextIcon className="h-4 w-4 mr-2" />
          Assignment
        </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => {
          e.preventDefault();
          handleInsertAssignment("quiz");
        }}>
          <HelpCircleIcon className="h-4 w-4 mr-2" />
          Quiz
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ImportFileToolbar = () => {
  const { editor } = useToolbar();

  const handleImport = () => {
    if (editor) {
      (editor.commands as any).openFileImportDialog();
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={handleImport}
          className="h-8 w-8 p-0 sm:h-9 sm:w-9"
        >
          <FileUp className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <span>Import File (PDF/DOCX)</span>
      </TooltipContent>
    </Tooltip>
  );
};

const CustomMediaInsertDropdown = () => {
  const { editor } = useToolbar();

  const handleInsertMedia = (fileType: "document" | "image" | "video" | "audio" | "json" | "all") => {
    if (editor) {
      editor.commands.openMediaSelectDialog({fileType});
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
}
    