"use client";

import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import { TableKit } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { AnyExtension, Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ITextEditorContent } from "@workspace/common-logic/lib/text-editor-content";
import { cn } from "@workspace/ui/lib/utils";
import { useMemo } from "react";
import { MediaViewExtension } from "../extensions/media-view";
import { MyContentExtension } from "../extensions/my-content";
import SearchAndReplace from "../extensions/search-and-replace";
import { EditorToolbar } from "../toolbars/editor-toolbar";

import { memo } from "react";
import Youtube from "@tiptap/extension-youtube";
import { SlashCommand } from "../extensions/slash-command/slash-command";
import { getSuggestion } from "../extensions/slash-command/suggestion";
import { DefaultBubbleMenu } from "../components/menus/bubble-menu";


import "../styles/tiptap.css";

export type ContentEditorProps = {
  initialContent?: string;
  onChange?: (content: string) => void;
  onTextEditorContentChange?: (content: ITextEditorContent) => void;
  onEditor?: (
    editor: Editor | null,
    meta: {
      reason: "create" | "destroy";
    },
  ) => void;
  placeholder?: string;
  editable?: boolean;
  className?: ReturnType<typeof cn>;
  extraExtensions?: Record<string, AnyExtension | false>;
  toolbar?: boolean | ((props: { editor: Editor }) => React.ReactNode);
  children?: React.ReactNode;
};

export type ContentEditorRef = Editor;

const TiptapYoutube = Youtube.configure({
  HTMLAttributes: {
    class: cn("border border-muted"),
  },
  nocookie: true,
});

export function ContentEditor({
  initialContent,
  onChange,
  onTextEditorContentChange,
  onEditor,
  placeholder,
  editable = true,
  className,
  extraExtensions = {},
  toolbar = true,
  children,
}: ContentEditorProps) {
  const allExtensions = useMemo(() => {
    const defaultExtensionsDict: Record<string, AnyExtension | false> = {
      starterKit: StarterKit.configure({
        orderedList: {
          HTMLAttributes: {
            class: "list-decimal",
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: "list-disc",
          },
        },
        heading: {
          levels: [1, 2, 3, 4],
        },
        link: false,
        underline: false,
      }),
      placeholder: Placeholder.configure({
        emptyNodeClass: "is-editor-empty",
        placeholder: ({ node }) => {
          switch (node.type.name) {
            case "heading":
              return `Heading ${node.attrs.level}`;
            case "detailsSummary":
              return "Section title";
            case "codeBlock":
              return "";
            default:
              return placeholder || "Write, type '/' for commands";
          }
        },
        includeChildren: false,
      }),
      textAlign: TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      textStyleKit: TextStyleKit,
      subscript: Subscript,
      superscript: Superscript,
      underline: Underline,
      link: Link,
      color: Color,
      highlight: Highlight.configure({
        multicolor: true,
      }),
      mediaView: MediaViewExtension,
      myContent: MyContentExtension,
      searchAndReplace: SearchAndReplace,
      typography: Typography,
      youtube: TiptapYoutube,
      table: TableKit.configure({
        table: { 
          resizable: true,
          HTMLAttributes: {
            class: cn(
              'relative m-0 mx-auto my-3 w-full table-fixed border-collapse overflow-hidden rounded-none text-sm'
            ),
          },
          allowTableNodeSelection: true,
         },
      }),
      tableRow: TableRow.configure({
        HTMLAttributes: {
          class: cn(
            'relative box-border min-w-[1em] border p-1 text-start align-top'
          ),
        },
      }),
      tableCell: TableCell.configure({
        HTMLAttributes: {
          class: cn(
            'relative box-border min-w-[1em] border p-1 text-start align-top'
          ),
        },
      }),
      tableHeader: TableHeader.configure({
        HTMLAttributes: {
          class: cn(
            'relative box-border min-w-[1em] border bg-secondary p-1 text-start align-top font-medium font-semibold text-muted-foreground'
          ),
        },
      }),
      slashCommand: SlashCommand.configure({
        suggestion: getSuggestion({ ai: true }),
      }),
    };

    // Merge with extraExtensions (allowing overrides)
    const extensionsDict = { ...defaultExtensionsDict, ...extraExtensions };
    
    // Filter out false values and return only valid extensions
    return Object.values(extensionsDict).filter(
      (ext): ext is AnyExtension => ext !== false
    );
  }, [extraExtensions, placeholder]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: allExtensions,
    content: initialContent,
    editorProps: {
      attributes: {
        class: "content-editor max-w-full focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        const currentContent = editor.getHTML();
        onChange(currentContent);
      }
      
      if (onTextEditorContentChange) {
        editor.commands.getMyContent((textEditorContent) => {
          onTextEditorContentChange(textEditorContent);
        });
      }
    },
    onCreate: ({ editor }: { editor: Editor }) => {
      if (onEditor) {
        onEditor(editor, { reason: "create" });
      }
    },
    onDestroy: () => {
      if (onEditor) {
        onEditor(null, { reason: "destroy" });
      }
    },
    editable,
  });

  if (!editor) return null;

  return (
    <div
      className={cn(
        "content-editor-wrapper",
        "relative max-h-[calc(100dvh-6rem)]  w-full overflow-hidden overflow-y-scroll border bg-card pb-[60px] sm:pb-0",
        className,
      )}
    >
      {toolbar && (
        <>
          <ToolbarRender editor={editor} toolbar={toolbar} />
        </>
      )}
      {editable && (
        <>
            {/* <FloatingToolbar editor={editor} />
            <TipTapFloatingMenu editor={editor} /> */}
          <DefaultBubbleMenu editor={editor} showAiTools={true} />
        </>
      )}
      {children}
      <EditorContent
        editor={editor}
        className="content-editor-content w-full min-w-full cursor-text sm:p-3"
      />
    </div>
  );
}

const ToolbarRender = memo(
  ({
    toolbar,
    editor,
  }: {
    toolbar: ContentEditorProps["toolbar"];
    editor: Editor;
  }) => {
    if (typeof toolbar === "function") {
      return toolbar({ editor });
    } else if (toolbar === true) {
      return <EditorToolbar editor={editor} />;
    }
    return toolbar;
  },
);
