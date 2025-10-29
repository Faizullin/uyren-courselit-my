"use client";

import { useProfile } from "@/components/contexts/profile-context";
import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { CohortStatusEnum } from "@workspace/common-logic/models/lms/cohort.types";
import { ComboBox2, useToast, useDialogControl } from "@workspace/components-library";
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
import { Calendar, Save, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { CohortScheduleEditDialog } from "./_components/cohort-schedule-edit-dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";

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
            toast({ title: t("common:success"), description: t("dashboard:cohort_edit.updated_successfully") });
            trpcUtils.lmsModule.cohortModule.cohort.list.invalidate();
            cohortQuery.refetch();
        },
        onError: (err: any) => {
            toast({ title: t("common:error"), description: err.message, variant: "destructive" });
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
        const result = await trpcUtils.userModule.user.listInstructors.fetch({
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
        { label: t("dashboard:lms.modules.cohorts.title"), href: "/dashboard/lms/cohorts" },
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

    if (cohortQuery.isLoading || !cohort) {
        return (
            <DashboardContent breadcrumbs={breadcrumbs} permissions={[UIConstants.permissions.manageCourse]}>
                <HeaderTopbar
                    header={{
                        title: t("dashboard:lms.modules.cohorts.title"),
                    }}
                />
                <div className="space-y-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </DashboardContent>
        )
    }

    return (
        <DashboardContent breadcrumbs={breadcrumbs} permissions={[UIConstants.permissions.manageCourse]}>
            <HeaderTopbar
                header={{
                    title: cohort.title,
                    subtitle: t("dashboard:cohort_edit.subtitle"),
                }}
                backLink={true}
                rightAction={
                    <div className="flex gap-2">
                        <Link href={`/dashboard/lms/cohorts/${cohortId}/students`}>
                            <Button variant="outline">
                                <Users className="h-4 w-4 mr-2" />
                                {t("common:students")}
                            </Button>
                        </Link>
                        <Link href={`/dashboard/lms/cohorts/${cohortId}/schedule`}>
                            <Button variant="outline">
                                <Calendar className="h-4 w-4 mr-2" />
                                {t("common:schedule")}
                            </Button>
                        </Link>
                    </div>
                }
            />
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">{t("common:status")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {getStatusBadge(cohort.status)}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">{t("dashboard:cohort_edit.capacity_card")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm font-medium">
                            {cohort.maxCapacity 
                                ? `${cohort.statsCurrentStudentsCount || 0}/${cohort.maxCapacity}` 
                                : `${cohort.statsCurrentStudentsCount || 0} ${t("common:students")}`}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">{t("common:start_date")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm font-medium">
                            {cohort.beginDate ? format(new Date(cohort.beginDate), "MMM dd, yyyy") : "-"}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">{t("common:end_date")}</CardTitle>
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
                        <CardTitle>{t("dashboard:cohort_edit.course_assignment")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Controller
                            control={form.control}
                            name="courseId"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="cohort-course">{t("dashboard:cohort_edit.select_course")}</FieldLabel>
                                    <div id="cohort-course">
                                        <ComboBox2<CourseItem>
                                            title={t("dashboard:cohort_edit.select_course")}
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
                                    </div>
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
                        <CardTitle>{t("dashboard:cohort_edit.instructor_assignment")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Controller
                            control={form.control}
                            name="instructorId"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="cohort-instructor">{t("dashboard:cohort_edit.select_instructor")}</FieldLabel>
                                    <div id="cohort-instructor">
                                        <ComboBox2<InstructorItem>
                                            title={t("dashboard:cohort_edit.select_instructor")}
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
                                    </div>
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
                    <CardTitle>{t("dashboard:cohort_edit.cohort_settings")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FieldGroup>
                            <Controller
                                control={form.control}
                                name="title"
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="cohort-title">{t("common:title")}</FieldLabel>
                                        <Input
                                            {...field}
                                            id="cohort-title"
                                            placeholder={t("dashboard:cohort_edit.cohort_title_placeholder")}
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
                                        <FieldLabel htmlFor="cohort-description">{t("common:description")}</FieldLabel>
                                        <Textarea
                                            {...field}
                                            id="cohort-description"
                                            placeholder={t("dashboard:cohort_edit.cohort_description_placeholder")}
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
                                            <FieldLabel htmlFor="cohort-invite-code">{t("dashboard:cohort_edit.invite_code")}</FieldLabel>
                                            <Input
                                                {...field}
                                                id="cohort-invite-code"
                                                placeholder={t("dashboard:cohort_edit.invite_code_placeholder")}
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
                                                {t("common:status")}
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
                                            <FieldLabel htmlFor="cohort-begin-date">{t("common:start_date")}</FieldLabel>
                                            <Input
                                                {...field}
                                                id="cohort-begin-date"
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
                                            <FieldLabel htmlFor="cohort-end-date">{t("common:end_date")}</FieldLabel>
                                            <Input
                                                {...field}
                                                id="cohort-end-date"
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
                                            <FieldLabel htmlFor="cohort-duration">{t("dashboard:cohort_edit.duration_weeks")}</FieldLabel>
                                            <Input
                                                {...field}
                                                id="cohort-duration"
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
                                            <FieldLabel htmlFor="cohort-max-capacity">{t("dashboard:cohort_edit.max_capacity")}</FieldLabel>
                                            <Input
                                                {...field}
                                                id="cohort-max-capacity"
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
                                    {t("dashboard:cohort_edit.manage_schedule")}
                                </Button>
                            </div>
                            <div className="flex justify-end">
                                    
                                <Button type="submit" disabled={updateMutation.isPending || form.formState.isSubmitting}>
                                    <Save className="h-4 w-4 mr-2" />
                                    {updateMutation.isPending ? t("common:saving") : t("common:save")}
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

