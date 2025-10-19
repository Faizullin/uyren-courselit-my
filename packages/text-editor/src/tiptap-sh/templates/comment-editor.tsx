"use client";

import { Link } from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { AnyExtension, Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cn } from "@workspace/ui/lib/utils";
import { useMemo } from "react";

import "../styles/tiptap.css";

export type CommentEditorProps = {
  initialContent?: string;
  onChange?: (content: string) => void;
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
};

export type CommentEditorRef = Editor;

export function CommentEditor({
  initialContent,
  onChange,
  onEditor,
  placeholder,
  editable = true,
  className,
  extraExtensions = {},
}: CommentEditorProps) {
  const allExtensions = useMemo(() => {
    const defaultExtensionsDict: Record<string, AnyExtension | false> = {
      starterKit: StarterKit.configure({
        // Disable complex features for comments
        heading: false,
        horizontalRule: false,
        codeBlock: false,
        blockquote: false,
        orderedList: false,
        bulletList: false,
        // Disable complex features
        link: false,
        underline: false,
      }),
      placeholder: Placeholder.configure({
        emptyNodeClass: "is-editor-empty",
        placeholder: placeholder || "Write a comment...",
        includeChildren: false,
      }),
      link: Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
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
    editable,
    editorProps: {
      attributes: {
        class: "comment-editor max-w-full focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        const currentContent = editor.getHTML();
        onChange(currentContent);
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
  });

  if (!editor) return null;

  return (
    <div
      className={cn(
        "comment-editor-wrapper",
        "relative w-full border rounded-md bg-background transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className,
      )}
    >
      {/* Simple toolbar for basic formatting */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/50">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "p-2 rounded hover:bg-muted transition-colors",
            editor.isActive("bold") && "bg-muted",
          )}
          title="Bold"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 12h8a4 4 0 100-8H6v8zm0 0h8a4 4 0 110 8H6v-8z"
            />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "p-2 rounded hover:bg-muted transition-colors",
            editor.isActive("italic") && "bg-muted",
          )}
          title="Italic"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={cn(
            "p-2 rounded hover:bg-muted transition-colors",
            editor.isActive("strike") && "bg-muted",
          )}
          title="Strikethrough"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={cn(
            "p-2 rounded hover:bg-muted transition-colors",
            editor.isActive("code") && "bg-muted",
          )}
          title="Inline code"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        </button>
      </div>

      <EditorContent
        editor={editor}
        className="comment-editor-content w-full min-w-full cursor-text p-3 min-h-[100px] max-h-[300px] overflow-y-auto"
      />
    </div>
  );
}
