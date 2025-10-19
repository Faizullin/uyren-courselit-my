"use client";

import { Editor, Extension } from "@tiptap/core";
import { ITextEditorContent } from "@workspace/common-logic/lib/text-editor-content";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    myContent: {
      setMyContent: (content: ITextEditorContent) => ReturnType;
      getMyContent: () => ITextEditorContent;
    };
  }
}

declare module "@tiptap/core" {
  interface Storage {
    myContent: {
      assets: ITextEditorContent["assets"];
      widgets: ITextEditorContent["widgets"];
      config: ITextEditorContent["config"];
    };
  }
}

const extensionName = "myContent";

export const MyContentExtension = Extension.create<{}, {}>({
  name: extensionName,

  addStorage() {
    return {
      myContent: {
        assets: [],
        widgets: [],
        config: { editorType: "tiptap" },
      },
    };
  },

  addCommands() {
    const getAllAssetsFromEditor = (editor: Editor): ITextEditorContent["assets"] => {
      const assets: ITextEditorContent["assets"] = [];
      
      editor.state.doc.descendants((node) => {
        if (node.type.name === "mediaView" && node.attrs.asset) {
          assets.push(node.attrs.asset);
        }
      });

      return assets;
    };

    return {
      setMyContent:
        (textEditorContent: ITextEditorContent) =>
          ({ editor, commands }) => {
            // Set the HTML content
            commands.setContent(textEditorContent.content);
            
            // Store assets and widgets in editor storage for later retrieval
            editor.storage.myContent = {
              assets: textEditorContent.assets || [],
              widgets: textEditorContent.widgets || [],
              config: textEditorContent.config || { editorType: "tiptap" },
            };
            
            return true;
          },

      getMyContent:
        () =>
          ({ editor }: { editor: Editor }) => {
            const storage = editor.storage.myContent || {};
            const assets = getAllAssetsFromEditor(editor);
            
            return {
              type: "doc" as const,
              content: editor.getHTML(),
              assets: assets,
              widgets: storage.widgets || [],
              config: storage.config || { editorType: "tiptap" },
            } as ITextEditorContent;
          },

    };
  },

  // Initialize storage
  onCreate() {
    if (!this.editor.storage.myContent) {
      this.editor.storage.myContent = {
        assets: [],
        widgets: [],
        config: { editorType: "tiptap" },
      };
    }
  },
});
