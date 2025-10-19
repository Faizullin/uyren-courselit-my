"use client";

import { Editor, isTextSelection } from "@tiptap/core";
import { BubbleMenu } from "@tiptap/react/menus";
import {
//   AiSelector,
//   MathSelector,
  NodeSelector,
  TextAlignSelector,
  TextButtons,
} from "./selectors";
import { ScrollArea, ScrollBar } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";

export const DefaultBubbleMenu = ({
  editor,
  showAiTools,
}: {
  editor: Editor | null;
  showAiTools?: boolean;
}) => {
  if (!editor) {
    return null;
  }

  return (
    <BubbleMenu
      editor={editor}
      options={{
        placement: "top",
        offset: 8,
      }}
      shouldShow={({ editor, state }) => {
        const { selection } = state;
        const { empty } = selection;

        if (!editor.isEditable) {
          return false;
        }

        if (empty) {
          return false;
        }

        if (!isTextSelection(selection)) {
          return false;
        }

        if (editor.isActive("codeBlock")) {
          return false;
        }

        return true;
      }}
    >
      <ScrollArea className="max-w-[90vw] rounded-md border bg-popover shadow-xl">
        <div className="flex h-9">
          {/* {showAiTools && (
            <>
              <AiSelector editor={editor} />
              <Separator orientation="vertical" />
            </>
          )} */}
          <NodeSelector editor={editor} />
          <Separator orientation="vertical" />
          {/* <MathSelector editor={editor} /> */}
          <Separator orientation="vertical" />
          <TextButtons editor={editor} />
          <Separator orientation="vertical" />
          <TextAlignSelector editor={editor} />
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </BubbleMenu>
  );
};