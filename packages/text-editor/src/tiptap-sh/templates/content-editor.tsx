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
import { AnyExtension, Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ITextEditorContent } from "@workspace/common-logic/lib/text-editor-content";
import { cn } from "@workspace/ui/lib/utils";
import { useMemo } from "react";
import { TipTapFloatingMenu } from "../extensions/floating-menu";
import { FloatingToolbar } from "../extensions/floating-toolbar";
import { MediaViewExtension } from "../extensions/media-view";
import { MyContentExtension } from "../extensions/my-content";
import SearchAndReplace from "../extensions/search-and-replace";
import { EditorToolbar } from "../toolbars/editor-toolbar";

import "../styles/tiptap.css";
import { memo } from "react";

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
  extraExtensions?: AnyExtension[];
  toolbar?: boolean | ((props: { editor: Editor }) => React.ReactNode);
  children?: React.ReactNode;
};

export type ContentEditorRef = Editor;

export function ContentEditor({
  initialContent,
  onChange,
  onTextEditorContentChange,
  onEditor,
  placeholder,
  editable = true,
  className,
  extraExtensions = [],
  toolbar = true,
  children,
}: ContentEditorProps) {
  const allExtensions = useMemo(() => {
    const defaultExtensions = [
      StarterKit.configure({
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
      Placeholder.configure({
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
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyleKit,
      Subscript,
      Superscript,
      Underline,
      Link,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      MediaViewExtension,
      MyContentExtension,
      SearchAndReplace,
      Typography,
    ];
    return [...defaultExtensions, ...extraExtensions];
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
        const textEditorContent = editor.commands.getMyContent();
        onTextEditorContentChange(textEditorContent);
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
          <FloatingToolbar editor={editor} />
          <TipTapFloatingMenu editor={editor} />
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
