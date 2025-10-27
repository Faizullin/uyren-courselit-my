import { AssignmentProvider } from "../_components/assignment-context";

export default async function Layout({ 
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const assignmentId = (await params).id;
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

