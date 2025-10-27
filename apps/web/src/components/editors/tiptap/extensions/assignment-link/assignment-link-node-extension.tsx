import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import {
  AssignmentLinkAttrs,
  AssignmentLinkNodeComponent,
  AssignmentSelectNiceDialog,
} from "./assignment-link-node-component";
import { NiceModal } from "@workspace/components-library";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    assignmentLink: {
      insertAssignmentLink: (attrs: AssignmentLinkAttrs) => ReturnType;
      openAssignmentSelectDialog: (props: { 
        type?: "assignment" | "quiz" | "all";
        obj?: AssignmentLinkAttrs["obj"];
        onUpdate?: (attrs: Partial<AssignmentLinkAttrs>) => void;
      }) => ReturnType;
    };
  }
}

declare module "@tiptap/core" {
  interface Storage {
    assignmentLink: {
      lesson: {
        _id: string;
        courseId: string;
      };
    };
  }
}

export const AssignmentLinkNodeExtension = Node.create({
  name: "assignmentLink",
  group: "block",
  atom: true, // self-contained

  addAttributes() {
    return {
      label: {
        default: "Assignment",
      },
      obj: {
        default: null,
      },
      link: {
        default: "#",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "assignment-link",
        getAttrs: (node) => {
          if (typeof node === "string") return {};
          const element = node as HTMLElement;
          try {
            const label = element.getAttribute("data-label") || "Assignment";
            const objRaw = element.getAttribute("data-obj");
            const link = element.getAttribute("data-link") || "#";

            let obj = {
              type: "assignment",
              id: "",
              title: "Sample Assignment",
            };

            if (objRaw && objRaw !== "null") {
              try {
                obj = JSON.parse(objRaw);
              } catch (err) {
                console.error("Invalid obj JSON:", objRaw, err);
              }
            }

            const result = { label, obj, link };
            return result;
          } catch (err) {
            console.error("Failed to parse assignment-link attributes:", err);
            return {};
          }
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { label, obj, link } = HTMLAttributes;
    const safeObj =
      obj && typeof obj === "object" ? JSON.stringify(obj) : "null";

    return [
      "assignment-link",
      mergeAttributes({
        "data-label": label || "Assignment",
        "data-obj": safeObj,
        "data-link": link || "#",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AssignmentLinkNodeComponent);
  },

  addCommands() {
    return {
      insertAssignmentLink:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: "assignmentLink",
            attrs,
          });
        },
      openAssignmentSelectDialog:
        ({ type, obj, onUpdate }) =>
        ({ editor }) => {
          const storage = editor.storage.assignmentLink;
          NiceModal.show(AssignmentSelectNiceDialog, {
            args: {
              obj: obj || null,
              courseId: storage.lesson.courseId,
              initialType: type || obj?.type || "all",
            },
          }).then((response) => {
            if (response.reason === "submit" && response.data) {
              const selectedItem = response.data;
              let link = "";
              if (selectedItem.type === "assignment") {
                link = `/assignments/${selectedItem.key}`;
              } else if (selectedItem.type === "quiz") {
                link = `/quiz/${selectedItem.key}`;
              }
              
              const attrs = {
                obj: {
                  type: selectedItem.type,
                  id: selectedItem.key,
                  title: selectedItem.title,
                },
                label: `${selectedItem.title} (${selectedItem.type})`,
                link: link,
              };

              if (onUpdate) {
                onUpdate(attrs);
              } else {
                editor.commands.insertAssignmentLink(attrs);
              }
            }
          });
          return true;
        },
    };
  },
});
