"use client";

import { useProfile } from "@/components/contexts/profile-context";
import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { LiveClassStatusEnum, LiveClassTypeEnum } from "@workspace/common-logic/models/lms/live-class.types";
import { useToast } from "@workspace/components-library";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { format } from "date-fns";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

const LiveClassSchema = z.object({
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    type: z.nativeEnum(LiveClassTypeEnum),
    status: z.nativeEnum(LiveClassStatusEnum),
    scheduledStartTime: z.string().min(1),
    scheduledEndTime: z.string().min(1),
    meetingUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
    maxParticipants: z.number().min(1).optional(),
    allowRecording: z.boolean(),
    allowChat: z.boolean(),
    allowScreenShare: z.boolean(),
    allowParticipantVideo: z.boolean(),
});
type LiveClassFormDataType = z.infer<typeof LiveClassSchema>;

type LiveClassType = GeneralRouterOutputs["lmsModule"]["liveClass"]["getById"];

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const { toast } = useToast();
    const params = useParams<{ id: string }>();
    const trpcUtils = trpc.useUtils();
    const { profile } = useProfile();

    const liveClassQuery = trpc.lmsModule.liveClass.getById.useQuery({ id: params.id });
    const liveClass = liveClassQuery.data;

    const isAdmin = useMemo(() =>
        profile?.roles?.includes(UIConstants.roles.admin) || false,
        [profile?.roles]
    );

    const form = useForm<LiveClassFormDataType>({
        resolver: zodResolver(LiveClassSchema),
        values: liveClass ? {
            title: liveClass.title,
            description: liveClass.description || "",
            type: liveClass.type,
            status: liveClass.status,
            scheduledStartTime: liveClass.scheduledStartTime ? new Date(liveClass.scheduledStartTime).toISOString().slice(0, 16) : "",
            scheduledEndTime: liveClass.scheduledEndTime ? new Date(liveClass.scheduledEndTime).toISOString().slice(0, 16) : "",
            meetingUrl: liveClass.meetingUrl || "",
            maxParticipants: liveClass.maxParticipants,
            allowRecording: liveClass.allowRecording,
            allowChat: liveClass.allowChat,
            allowScreenShare: liveClass.allowScreenShare,
            allowParticipantVideo: liveClass.allowParticipantVideo,
        } : undefined,
    });

    const updateMutation = trpc.lmsModule.liveClass.update.useMutation({
        onSuccess: () => {
            toast({ title: t("common:dashboard.success"), description: "Live class updated successfully" });
            trpcUtils.lmsModule.liveClass.list.invalidate();
            liveClassQuery.refetch();
        },
        onError: (err) => {
            toast({ title: t("common:dashboard.error"), description: err.message, variant: "destructive" });
        },
    });

    const handleSubmit = useCallback(async (data: LiveClassFormDataType) => {
        const updateData = {
            title: data.title,
            description: data.description,
            type: data.type,
            status: data.status,
            scheduledStartTime: new Date(data.scheduledStartTime).toISOString(),
            scheduledEndTime: new Date(data.scheduledEndTime).toISOString(),
            allowRecording: data.allowRecording,
            allowChat: data.allowChat,
            allowScreenShare: data.allowScreenShare,
            allowParticipantVideo: data.allowParticipantVideo,
        };
        if (data.cohortId) updateData.cohortId = data.cohortId;
        if (data.meetingUrl) updateData.meetingUrl = data.meetingUrl;
        if (data.maxParticipants) updateData.maxParticipants = data.maxParticipants;

        await updateMutation.mutateAsync({ id: params.id, data: updateData });
    }, [updateMutation, params.id]);

    const searchCohorts = useCallback(async (search: string, offset: number, size: number): Promise<CohortItem[]> => {
        const result = await trpcUtils.lmsModule.cohortModule.cohort.list.fetch({
            pagination: { skip: offset, take: size },
            search: search ? { q: search } : undefined,
        });
        return result.items.map(cohort => ({ _id: cohort._id, title: cohort.title }));
    }, [trpcUtils]);

    const breadcrumbs = useMemo(() => [
        { label: t("common:dashboard.liveClasses.title"), href: "/dashboard/lms/live-classes" },
        { label: liveClass?.title || "Edit", href: "#" },
    ], [t, liveClass?.title]);

    const getStatusBadge = useCallback((status: LiveClassStatusEnum) => {
        const variants: Record<LiveClassStatusEnum, "default" | "secondary" | "destructive" | "outline"> = {
            [LiveClassStatusEnum.SCHEDULED]: "secondary",
            [LiveClassStatusEnum.LIVE]: "default",
            [LiveClassStatusEnum.ENDED]: "outline",
            [LiveClassStatusEnum.CANCELLED]: "destructive",
        };
        return <Badge variant={variants[status]}>{status}</Badge>;
    }, []);

    if (liveClassQuery.isLoading) {
        return (
            <DashboardContent breadcrumbs={breadcrumbs} permissions={[UIConstants.permissions.manageAnyCourse]}>
                <div className="flex items-center justify-center h-64">Loading...</div>
            </DashboardContent>
        );
    }

    if (!liveClass) {
        return (
            <DashboardContent breadcrumbs={breadcrumbs} permissions={[UIConstants.permissions.manageAnyCourse]}>
                <div className="flex flex-col items-center justify-center h-64">
                    <p className="text-lg">Live class not found</p>
                    <Link href="/dashboard/lms/live-classes">
                        <Button variant="link">Back to Live Classes</Button>
                    </Link>
                </div>
            </DashboardContent>
        );
    }

    return (
        <DashboardContent breadcrumbs={breadcrumbs} permissions={[UIConstants.permissions.manageAnyCourse]}>
            <div className="flex items-center gap-4">
                <Link href="/dashboard/lms/live-classes">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                </Link>
            </div>
            <HeaderTopbar
                header={{
                    title: liveClass.title,
                    subtitle: "Manage live class session details",
                }}
            />
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {getStatusBadge(liveClass.status)}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm font-medium capitalize">{liveClass.type.replace(/_/g, ' ')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Start Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm font-medium">
                            {liveClass.scheduledStartTime ? format(new Date(liveClass.scheduledStartTime), "MMM dd, HH:mm") : "-"}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Participants</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm font-medium">{liveClass.maxParticipants || "Unlimited"}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Session Settings</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FieldGroup>
                            <Controller
                                control={form.control}
                                name="title"
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel>Title</FieldLabel>
                                        <Input {...field} placeholder="Live class title" aria-invalid={fieldState.invalid} />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />
                            <Controller
                                control={form.control}
                                name="description"
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel>Description</FieldLabel>
                                        <Textarea {...field} placeholder="Session description" rows={3} aria-invalid={fieldState.invalid} />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Controller
                                    control={form.control}
                                    name="type"
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="type-select">Type</FieldLabel>
                                            <div>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger id="type-select" aria-invalid={fieldState.invalid}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value={LiveClassTypeEnum.LECTURE}>Lecture</SelectItem>
                                                        <SelectItem value={LiveClassTypeEnum.WORKSHOP}>Workshop</SelectItem>
                                                        <SelectItem value={LiveClassTypeEnum.Q_AND_A}>Q&A Session</SelectItem>
                                                        <SelectItem value={LiveClassTypeEnum.GROUP_DISCUSSION}>Group Discussion</SelectItem>
                                                        <SelectItem value={LiveClassTypeEnum.PRESENTATION}>Presentation</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {fieldState.invalid && (
                                                <FieldError errors={[fieldState.error]} />
                                            )}
                                        </Field>
                                    )}
                                />
                                <Controller
                                    control={form.control}
                                    name="status"
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="status-select">Status</FieldLabel>
                                            <div>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger id="status-select" aria-invalid={fieldState.invalid}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.values(LiveClassStatusEnum).map((status) => (
                                                            <SelectItem key={status} value={status}>{status}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {fieldState.invalid && (
                                                <FieldError errors={[fieldState.error]} />
                                            )}
                                        </Field>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Controller
                                    control={form.control}
                                    name="scheduledStartTime"
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel>Start Time</FieldLabel>
                                            <Input type="datetime-local" {...field} aria-invalid={fieldState.invalid} />
                                            {fieldState.invalid && (
                                                <FieldError errors={[fieldState.error]} />
                                            )}
                                        </Field>
                                    )}
                                />
                                <Controller
                                    control={form.control}
                                    name="scheduledEndTime"
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel>End Time</FieldLabel>
                                            <Input type="datetime-local" {...field} aria-invalid={fieldState.invalid} />
                                            {fieldState.invalid && (
                                                <FieldError errors={[fieldState.error]} />
                                            )}
                                        </Field>
                                    )}
                                />
                            </div>
                            <Controller
                                control={form.control}
                                name="meetingUrl"
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel>Meeting URL</FieldLabel>
                                        <Input {...field} placeholder="e.g., https://zoom.us/j/..." aria-invalid={fieldState.invalid} />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />
                            <Controller
                                control={form.control}
                                name="maxParticipants"
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel>Max Participants</FieldLabel>
                                        <Input
                                            type="number"
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                            value={field.value || ""}
                                            placeholder="Leave empty for unlimited"
                                            aria-invalid={fieldState.invalid}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />
                            <div className="space-y-3">
                                <FieldLabel>Session Permissions</FieldLabel>
                                <div className="grid grid-cols-2 gap-4">
                                    <Controller
                                        control={form.control}
                                        name="allowRecording"
                                        render={({ field }) => (
                                            <div className="flex items-center gap-2 space-y-0">
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} id="allowRecording" />
                                                <FieldLabel htmlFor="allowRecording" className="font-normal cursor-pointer">Allow Recording</FieldLabel>
                                            </div>
                                        )}
                                    />
                                    <Controller
                                        control={form.control}
                                        name="allowChat"
                                        render={({ field }) => (
                                            <div className="flex items-center gap-2 space-y-0">
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} id="allowChat" />
                                                <FieldLabel htmlFor="allowChat" className="font-normal cursor-pointer">Allow Chat</FieldLabel>
                                            </div>
                                        )}
                                    />
                                    <Controller
                                        control={form.control}
                                        name="allowScreenShare"
                                        render={({ field }) => (
                                            <div className="flex items-center gap-2 space-y-0">
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} id="allowScreenShare" />
                                                <FieldLabel htmlFor="allowScreenShare" className="font-normal cursor-pointer">Allow Screen Share</FieldLabel>
                                            </div>
                                        )}
                                    />
                                    <Controller
                                        control={form.control}
                                        name="allowParticipantVideo"
                                        render={({ field }) => (
                                            <div className="flex items-center gap-2 space-y-0">
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} id="allowParticipantVideo" />
                                                <FieldLabel htmlFor="allowParticipantVideo" className="font-normal cursor-pointer">Allow Participant Video</FieldLabel>
                                            </div>
                                        )}
                                    />
                                </div>
                            </div>
                            <Button type="submit" disabled={updateMutation.isPending || form.formState.isSubmitting}>
                                <Save className="h-4 w-4 mr-2" />
                                {updateMutation.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </DashboardContent>
    );
}

