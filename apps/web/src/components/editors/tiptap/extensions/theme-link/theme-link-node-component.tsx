import { trpc } from "@/utils/trpc";
import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import {
  NiceModal,
  NiceModalHocProps,
  FormDialog,
} from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Label } from "@workspace/ui/components/label";
import { Edit, Palette } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export interface ThemeLinkAttrs {
  label: string;
  obj: {
    id: string;
    name: string;
  } | null;
}

// Default themes list
const DEFAULT_THEMES = [
  { id: "default", name: "Default Theme" },
  { id: "dark", name: "Dark Theme" },
  { id: "light", name: "Light Theme" },
  { id: "colorful", name: "Colorful Theme" },
];

export function ThemeLinkNodeComponent({
  node,
  updateAttributes,
  editor,
}: NodeViewProps & {
  updateAttributes: (attrs: Partial<ThemeLinkAttrs>) => void;
}) {
  const { label, obj } = node.attrs as ThemeLinkAttrs;

  const handleSelectDialog = useCallback(() => {
    editor.commands.openThemeSelectDialog({
      obj: obj || null,
      onUpdate: updateAttributes,
    });
  }, [editor, obj, updateAttributes]);

  return (
    <NodeViewWrapper
      as="div"
      className="theme-card border rounded p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-purple-600" />
          <span className="font-medium">{label}</span>
        </div>
        {editor.isEditable ? (
          <Button
            type="button"
            onClick={handleSelectDialog}
            variant="ghost"
            size="icon"
          >
            <Edit className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </NodeViewWrapper>
  );
}

type ThemeSelectItemType = {
  id: string;
  name: string;
};

export const ThemeSelectNiceDialog = NiceModal.create<
  NiceModalHocProps & {
    args: {
      obj: ThemeLinkAttrs["obj"] | null;
    };
  },
  { reason: "cancel"; data: null } | { reason: "submit"; data: any }
>(({ args }) => {
  const { visible, hide, resolve } = NiceModal.useModal();

  const handleClose = () => {
    resolve({ reason: "cancel", data: null });
    hide();
  };

  const [selectedTheme, setSelectedTheme] = useState<string>(
    args.obj?.id || DEFAULT_THEMES[0]!.id
  );

  const trpcUtils = trpc.useUtils();

  const loadThemesQuery = trpc.lmsModule.themeModule.theme.list.useQuery(
    {
      pagination: { skip: 0, take: 50 },
      filter: { publicationStatus: undefined },
    },
    {
      enabled: visible,
    }
  );

  const availableThemes = [
    ...DEFAULT_THEMES,
    ...(loadThemesQuery.data?.items || []).map((theme) => ({
      id: theme._id,
      name: theme.name,
    })),
  ];

  const handleSubmit = useCallback(() => {
    const theme = availableThemes.find((t) => t.id === selectedTheme);
    if (theme) {
      resolve({
        reason: "submit",
        data: {
          id: theme.id,
          name: theme.name,
        },
      });
      hide();
    }
  }, [selectedTheme, availableThemes, resolve, hide]);

  useEffect(() => {
    if (args.obj) {
      setSelectedTheme(args.obj.id);
    }
  }, [args.obj]);

  const footer = (
    <>
      <Button onClick={handleClose} variant="outline">
        Cancel
      </Button>
      <Button onClick={handleSubmit} variant="default">
        Apply Theme
      </Button>
    </>
  );

  return (
    <FormDialog
      open={visible}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
      title="Select Theme"
      onSubmit={handleSubmit}
      onCancel={handleClose}
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="theme">Choose Theme</Label>
          <Select value={selectedTheme} onValueChange={setSelectedTheme}>
            <SelectTrigger id="theme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableThemes.map((theme) => (
                <SelectItem key={theme.id} value={theme.id}>
                  {theme.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loadThemesQuery.isLoading && (
          <p className="text-sm text-muted-foreground">Loading themes...</p>
        )}
      </div>
    </FormDialog>
  );
});

