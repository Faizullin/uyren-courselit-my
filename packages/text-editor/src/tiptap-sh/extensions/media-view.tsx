"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MediaViewComponent } from "../components/media-view-component";
import { ITextEditorContent } from "@workspace/common-logic/lib/text-editor-content";

export interface MediaViewOptions {
  HTMLAttributes: Record<string, any>;
}

type AssetType = ITextEditorContent["assets"][number];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mediaView: {
      setMediaView: (asset: AssetType) => ReturnType;
      updateMediaView: (assetId: string, updates: Partial<AssetType>) => ReturnType;
      removeMediaView: (assetId: string) => ReturnType;
      openMediaSelectDialog: (props: { fileType: string }) => ReturnType;
    };
  }
}


declare module "@tiptap/core" {
  interface Storage {
    mediaView: {
      lesson: {
        _id: string;
        courseId: string;
      }
    };
  }
}


const extensionName = "mediaView";

export const MediaViewExtension = Node.create<MediaViewOptions>({
  name: extensionName,
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      assetId: {
        default: null as string | null,
      },
      asset: {
        default: null as AssetType | null,
      },
      display: {
        default: {
          width: "100%",
          height: null,
          align: "center" as "left" | "center" | "right",
          aspectRatio: null as number | null,
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[data-type="${extensionName}"]`,
        getAttrs: (node) => {
          if (typeof node === "string") return {};

          const element = node as HTMLElement;

          try {
            const assetId = element.getAttribute("data-asset-id");
            const assetRaw = element.getAttribute("data-asset");
            const displayRaw = element.getAttribute("data-display");

            let asset: AssetType | null = null;
            let display = {
              width: element.getAttribute("data-width") || "100%",
              height: element.getAttribute("data-height"),
              align:
                (element.getAttribute("data-align") as
                  | "left"
                  | "center"
                  | "right") || "center",
              aspectRatio:
                parseFloat(element.getAttribute("data-aspect-ratio") || "0") ||
                null,
            };

            if (assetRaw && assetRaw !== "null") {
              try {
                asset = JSON.parse(assetRaw);
              } catch (err) {
                console.warn("Invalid asset JSON:", assetRaw, err);
              }
            }

            if (displayRaw && displayRaw !== "null") {
              try {
                const parsedDisplay = JSON.parse(displayRaw);
                display = { ...display, ...parsedDisplay };
              } catch (err) {
                console.warn("Invalid display JSON:", displayRaw, err);
              }
            }

            return { assetId, asset, display };
          } catch (err) {
            console.error("Failed to parse mediaView attributes:", err);
            return {};
          }
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { assetId, asset, display } = HTMLAttributes;

    const safeAssetId = assetId || "null";
    const safeAsset =
      asset && typeof asset === "object" ? JSON.stringify(asset) : "null";
    const safeDisplay =
      display && typeof display === "object" ? JSON.stringify(display) : "null";

    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, {
        "data-type": extensionName,
        "data-asset-id": safeAssetId,
        "data-asset": safeAsset,
        "data-display": safeDisplay,
        "data-width": display?.width || "100%",
        "data-height": display?.height ?? "",
        "data-align": display?.align || "center",
        "data-aspect-ratio": display?.aspectRatio ?? "",
      }),
    ];
  },

  addNodeView() {
    console.log("[addNodeView]");
    return ReactNodeViewRenderer(MediaViewComponent);
  },

  addCommands() {
    return {
      setMediaView:
        (asset: AssetType) =>
          ({ commands }) => {
            const assetId = asset.media?.mediaId || `asset_${Date.now()}`;
            return commands.insertContent({
              type: extensionName,
              attrs: {
                assetId,
                asset: asset,
                display: {
                  width: "100%",
                  height: null,
                  align: "center" as "left" | "center" | "right",
                  aspectRatio: null as number | null,
                },
              },
            });
          },

      updateMediaView:
        (assetId: string, updates: Partial<AssetType>) =>
          ({ commands }) => {
            return commands.updateAttributes(extensionName, {
              asset: updates,
            });
          },

      removeMediaView:
        (assetId: string) =>
          ({ commands }) => {
            return commands.deleteNode(extensionName);
          },

      openMediaSelectDialog:
        (props: { fileType: string }) =>
          ({ editor }) => {
            throw new Error("openMediaSelectDialog not implemented. Override this extension to provide custom implementation.");
          },
    };
  },
});
