import DocumentationLink from "@/components/public/documentation-link";
import {
  PERM_SECTION_HEADER,
  TOAST_TITLE_ERROR,
  USER_PERMISSION_AREA_SUBTEXT,
} from "@/lib/ui/config/strings";
import { trpc } from "@/utils/trpc";
import type { User } from "@workspace/common-models";
import { Checkbox, Section, useToast } from "@workspace/components-library";
import { useEffect, useState } from "react";
import permissionToCaptionMap from "./permissions-to-caption-map";

interface PermissionsEditorProps {
  user: User;
}

function PermissionsEditor({ user }: PermissionsEditorProps) {
  const [activePermissions, setActivePermissions] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setActivePermissions(user.permissions);
  }, [user]);

  const updateUserMutation = trpc.userModule.user.update.useMutation();

  const savePermissions = async (permission: string, value: boolean) => {
    let newPermissions: string[];
    if (value) {
      newPermissions = [...activePermissions, permission];
    } else {
      newPermissions = activePermissions.filter((item) => item !== permission);
    }
    try {
      const response = await updateUserMutation.mutateAsync({
        userId: user.userId,
        data: {
          permissions: newPermissions.map((item) => `${item}`),
        },
      });
      if (response) {
        setActivePermissions(response.permissions);
      }
    } catch (err: any) {
      toast({
        title: TOAST_TITLE_ERROR,
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const networkAction = updateUserMutation.isPending;

  return (
    <Section
      className="md:w-1/2"
      header={PERM_SECTION_HEADER}
      subtext={
        <span>
          {USER_PERMISSION_AREA_SUBTEXT}{" "}
          <DocumentationLink path="/en/users/permissions/" />.
        </span>
      }
    >
      {Object.keys(permissionToCaptionMap).map((permission) => (
        <div className="flex justify-between" key={permission}>
          <p>{permissionToCaptionMap[permission]}</p>
          <Checkbox
            disabled={networkAction}
            checked={activePermissions.includes(permission)}
            onChange={(value: boolean) => savePermissions(permission, value)}
          />
        </div>
      ))}
    </Section>
  );
}

export default PermissionsEditor;
