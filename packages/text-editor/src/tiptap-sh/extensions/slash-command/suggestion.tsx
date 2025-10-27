import { computePosition, flip, shift } from "@floating-ui/dom";
import { Editor, posToDOMRect, ReactRenderer } from "@tiptap/react";
import { SuggestionOptions } from "@tiptap/suggestion";
import {
  CodeIcon,
  CommandIcon,
  DivideIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  LetterTextIcon,
  ListIcon,
  ListOrderedIcon,
  SparklesIcon,
  SquarePlayIcon,
  TableIcon,
  TextQuoteIcon,
} from "lucide-react";
import { SlashCommandNodeAttrs } from "./slash-command";
import SuggestionList, {
  CommandSuggestionItem,
  SuggestionListHandle,
  SuggestionListProps,
} from "./suggestion-list";

type SuggestionType = Omit<
  SuggestionOptions<CommandSuggestionItem, SlashCommandNodeAttrs>,
  "editor"
>;

const list: CommandSuggestionItem[] = [
  {
    title: "Text",
    description: "Just start typing with plain text.",
    keywords: ["p", "paragraph"],
    icon: LetterTextIcon,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleNode("paragraph", "paragraph")
        .run();
    },
  },
  {
    title: "Heading 1",
    description: "Big section heading.",
    keywords: ["title", "big", "large", "heading"],
    icon: Heading1Icon,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 1 })
        .run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading.",
    keywords: ["subtitle", "medium", "heading"],
    icon: Heading2Icon,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 2 })
        .run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading.",
    keywords: ["subtitle", "small", "heading"],
    icon: Heading3Icon,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 3 })
        .run();
    },
  },
  {
    title: "Bullet List",
    description: "Create a simple bullet list.",
    keywords: ["unordered", "list", "bullet"],
    icon: ListIcon,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Create a list with numbering.",
    keywords: ["ordered", "list"],
    icon: ListOrderedIcon,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Quote",
    description: "Capture a quote.",
    keywords: ["blockquote"],
    icon: TextQuoteIcon,
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleNode("paragraph", "paragraph")
        .toggleBlockquote()
        .run(),
  },
  {
    title: "Code",
    description: "Capture a code snippet.",
    keywords: ["codeblock"],
    icon: CodeIcon,
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleCodeBlock({ language: "plaintext" })
        .run(),
  },
//   {
//     title: "Table",
//     description: "Capture a table.",
//     keywords: ["table"],
//     icon: TableIcon,
//     command: ({ editor, range }) =>
//       editor.chain().focus().deleteRange(range).insertTable().run(),
//   },
  {
    title: "Youtube",
    description: "Embed a Youtube video.",
    keywords: ["youtube"],
    icon: SquarePlayIcon,
    command: ({ editor, range }) => {
      const videoLink = prompt("Please enter Youtube Video Link");
      //From https://regexr.com/3dj5t
      const ytregex = new RegExp(
        /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/
      );

      if (videoLink && ytregex.test(videoLink)) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setYoutubeVideo({
            src: videoLink,
          })
          .run();
      } else {
        if (videoLink !== null) {
          alert("Please enter a correct Youtube Video Link");
        }
      }
    },
  },
  {
    title: "Divider",
    description: "Create a horizontal divider.",
    keywords: ["divider"],
    icon: DivideIcon,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: 'Table',
    description: 'Add a table view to organize data.',
    keywords: ['table'],
    icon: TableIcon,
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
];

const withAiList: CommandSuggestionItem[] = [
//   {
//     title: "AI Writer",
//     description: "Ask AI with custom prompt.",
//     keywords: ["ai"],
//     icon: SparklesIcon,
//     command: ({ editor, range }) => {
//       editor.chain().focus().deleteRange(range).setAiWriter().run();
//     },
//   },
  ...list,
];

const updatePosition = (editor: Editor, element: Element) => {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  const virtualElement = {
    getBoundingClientRect: () => {
      return posToDOMRect(
        editor.view,
        editor.state.selection.from,
        editor.state.selection.to
      );
    },
  };

  computePosition(virtualElement, element, {
    placement: "bottom-start",
    strategy: "absolute",
    middleware: [shift(), flip()],
  }).then(({ x, y, strategy }) => {
    element.style.width = "max-content";
    element.style.position = strategy;
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
  });
};

const getSuggestion = ({ 
  ai, 
  customItems,
  overrideItems,
}: { 
  ai?: boolean; 
  customItems?: CommandSuggestionItem[];
  overrideItems?: Record<string, CommandSuggestionItem>;
}): SuggestionType => {
  return {
    items: ({ query }) => {
      const filterFun = (item: CommandSuggestionItem) => {
        return item.keywords.some((k) => k.startsWith(query.toLowerCase()));
      };

      let baseItems = ai ? withAiList : list;
      
      if (overrideItems) {
        const itemsMap = new Map(baseItems.map(item => [item.title.toLowerCase(), item]));
        Object.entries(overrideItems).forEach(([key, value]) => {
          itemsMap.set(key.toLowerCase(), value);
        });
        baseItems = Array.from(itemsMap.values());
      }
      
      if (customItems) {
        baseItems = [...baseItems, ...customItems];
      }
      
      const ret = baseItems.filter(filterFun);
      return ret;
    },
    render: () => {
      let component: ReactRenderer<SuggestionListHandle, SuggestionListProps>;
      // let popup: Instance | undefined;

      return {
        onStart: (props) => {
          component = new ReactRenderer(SuggestionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          if (component.element instanceof HTMLElement) {
            component.element.style.position = "absolute";

            document.body.appendChild(component.element);

            updatePosition(props.editor, component.element);
          }
        },

        onUpdate(props) {
          component.updateProps(props);

          if (!props.clientRect) {
            return;
          }

          updatePosition(props.editor, component.element);

          // popup?.setProps({
          //   // @ts-expect-error temporary
          //   getReferenceClientRect: props.clientRect,
          // });
        },

        onKeyDown(props) {
          if (props.event.key === "Escape") {
            // popup?.hide();
            //component.destroy();

            return true;
          }

          return component.ref?.onKeyDown(props) ?? false;
        },

        onExit() {
          // popup?.destroy();
          component?.element.remove();
          component?.destroy();
        },
      };
    },
  };
};

export { getSuggestion, list as defaultSlashCommands, withAiList as defaultSlashCommandsWithAi };