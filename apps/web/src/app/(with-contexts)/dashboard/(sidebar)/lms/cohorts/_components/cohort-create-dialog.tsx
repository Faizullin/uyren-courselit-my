import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { CohortStatusEnum } from "@workspace/common-logic/models/lms/cohort.types";
import { ComboBox2, FormDialog, useDialogControl, useToast } from "@workspace/components-library";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { slugify } from "@workspace/utils";
import { useCallback } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

const CohortSchema = z.object({
    title: z.string().min(1, "Title is required").max(255),
    courseId: z.string().min(1, "Course is required"),
    description: z.string().optional(),
    inviteCode: z.string().min(6, "Invite code must be at least 6 characters").max(50),
    beginDate: z.string().optional(),
    endDate: z.string().optional(),
    durationInWeeks: z.number().min(1).optional(),
    maxCapacity: z.number().min(1).optional(),
});
type CohortFormDataType = z.infer<typeof CohortSchema>;

type CourseItem = {
    _id: string;
    title: string;
};

export function CohortCreateDialog(props: {
    control: ReturnType<typeof useDialogControl>;
    onSuccess?: () => void;
}) {
    const { t } = useTranslation(["dashboard", "common"]);
    const { toast } = useToast();
    const trpcUtils = trpc.useUtils();

    const form = useForm<CohortFormDataType>({
        resolver: zodResolver(CohortSchema),
        defaultValues: {
            title: "",
            courseId: "",
            description: "",
            inviteCode: "",
            beginDate: "",
            endDate: "",
            durationInWeeks: undefined,
            maxCapacity: undefined,
        },
    });

    const createCohortMutation = trpc.lmsModule.cohortModule.cohort.create.useMutation({
        onSuccess: () => {
            toast({ title: t("common:dashboard.success"), description: "Cohort created successfully" });
            props.control.hide();
            trpcUtils.lmsModule.cohortModule.cohort.list.invalidate();
            props.onSuccess?.();
        },
        onError: (err) => {
            toast({ title: t("common:dashboard.error"), description: err.message, variant: "destructive" });
        },
    });

    const handleSubmit = useCallback(async (data: CohortFormDataType) => {
        const submitData = {
            title: data.title,
            slug: slugify(data.title),
            courseId: data.courseId,
            inviteCode: data.inviteCode,
            status: CohortStatusEnum.UPCOMING,
            description: data.description,
            beginDate: data.beginDate ? new Date(data.beginDate).toISOString() : undefined,
            endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
            durationInWeeks: data.durationInWeeks,
            maxCapacity: data.maxCapacity,
        };

        await createCohortMutation.mutateAsync({ data: submitData });
    }, [createCohortMutation]);

    const searchCourses = useCallback(async (search: string, offset: number, size: number): Promise<CourseItem[]> => {
        const result = await trpcUtils.lmsModule.courseModule.course.list.fetch({
            pagination: { skip: offset, take: size },
            search: search ? { q: search } : undefined,
        });
        return result.items.map(course => ({ _id: course._id, title: course.title }));
    }, [trpcUtils]);

    return (
        <FormDialog
            open={props.control.isVisible}
            onOpenChange={(open) => {
                if (!open) {
                    props.control.hide();
                    form.reset();
                }
            }}
            title="Create New Cohort"
            description="Create a new cohort for a course"
            onSubmit={form.handleSubmit(handleSubmit)}
            onCancel={props.control.hide}
            isLoading={createCohortMutation.isPending || form.formState.isSubmitting}
            submitText="Create Cohort"
            cancelText={t("common:dashboard.cancel")}
            maxWidth="xl"
        >
            <FieldGroup>
                <Controller
                    name="title"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Cohort Title</FieldLabel>
                            <Input
                                {...field}
                                placeholder="e.g., Spring 2024 Cohort"
                                aria-invalid={fieldState.invalid}
                            />
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />
                <Controller
                    name="courseId"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Course</FieldLabel>
                            <ComboBox2<CourseItem>
                                title="Select course"
                                valueKey="_id"
                                value={field.value ? { _id: field.value, title: "" } : undefined}
                                searchFn={searchCourses}
                                renderLabel={(item) => item.title}
                                onChange={(item) => field.onChange(item?._id || "")}
                                multiple={false}
                            />
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />
                <Controller
                    name="description"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Description (Optional)</FieldLabel>
                            <Textarea
                                {...field}
                                placeholder="Add a description for this cohort..."
                                rows={3}
                                aria-invalid={fieldState.invalid}
                            />
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />
                <Controller
                    name="inviteCode"
                    control={form.control}
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
                <div className="grid grid-cols-2 gap-4">
                    <Controller
                        name="beginDate"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>Start Date (Optional)</FieldLabel>
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
                        name="endDate"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>End Date (Optional)</FieldLabel>
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
                        name="durationInWeeks"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>Duration (weeks)</FieldLabel>
                                <Input
                                    {...field}
                                    type="number"
                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                    value={field.value || ""}
                                    placeholder="e.g., 8"
                                    aria-invalid={fieldState.invalid}
                                />
                                {fieldState.invalid && (
                                    <FieldError errors={[fieldState.error]} />
                                )}
                            </Field>
                        )}
                    />
                    <Controller
                        name="maxCapacity"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>Max Capacity</FieldLabel>
                                <Input
                                    {...field}
                                    type="number"
                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                    value={field.value || ""}
                                    placeholder="e.g., 30"
                                    aria-invalid={fieldState.invalid}
                                />
                                {fieldState.invalid && (
                                    <FieldError errors={[fieldState.error]} />
                                )}
                            </Field>
                        )}
                    />
                </div>
            </FieldGroup>
        </FormDialog>
    );
}
