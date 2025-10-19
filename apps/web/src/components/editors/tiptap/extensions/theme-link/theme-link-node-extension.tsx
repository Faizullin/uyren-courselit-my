import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import {
  ThemeLinkAttrs,
  ThemeLinkNodeComponent,
  ThemeSelectNiceDialog,
} from "./theme-link-node-component";
import { NiceModal } from "@workspace/components-library";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    themeLink: {
      insertThemeLink: (attrs: ThemeLinkAttrs) => ReturnType;
      openThemeSelectDialog: (props: {
        obj?: ThemeLinkAttrs["obj"];
        onUpdate?: (attrs: Partial<ThemeLinkAttrs>) => void;
      }) => ReturnType;
    };
  }
}

export const ThemeLinkNodeExtension = Node.create({
  name: "themeLink",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      label: {
        default: "Theme: Default",
      },
      obj: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "theme-link",
        getAttrs: (node) => {
          if (typeof node === "string") return {};
          const element = node as HTMLElement;
          try {
            const label = element.getAttribute("data-label") || "Theme: Default";
            const objRaw = element.getAttribute("data-obj");

            let obj = {
              id: "default",
              name: "Default Theme",
            };

            if (objRaw && objRaw !== "null") {
              try {
                obj = JSON.parse(objRaw);
              } catch (err) {
                console.error("Invalid obj JSON:", objRaw, err);
              }
            }

            return { label, obj };
          } catch (err) {
            console.error("Failed to parse theme-link attributes:", err);
            return {};
          }
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { label, obj } = HTMLAttributes;
    const safeObj =
      obj && typeof obj === "object" ? JSON.stringify(obj) : "null";

    return [
      "theme-link",
      mergeAttributes({
        "data-label": label || "Theme: Default",
        "data-obj": safeObj,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ThemeLinkNodeComponent);
  },

  addCommands() {
    return {
      insertThemeLink:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: "themeLink",
            attrs,
          });
        },
      openThemeSelectDialog:
        ({ obj, onUpdate }) =>
        ({ editor }) => {
          NiceModal.show(ThemeSelectNiceDialog, {
            args: {
              obj: obj || null,
            },
          }).then((response) => {
            if (response.reason === "submit" && response.data) {
              const selectedTheme = response.data;

              const attrs = {
                obj: {
                  id: selectedTheme.id,
                  name: selectedTheme.name,
                },
                label: `Theme: ${selectedTheme.name}`,
              };

              if (onUpdate) {
                onUpdate(attrs);
              } else {
                editor.commands.insertThemeLink(attrs);
              }
            }
          });
          return true;
        },
    };
  },
});

