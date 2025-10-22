"use client";

import { useProfile } from "@/components/contexts/profile-context";
import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { CohortStatusEnum } from "@workspace/common-logic/models/lms/cohort.types";
import { ComboBox2, useToast } from "@workspace/components-library";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { slugify } from "@workspace/utils";
import { format } from "date-fns";
import { Calendar, Save, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { CohortScheduleEditDialog } from "./_components/cohort-schedule-edit-dialog";
import { useDialogControl } from "@workspace/components-library";

const CohortSchema = z.object({
    title: z.string().min(1).max(255),
    courseId: z.string().min(1, "Course is required"),
    instructorId: z.string().optional(),
    description: z.string().optional(),
    inviteCode: z.string().min(6).max(50),
    status: z.nativeEnum(CohortStatusEnum),
    beginDate: z.string().optional(),
    endDate: z.string().optional(),
    durationInWeeks: z.number().min(1).optional(),
    maxCapacity: z.number().min(1).optional(),
});
type CohortFormDataType = z.infer<typeof CohortSchema>;

type CohortType = GeneralRouterOutputs["lmsModule"]["cohortModule"]["cohort"]["getById"];

type CourseItem = {
    _id: string;
    title: string;
};

type InstructorItem = {
    _id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
};

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const { toast } = useToast();
    const params = useParams<{ id: string }>();
    const cohortId = params.id;
    const trpcUtils = trpc.useUtils();
    const { profile } = useProfile();

    const cohortQuery = trpc.lmsModule.cohortModule.cohort.getById.useQuery({ id: params.id }, {
        enabled: !!params.id,
    });
    const cohort = cohortQuery.data;

    const isAdmin = useMemo(() =>
        profile?.roles?.includes(UIConstants.roles.admin) || false,
        [profile?.roles]
    );

    const form = useForm<CohortFormDataType>({
        resolver: zodResolver(CohortSchema),
        values: cohort ? {
            title: cohort.title,
            courseId: String(cohort.courseId),
            instructorId: cohort.instructorId ? String(cohort.instructorId) : "",
            description: cohort.description || "",
            inviteCode: cohort.inviteCode || "",
            status: cohort.status,
            beginDate: cohort.beginDate ? new Date(cohort.beginDate).toISOString().split('T')[0] : "",
            endDate: cohort.endDate ? new Date(cohort.endDate).toISOString().split('T')[0] : "",
            durationInWeeks: cohort.durationInWeeks,
            maxCapacity: cohort.maxCapacity,
        } : undefined,
    });

    const updateMutation = trpc.lmsModule.cohortModule.cohort.update.useMutation({
        onSuccess: () => {
            toast({ title: t("common:dashboard.success"), description: "Cohort updated successfully" });
            trpcUtils.lmsModule.cohortModule.cohort.list.invalidate();
            cohortQuery.refetch();
        },
        onError: (err: any) => {
            toast({ title: t("common:dashboard.error"), description: err.message, variant: "destructive" });
        },
    });

    const handleSubmit = useCallback(async (data: CohortFormDataType) => {
        const updateData: any = {
            title: data.title,
            slug: slugify(data.title),
            description: data.description,
            inviteCode: data.inviteCode,
            status: data.status,
        };
        if (data.instructorId) updateData.instructorId = data.instructorId;
        if (data.beginDate) updateData.beginDate = new Date(data.beginDate).toISOString();
        if (data.endDate) updateData.endDate = new Date(data.endDate).toISOString();
        if (data.durationInWeeks) updateData.durationInWeeks = data.durationInWeeks;
        if (data.maxCapacity) updateData.maxCapacity = data.maxCapacity;

        await updateMutation.mutateAsync({ id: params.id, data: updateData });
    }, [updateMutation, params.id]);

    const searchCourses = useCallback(async (search: string, offset: number, size: number): Promise<CourseItem[]> => {
        const result = await trpcUtils.lmsModule.courseModule.course.list.fetch({
            pagination: { skip: offset, take: size },
            search: search ? { q: search } : undefined,
        });
        return result.items.map(course => ({ _id: course._id, title: course.title }));
    }, [trpcUtils]);

    const searchInstructors = useCallback(async (search: string, offset: number, size: number): Promise<InstructorItem[]> => {
        const result = await trpcUtils.userModule.user.list.fetch({
            pagination: { skip: offset, take: size },
            search: search ? { q: search } : undefined,
        });
        return result.items.map(user => ({ 
            _id: user._id, 
            fullName: user.fullName || user.email,
            email: user.email,
            avatarUrl: user.avatar?.url 
        }));
    }, [trpcUtils]);

    const breadcrumbs = useMemo(() => [
        { label: t("common:dashboard.cohorts.title"), href: "/dashboard/lms/cohorts" },
        { label: cohort?.title || "Edit", href: "#" },
    ], [t, cohort?.title]);

    const getStatusBadge = useCallback((status: CohortStatusEnum) => {
        const variants: Record<CohortStatusEnum, "default" | "secondary" | "destructive" | "outline"> = {
            [CohortStatusEnum.UPCOMING]: "secondary",
            [CohortStatusEnum.LIVE]: "default",
            [CohortStatusEnum.COMPLETED]: "outline",
            [CohortStatusEnum.CANCELLED]: "destructive",
        };
        return <Badge variant={variants[status]}>{status}</Badge>;
    }, []);

    const scheduleDialogControl = useDialogControl<{ cohort: CohortType }>();

    const handleSchedule = useCallback(() => {
        if (cohort) {
            scheduleDialogControl.show({ cohort });
        }
    }, [scheduleDialogControl, cohort]);

    if (!cohort) {
        return (
            <DashboardContent breadcrumbs={breadcrumbs} permissions={[UIConstants.permissions.manageCourse]}>
                <div className="flex flex-col items-center justify-center h-64">
                    <p className="text-lg">Cohort not found</p>
                    <Link href="/dashboard/lms/cohorts">
                        <Button variant="link">Back to Cohorts</Button>
                    </Link>
                </div>
            </DashboardContent>
        );
    }

    return (
        <DashboardContent breadcrumbs={breadcrumbs} permissions={[UIConstants.permissions.manageCourse]}>
            <HeaderTopbar
                header={{
                    title: cohort.title,
                    subtitle: "Manage cohort details and settings",
                }}
                backLink={true}
                rightAction={
                    <Link href={`/dashboard/lms/cohorts/${cohortId}/schedule`}>
                        <Button variant="outline">
                            <Calendar className="h-4 w-4 mr-2" />
                            View Schedule
                        </Button>
                    </Link>
                }
            />
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {getStatusBadge(cohort.status)}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Capacity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm font-medium">{cohort.maxCapacity ? `0/${cohort.maxCapacity}` : "Unlimited"}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Start Date</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm font-medium">
                            {cohort.beginDate ? format(new Date(cohort.beginDate), "MMM dd, yyyy") : "-"}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">End Date</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm font-medium">
                            {cohort.endDate ? format(new Date(cohort.endDate), "MMM dd, yyyy") : "-"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Course Assignment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Controller
                            control={form.control}
                            name="courseId"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel>Select Course</FieldLabel>
                                    <ComboBox2<CourseItem>
                                        title="Select course"
                                        valueKey="_id"
                                        value={field.value ? { _id: field.value, title: cohort.course?.title || "" } : undefined}
                                        searchFn={searchCourses}
                                        renderLabel={(item) => item.title}
                                        onChange={(item) => field.onChange(item?._id || "")}
                                        multiple={false}
                                        disabled={!isAdmin}
                                        showEditButton={true}
                                        onEditClick={(item) => {
                                          window.open(
                                            `/dashboard/lms/courses/${item._id}`,
                                            "_blank");
                                        }}
                                    />
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </Field>
                            )}
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Instructor Assignment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Controller
                            control={form.control}
                            name="instructorId"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel>Select Instructor</FieldLabel>
                                    <ComboBox2<InstructorItem>
                                        title="Select instructor"
                                        valueKey="_id"
                                        value={field.value ? { 
                                            _id: field.value, 
                                            fullName: cohort.instructor?.fullName || cohort.instructor?.email || "",
                                            email: cohort.instructor?.email || "",
                                            avatarUrl: undefined
                                        } : undefined}
                                        searchFn={searchInstructors}
                                        renderLabel={(item) => (
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={item.avatarUrl} alt={item.fullName} />
                                                    <AvatarFallback className="text-xs">
                                                        {item.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span>{item.fullName}</span>
                                            </div>
                                        )}
                                        onChange={(item) => field.onChange(item?._id || "")}
                                        multiple={false}
                                        disabled={!isAdmin}
                                    />
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </Field>
                            )}
                        />
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Cohort Settings</CardTitle>
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
                                        <Input
                                            {...field}
                                            placeholder="Cohort title"
                                            aria-invalid={fieldState.invalid}
                                        />
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
                                        <Textarea
                                            {...field}
                                            placeholder="Cohort description"
                                            rows={3}
                                            aria-invalid={fieldState.invalid}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Controller
                                    control={form.control}
                                    name="inviteCode"
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel>Invite Code</FieldLabel>
                                            <Input
                                                {...field}
                                                placeholder="e.g., SPRING2024"
                                                aria-invalid={fieldState.invalid}
                                            />
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
                                            <FieldLabel htmlFor="cohort-status">
                                                Status
                                            </FieldLabel>
                                            <Select
                                                name={field.name}
                                                value={field.value}
                                                onValueChange={field.onChange}
                                            >
                                                <SelectTrigger
                                                    id="cohort-status"
                                                    aria-invalid={fieldState.invalid}
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.values(CohortStatusEnum).map((status) => (
                                                        <SelectItem key={status} value={status}>
                                                            {status}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
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
                                    name="beginDate"
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel>Start Date</FieldLabel>
                                            <Input
                                                {...field}
                                                type="date"
                                                aria-invalid={fieldState.invalid}
                                            />
                                            {fieldState.invalid && (
                                                <FieldError errors={[fieldState.error]} />
                                            )}
                                        </Field>
                                    )}
                                />
                                <Controller
                                    control={form.control}
                                    name="endDate"
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel>End Date</FieldLabel>
                                            <Input
                                                {...field}
                                                type="date"
                                                aria-invalid={fieldState.invalid}
                                            />
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
                                    name="durationInWeeks"
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel>Duration (weeks)</FieldLabel>
                                            <Input
                                                {...field}
                                                type="number"
                                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                                value={field.value || ""}
                                                aria-invalid={fieldState.invalid}
                                            />
                                            {fieldState.invalid && (
                                                <FieldError errors={[fieldState.error]} />
                                            )}
                                        </Field>
                                    )}
                                />
                                <Controller
                                    control={form.control}
                                    name="maxCapacity"
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel>Max Capacity</FieldLabel>
                                            <Input
                                                {...field}
                                                type="number"
                                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                                value={field.value || ""}
                                                aria-invalid={fieldState.invalid}
                                            />
                                            {fieldState.invalid && (
                                                <FieldError errors={[fieldState.error]} />
                                            )}
                                        </Field>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Button 
                                    type="button" 
                                    variant="outline"
                                    onClick={handleSchedule}
                                    className="w-full"
                                >
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Manage Schedule
                                </Button>
                            </div>
                            <div className="flex justify-end">
                                    
                                <Button type="submit" disabled={updateMutation.isPending || form.formState.isSubmitting}>
                                    <Save className="h-4 w-4 mr-2" />
                                    {updateMutation.isPending ? "Saving..." : "Save"}
                                </Button>
                            </div>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>

            <CohortScheduleEditDialog control={scheduleDialogControl} />
        </DashboardContent>
    );
}

