import { authOptions } from "@/lib/auth/options";
import { ListInputSchema } from "@/server/api/core/schema";
import { ActivityModel } from "@workspace/common-logic/models/activity.model";
import { CourseModel } from "@workspace/common-logic/models/lms/course.model";
import { EnrollmentModel } from "@workspace/common-logic/models/lms/enrollment.model";
import { LessonModel } from "@workspace/common-logic/models/lms/lesson.model";
import { QuizModel } from "@workspace/common-logic/models/lms/quiz.model";
import { AttachmentModel } from "@workspace/common-logic/models/media.model";
import { DomainModel, OrganizationModel } from "@workspace/common-logic/models/organization.model";
import { UserModel } from "@workspace/common-logic/models/user.model";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActionContext as getDefaultActionContext } from "@/server/api/core/actions";
import { AuthorizationException } from "@/server/api/core/exceptions";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";

const MODEL_REGISTRY = {
    users: UserModel,
    courses: CourseModel,
    quizzes: QuizModel,
    attachments: AttachmentModel,
    lessons: LessonModel,
    organizations: OrganizationModel,
    domains: DomainModel,
    activities: ActivityModel,
    enrollments: EnrollmentModel,
} as const;

type ModelKey = keyof typeof MODEL_REGISTRY;

const GetParamsSchema = z.object({
    model: z.enum(Object.keys(MODEL_REGISTRY) as [ModelKey, ...ModelKey[]]),
    search: z.string().optional(),
    skip: z.coerce.number().min(0).default(0),
    take: z.coerce.number().min(1).max(100).default(50),
});

async function getActionContext(req: NextRequest) {
    const ctx = await getDefaultActionContext();
    if(!ctx.user.roles.includes(UIConstants.roles.admin)) {
        throw new AuthorizationException();
    }
    return ctx;
}

function buildQuery(model: string, context: any, listInput: z.infer<typeof ListInputSchema>) {
    const query: any = {
    };

    if (listInput.search?.q) {
        const searchFields = getSearchFields(model);
        query.$or = searchFields.map(field => ({
            [field]: { $regex: listInput.search!.q, $options: "i" }
        }));
    }

    if (listInput.filter) {
        Object.entries(listInput.filter).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                query[key] = value;
            }
        });
    }

    return query;
}

function getSearchFields(model: string): string[] {
    const fieldMap: Record<string, string[]> = {
        users: ["name", "email"],
        courses: ["title", "description"],
        quizzes: ["title", "description"],
        media: ["originalFileName", "caption"],
        assignments: ["title", "description"],
        lessons: ["title", "description"],
        domains: ["name"],
        activities: ["type"],
        apikeys: ["name"],
        pages: ["title", "description"],
        progress: [],
        memberships: [],
    };
    return fieldMap[model] || ["name", "title"];
}

export async function GET(req: NextRequest) {
    const context = await getActionContext(req);

    try {
        const { searchParams } = new URL(req.url);
        const params = GetParamsSchema.parse({
            model: searchParams.get("model"),
            search: searchParams.get("search"),
            skip: searchParams.get("skip"),
            take: searchParams.get("take"),
        });

        const listInput: z.infer<typeof ListInputSchema> = {
            search: params.search ? { q: params.search } : undefined,
            pagination: { skip: params.skip, take: params.take, includePaginationCount: true },
            orderBy: { field: "updatedAt", direction: "desc" }
        };

        const Model = MODEL_REGISTRY[params.model] as any;
        const query = buildQuery(params.model, context, listInput);

        const data = await Model.find(query)
            .sort({ [listInput.orderBy?.field || "updatedAt"]: listInput.orderBy?.direction === "asc" ? 1 : -1 })
            .skip(params.skip)
            .limit(params.take)
            .lean();

        const total = await Model.countDocuments(query);
        const hasMore = params.skip + params.take < total;

        return NextResponse.json({ data, total, hasMore });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid parameters", details: error.issues }, { status: 400 });
        }
        console.error("Studio GET error:", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}

const PostBodySchema = z.object({
    model: z.enum(Object.keys(MODEL_REGISTRY) as [ModelKey, ...ModelKey[]]),
    data: z.record(z.string(), z.any()),
});

export async function POST(req: NextRequest) {
    const context = await getActionContext(req);
    try {
        const body = PostBodySchema.parse(await req.json());
        const Model = MODEL_REGISTRY[body.model] as any;
        const recordData: any = { ...body.data, };

        const newRecord = new Model(recordData);
        const savedRecord = await newRecord.save();

        return NextResponse.json(savedRecord.toObject());
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
        }
        console.error("Studio POST error:", error);
        return NextResponse.json({ error: error.message || "Failed to create record" }, { status: 500 });
    }
}

const PutBodySchema = z.object({
    model: z.enum(Object.keys(MODEL_REGISTRY) as [ModelKey, ...ModelKey[]]),
    id: z.string(),
    data: z.record(z.string(), z.any()),
});

export async function PUT(req: NextRequest) {
    const context = await getActionContext(req);

    try {
        const body = PutBodySchema.parse(await req.json());
        const Model = MODEL_REGISTRY[body.model] as any;

        const updatedRecord = await Model.findOneAndUpdate(
            { _id: body.id, },
            body.data,
            { new: true }
        );

        if (!updatedRecord) {
            return NextResponse.json({ error: "Record not found" }, { status: 404 });
        }

        return NextResponse.json(updatedRecord.toObject());
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
        }
        console.error("Studio PUT error:", error);
        return NextResponse.json({ error: error.message || "Failed to update record" }, { status: 500 });
    }
}

const DeleteParamsSchema = z.object({
    model: z.enum(Object.keys(MODEL_REGISTRY) as [ModelKey, ...ModelKey[]]),
    id: z.string(),
});

export async function DELETE(req: NextRequest) {
    const context = await getActionContext(req);
    
    try {
        const { searchParams } = new URL(req.url);
        const params = DeleteParamsSchema.parse({
            model: searchParams.get("model"),
            id: searchParams.get("id"),
        });

        const Model = MODEL_REGISTRY[params.model] as any;
        const deletedRecord = await Model.findOneAndDelete({
            _id: params.id,
        });

        if (!deletedRecord) {
            return NextResponse.json({ error: "Record not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, id: params.id });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid parameters", details: error.issues }, { status: 400 });
        }
        console.error("Studio DELETE error:", error);
        return NextResponse.json({ error: error.message || "Failed to delete record" }, { status: 500 });
    }
}
