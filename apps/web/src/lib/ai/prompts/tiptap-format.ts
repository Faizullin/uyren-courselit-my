export type TipTapExtension = {
  name: string;
  description: string;
  usage: string;
};

export const tiptapExtensions: TipTapExtension[] = [
  {
    name: "Headings",
    description: "Section headings (h1-h6)",
    usage: "Use # for h1, ## for h2, ### for h3, etc."
  },
  {
    name: "Paragraph",
    description: "Regular text paragraphs",
    usage: "Write normal text, separate paragraphs with blank lines"
  },
  {
    name: "Bold",
    description: "Bold text for emphasis",
    usage: "Use **text** for bold"
  },
  {
    name: "Italic",
    description: "Italic text for emphasis",
    usage: "Use *text* for italics"
  },
  {
    name: "Code",
    description: "Inline code",
    usage: "Use `code` for inline code"
  },
  {
    name: "Code Block",
    description: "Multi-line code blocks",
    usage: "Use ```language\\ncode\\n``` for code blocks"
  },
  {
    name: "Bullet List",
    description: "Unordered lists",
    usage: "Use - or * for bullet points"
  },
  {
    name: "Ordered List",
    description: "Numbered lists",
    usage: "Use 1. 2. 3. for numbered lists"
  },
  {
    name: "Blockquote",
    description: "Highlighted quotes or callouts",
    usage: "Use > for blockquotes (important tips, warnings)"
  },
  {
    name: "Link",
    description: "Hyperlinks",
    usage: "Use [text](url) for links"
  },
  {
    name: "Horizontal Rule",
    description: "Section dividers",
    usage: "Use --- or *** for horizontal rules"
  },
];

export function buildTipTapFormatInstructions(options?: {
  includeExtensions?: string[];
  excludeExtensions?: string[];
}): string {
  let extensions = tiptapExtensions;

  if (options?.includeExtensions) {
    extensions = extensions.filter(ext => 
      options.includeExtensions!.includes(ext.name)
    );
  }

  if (options?.excludeExtensions) {
    extensions = extensions.filter(ext => 
      !options.excludeExtensions!.includes(ext.name)
    );
  }

  return `**Format with TipTap-compatible markdown:**
${extensions.map(ext => `- **${ext.name}**: ${ext.usage}`).join('\n')}`;
}

