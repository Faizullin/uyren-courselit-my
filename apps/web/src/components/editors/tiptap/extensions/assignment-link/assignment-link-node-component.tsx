import { trpc } from "@/utils/trpc";
import { NodeViewProps, NodeViewWrapper, useCurrentEditor } from "@tiptap/react";
import {
  ComboBox2,
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
import { Edit } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AssignmentLinkSubmitForm } from "./assignment-link-submit-form";

export interface AssignmentLinkAttrs {
  label: string;
  obj: {
    type: "quiz" | "assignment";
    id: string;
    title: string;
  } | null;
}

export function AssignmentLinkNodeComponent({
  node,
  updateAttributes,
  editor,
}: NodeViewProps & {
  updateAttributes: (attrs: Partial<AssignmentLinkAttrs>) => void;
}) {
  const { label, obj } = node.attrs as AssignmentLinkAttrs;
  const handleSelectDialog = useCallback(() => {
    editor.commands.openAssignmentSelectDialog({
      type: obj?.type || "all",
      obj: obj || null,
      onUpdate: updateAttributes,
    });
  }, [editor, obj, updateAttributes]);
  const acutalLink = useMemo(() => {
    if (!obj) return "#";
    else if (obj.type === "assignment") {
      return `/dashboard/student/assignments/${obj.id}`;
    } else if (obj.type === "quiz") {
      return `/quiz/${obj.id}`;
    }
    return `#unknown-type=${obj.type}`;
  }, [obj]);

  const useSubmissionForm = !editor.isEditable;
  return (
    <NodeViewWrapper
      as="div"
      className="entity-card"
    >
      {/* {
        useSubmissionForm && obj?.type === "assignment" ? (
          <AssignmentLinkSubmitForm creds={{
            _id: obj.id,
            title: obj.title,
          }} />
        ) : (
          <div className="border rounded p-3 bg-background shadow flex items-center justify-between">
            <Link href={acutalLink} target="_blank">
              {label}
            </Link>
            {editor.isEditable ? (
              <Button
                type="button"
                onClick={handleSelectDialog}
                variant="ghost"
                size="icon"
              >
                <Edit />
              </Button>
            ) : null}
          </div>
        )
      } */}
      <div className="border rounded p-3 bg-background shadow flex items-center justify-between">
          <Link href={acutalLink} target="_blank">
            {label}
          </Link>
          {editor.isEditable ? (
            <Button
              type="button"
              onClick={handleSelectDialog}
              variant="ghost"
              size="icon"
            >
              <Edit />
            </Button>
          ) : null}
        </div>
    </NodeViewWrapper>
  );
}

type SelectItemType = {
  key: string;
  title: string;
  type: "quiz" | "assignment";
};

export const AssignmentSelectNiceDialog = NiceModal.create<
  NiceModalHocProps & { args: { 
    obj: AssignmentLinkAttrs["obj"] | null;
    courseId: string;
    initialType: "quiz" | "assignment" | "all";
   };
  },
  { reason: "cancel"; data: null } | { reason: "submit"; data: any }
>(({ args }) => {
  const { visible, hide, resolve } = NiceModal.useModal();

  const handleClose = () => {
    resolve({ reason: "cancel", data: null });
    hide();
  };

  const [selectedOptions, setSelectedOptions] = useState<SelectItemType | null>(
    null,
  );
  const [typeFilter, setTypeFilter] = useState<"quiz" | "assignment" | "all">(args.initialType || "all");

  const updateTags = (options: SelectItemType) => {
    setSelectedOptions(options);
  };

  const trpcUtils = trpc.useUtils();
  const getAssignments = useCallback(async (search: string) => {
    const response =
      await trpcUtils.lmsModule.courseModule.lesson.searchAssignmentEntities.fetch(
        {
          search: {
            q: search,
          },
          filter: {
            courseId: args.courseId,
            type: typeFilter === "all" ? undefined : typeFilter,
          },
          pagination: {
            skip: 0,
            take: 10,
          }
        },
      );
    return response.items.map((item) => ({
      key: item._id,
      title: item.title,
      type: item.type,
    }));
  }, [args.courseId, typeFilter]);

  const handleSubmit = useCallback(() => {
    resolve({ reason: "submit", data: selectedOptions });
    hide();
  }, [selectedOptions, resolve, hide]);

  useEffect(() => {
    setSelectedOptions(
      args.obj
        ? {
          key: args.obj.id,
          title: args.obj.title,
          type: args.obj.type,
        }
        : null,
    );
  }, [args.obj]);

  useEffect(() => {
    setTypeFilter(args.initialType);
  }, [args.initialType]);

  return (
    <FormDialog
      open={visible}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
      title="Select"
      onSubmit={handleSubmit}
      onCancel={handleClose}
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val as "quiz" | "assignment" | "all")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="assignment">Assignment</SelectItem>
              <SelectItem value="quiz">Quiz</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Select Item</Label>
          <ComboBox2<SelectItemType>
            title="Search..."
            valueKey="key"
            value={selectedOptions || undefined}
            searchFn={getAssignments}
            renderLabel={(item) => `${item.title} (${item.type})`}
            onChange={updateTags}
            multiple={false}
            showCreateButton={true}
            showEditButton={true}
            onCreateClick={() => {
              if(typeFilter === "assignment") {
                window.open("/dashboard/lms/assignments/new", "_blank");
              } else if (typeFilter === "quiz") {
                window.open("/dashboard/lms/quizzes/new", "_blank");
              } else {
                alert("Please select a valid type");
              }
            }}
            onEditClick={(item) => {
              if (item.type === "assignment") {
                window.open(`/dashboard/lms/assignments/${item.key}`, "_blank");
              } else if (item.type === "quiz") {
                window.open(`/dashboard/lms/quizzes/${item.key}`, "_blank");
              }
            }}
          />
        </div>
      </div>
    </FormDialog>
  );
});
