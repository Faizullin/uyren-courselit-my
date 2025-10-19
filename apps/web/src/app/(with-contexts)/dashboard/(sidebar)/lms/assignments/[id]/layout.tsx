"use client";

import { AssignmentProvider } from "../_components/assignment-context";
import { useParams } from "next/navigation";

export default function AssignmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const assignmentId = params.id;
  const initialMode = assignmentId === "new" ? "create" : "edit";

  return (
    <AssignmentProvider
      initialMode={initialMode}
      initialData={assignmentId !== "new" ? { _id: assignmentId } : null}
    >
      {children}
    </AssignmentProvider>
  );
}

