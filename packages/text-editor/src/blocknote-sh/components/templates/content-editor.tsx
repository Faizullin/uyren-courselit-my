"use client";

import React, { useEffect } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import type { BlockNoteEditor } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/mantine/style.css";
import "@blocknote/core/fonts/inter.css";
import { cn } from "@workspace/ui/lib/utils";

export type ContentEditorProps = {
  initialContent?: string;
  onChange?: (content: string) => void;
  onEditor?: (
    editor: BlockNoteEditor | null,
    meta: { reason: "create" | "destroy" },
  ) => void;
  editable?: boolean;
  className?: ReturnType<typeof cn>;
  extraExtensions?: any[];
  toolbar?: boolean | ((props: { editor: BlockNoteEditor }) => React.ReactNode);
  children?: React.ReactNode;
};

export function ContentEditor({
  initialContent,
  onChange,
  onEditor,
  editable = true,
  className,
  // Placeholder props for API parity; not wired yet
  extraExtensions: _extraExtensions = [],
  toolbar: _toolbar = true,
  children,
}: ContentEditorProps) {
  const editor = useCreateBlockNote();

  useEffect(() => {
    if (onEditor) onEditor(editor as any, { reason: "create" });
    return () => {
      if (onEditor) onEditor(null, { reason: "destroy" });
    };
  }, [editor, onEditor]);

  return (
    <div
      className={cn(
        "content-editor-wrapper",
        "relative max-h-[calc(100dvh-6rem)]  w-full overflow-hidden overflow-y-scroll border bg-card pb-[60px] sm:pb-0",
        className,
      )}
    >
      {children}
      <BlockNoteView
        editor={editor}
        editable={editable}
        onChange={() => {
          try {
            const json = JSON.stringify(editor.topLevelBlocks);
            onChange?.(json);
          } catch {
            // noop
          }
        }}
      />
    </div>
  );
}