import { Editor } from "@tiptap/core";
import { ScrollArea, ScrollBar } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { AlignmentTooolbar } from "./alignment";
import { BlockquoteToolbar } from "./blockquote";
import { BoldToolbar } from "./bold";
import { BulletListToolbar } from "./bullet-list";
import { CodeToolbar } from "./code";
import { CodeBlockToolbar } from "./code-block";
import { ColorHighlightToolbar } from "./color-and-highlight";
import { HeadingsToolbar } from "./headings";
import { HorizontalRuleToolbar } from "./horizontal-rule";
import { ItalicToolbar } from "./italic";
import { LinkToolbar } from "./link";
import { MediaDropdownToolbar } from "./media-dropdown-toolbar";
import { OrderedListToolbar } from "./ordered-list";
import { RedoToolbar } from "./redo";
import { SearchAndReplaceToolbar } from "./search-and-replace-toolbar";
import { StrikeThroughToolbar } from "./strikethrough";
import { ToolbarProvider } from "./toolbar-provider";
import { UnderlineToolbar } from "./underline";
import { UndoToolbar } from "./undo";

export const EditorToolbar = ({ editor }: { editor: Editor }) => {
  return (
    <div className="sticky top-0 z-20 w-full border-b bg-background hidden sm:block">
      <ToolbarProvider editor={editor}>
        <TooltipProvider>
          <ScrollArea className="h-fit py-0.5">
              <div className="flex items-center gap-1 px-2">
                {/* History Group */}
                <UndoToolbar />
                <RedoToolbar />
                <Separator orientation="vertical" className="mx-1 h-7" />

                {/* Text Structure Group */}
                <HeadingsToolbar />
                <BlockquoteToolbar />
                <CodeToolbar />
                <CodeBlockToolbar />
                <Separator orientation="vertical" className="mx-1 h-7" />

                {/* Basic Formatting Group */}
                <BoldToolbar />
                <ItalicToolbar />
                <UnderlineToolbar />
                <StrikeThroughToolbar />
                <LinkToolbar />
                <Separator orientation="vertical" className="mx-1 h-7" />

                {/* Lists & Structure Group */}
                <BulletListToolbar />
                <OrderedListToolbar />
                <HorizontalRuleToolbar />
                <Separator orientation="vertical" className="mx-1 h-7" />

                {/* Alignment Group */}
                <AlignmentTooolbar />
                <Separator orientation="vertical" className="mx-1 h-7" />

                {/* Media & Styling Group */}
                <MediaDropdownToolbar />
                <ColorHighlightToolbar />
                <Separator orientation="vertical" className="mx-1 h-7" />

                <div className="flex-1" />

                {/* Utility Group */}
                <SearchAndReplaceToolbar />
              </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </TooltipProvider>
      </ToolbarProvider>
    </div>
  );
};

export const EditorToolbarItems = {
  UndoToolbar,
  RedoToolbar,
  HeadingsToolbar,
  BlockquoteToolbar,
  CodeToolbar,
  CodeBlockToolbar,
  BoldToolbar,
  ItalicToolbar,
  UnderlineToolbar,
  StrikeThroughToolbar,
  LinkToolbar,
  BulletListToolbar,
  OrderedListToolbar,
  HorizontalRuleToolbar,
  AlignmentTooolbar,
  MediaDropdownToolbar,
  ColorHighlightToolbar,
  SearchAndReplaceToolbar,


  // ToolbarProvider,
}

