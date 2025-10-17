"use client";


import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { CourseLevelEnum } from "@workspace/common-logic/models/lms/course.types";
import {
    FormDialog,
    useDialogControl,
    useToast
} from "@workspace/components-library";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";


const LanguagesMap = {
    en: "English",
    kz: "Kazakh",
    ru: "Russian",
}
const CourseSchema = z.object({
    title: z
        .string()
        .min(1, "Title is required")
        .max(255, "Title must be less than 255 characters"),
    courseCode: z
        .string()
        .min(1, "Course code is required")
        .max(50, "Course code must be less than 50 characters"),
    level: z.nativeEnum(CourseLevelEnum),
    language: z.string().min(1, "Language is required"),
});
type CourseFormDataType = z.infer<typeof CourseSchema>;


export function CourseCreateDialog(props: {
    control: ReturnType<typeof useDialogControl>;
}) {
    const { t } = useTranslation(["dashboard", "common"]);
    const { toast } = useToast();
    const router = useRouter();

    const form = useForm<CourseFormDataType>({
        resolver: zodResolver(CourseSchema),
        defaultValues: {
            title: "",
            courseCode: "",
            level: CourseLevelEnum.BEGINNER,
            language: "en",
        },
    });

    const createCourseMutation =
        trpc.lmsModule.courseModule.course.create.useMutation({
            onSuccess: (response) => {
                toast({
                    title: t("common:dashboard.success"),
                    description: t("products.created_successfully"),
                });
                props.control.hide();
                router.push(`/dashboard/lms/courses/${response._id}`);
            },
            onError: (err) => {
                toast({
                    title: t("common:dashboard.error"),
                    description: err.message,
                    variant: "destructive",
                });
            },
        });

    const handleSubmit = useCallback((data: CourseFormDataType) => {
        createCourseMutation.mutateAsync({
            data: {
                title: data.title,
                courseCode: data.courseCode,
                level: data.level,
                language: data.language,
            },
        })
    }, [createCourseMutation]);

    const isSubmitting = form.formState.isSubmitting;
    const isSaving = createCourseMutation.isPending;

    return (
        <FormDialog
            open={props.control.isVisible}
            onOpenChange={(open) => {
                if (!open) {
                    props.control.hide();
                    form.reset({
                        title: "",
                        courseCode: "",
                        level: CourseLevelEnum.BEGINNER,
                        language: "en",
                    });
                }
            }}
            title={t("products.create_new_course")}
            onSubmit={form.handleSubmit(handleSubmit)}
            onCancel={props.control.hide}
            isLoading={isSaving || isSubmitting}
            submitText={t("courses.create_course")}
            cancelText={t("common:dashboard.cancel")}
            maxWidth="xl"
        >
            <FieldGroup className="min-h-[300px]">
                <Controller
                    control={form.control}
                    name="title"
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>{t("courses.form.course_title")}</FieldLabel>
                            <Input
                                {...field}
                                placeholder={t("products.form.title_placeholder")}
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
                    name="courseCode"
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Course Code</FieldLabel>
                            <Input
                                {...field}
                                placeholder="e.g., CS101, MATH201"
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
                    name="level"
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="course-level">
                                {t("courses.form.type")}
                            </FieldLabel>
                            <div>
                                <Select
                                    name={field.name}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                >
                                    <SelectTrigger
                                        id="course-level"
                                        aria-invalid={fieldState.invalid}
                                        className="w-full"
                                    >
                                        <SelectValue placeholder={t("courses.form.level_placeholder")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(CourseLevelEnum).map(([key, value]) => (
                                            <SelectItem key={key} value={value}>
                                                {value}
                                            </SelectItem>
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
                <Controller
                    control={form.control}
                    name="language"
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="course-language">Language</FieldLabel>
                            <div>
                                <Select
                                    name={field.name}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                >
                                    <SelectTrigger
                                        id="course-language"
                                        aria-invalid={fieldState.invalid}
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Select language" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(LanguagesMap).map(([key, value]) => (
                                            <SelectItem key={key} value={key}>
                                                {value}
                                            </SelectItem>
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
            </FieldGroup>
        </FormDialog>
    );
} 