import { AssignmentModel } from "@/models/lms"
import { connectToDatabase } from "@workspace/common-logic"
import AssignmentClientWrapper from "./_components/assignment-client-wrapper"

async function getAssignmentData(id: string) {
    if (id === "new") {
        return null
    }

    try {
        await connectToDatabase()
        const assignment = await AssignmentModel.findById(id).lean()
        return assignment ? JSON.parse(JSON.stringify({
            ...assignment,
        })) : null
    } catch (error) {
        console.error("Error fetching assignment:", error)
        return null
    }
}

export default async function EditAssignmentPage(props: {
    params: Promise<
        { id: string }
    >
}) {
    const params = await props.params;
    const assignmentId = params.id !== "new" ? params.id : null
    const initialMode = assignmentId !== null ? "edit" : "create"
    const initialAssignmentData = assignmentId ? await getAssignmentData(params.id) : null
    return (
        <AssignmentClientWrapper
            initialMode={initialMode}
            initialAssignmentData={initialAssignmentData}
        />
    )
}
