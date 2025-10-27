"use client";

import { FormMode } from "@/components/dashboard/layout/types";
import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
import { IAssignment } from "@workspace/common-logic/models/lms/assignment.types";
import {
  createContext,
  ReactNode,
  useContext,
  useState
} from "react";

type AssignmentType =
  GeneralRouterOutputs["lmsModule"]["assignmentModule"]["assignment"]["getById"];

const useLoadAssignmentDetailQuery = ({
  assignmentId,
  mode,
}: {
  assignmentId: string;
  mode: FormMode;
}) => {
  return trpc.lmsModule.assignmentModule.assignment.getById.useQuery({
    id: assignmentId,
  }, {
    enabled: mode === "edit" && !!assignmentId,
  });
};  

const useUpdateAssignmentMutation = () => {
  return trpc.lmsModule.assignmentModule.assignment.update.useMutation();
};

interface AssignmentContextType {
  initialData: IAssignment;
  mode: FormMode;
  loadDetailQuery: ReturnType<typeof useLoadAssignmentDetailQuery>;
  updateMutation: ReturnType<typeof useUpdateAssignmentMutation>;
}

const AssignmentContext = createContext<AssignmentContextType>({
  initialData: null as any,
  mode: "create",
  loadDetailQuery: (() => {
    throw new Error("loadDetailQuery is not implemented");
  }) as any,
  updateMutation: (() => {
    throw new Error("updateStatusMutation is not implemented");
  }) as any,
});

interface AssignmentProviderProps {
  children: ReactNode;
  initialData?: any;
  initialMode: FormMode;
}

export function AssignmentProvider({
  children,
  initialMode,
  initialData,
}: AssignmentProviderProps) {
  const [mode] = useState<FormMode>(initialMode);
  const loadDetailQuery = useLoadAssignmentDetailQuery({
    assignmentId: initialData?._id!,
    mode: mode, 
  });
  const updateMutation = useUpdateAssignmentMutation();
  return (
    <AssignmentContext.Provider
      value={{
        initialData,
        mode,
        loadDetailQuery,
        updateMutation,
      }}
    >
      {children}
    </AssignmentContext.Provider>
  );
}

export function useAssignmentContext() {
  const context = useContext(AssignmentContext);
  if (context === undefined) {
    throw new Error(
      "useAssignmentContext must be used within a AssignmentProvider",
    );
  }
  return context;
}
