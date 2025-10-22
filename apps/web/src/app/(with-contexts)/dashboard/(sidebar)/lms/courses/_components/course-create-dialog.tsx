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
import { useCallback, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";


const LanguagesMap = {
    en: "English",
    kz: "Kazakh",
    ru: "Russian",
}

export function CourseCreateDialog(props: {
    control: ReturnType<typeof useDialogControl>;
}) {
    const { t } = useTranslation(["dashboard", "common"]);
    const { toast } = useToast();
    const router = useRouter();

    // Zod schema with translated error messages
    const CourseSchema = useMemo(() => z.object({
        title: z
            .string()
            .min(1, { message: t("dashboard:courses.validation.title_required") })
            .max(255, { message: t("dashboard:courses.validation.title_max") }),
        courseCode: z
            .string()
            .min(1, { message: t("dashboard:courses.validation.course_code_required") })
            .max(50, { message: t("dashboard:courses.validation.course_code_max") }),
        level: z.nativeEnum(CourseLevelEnum),
        language: z.string().min(1, { message: t("dashboard:courses.validation.language_required") }),
    }), [t]);

    type CourseFormDataType = z.infer<typeof CourseSchema>;

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
            title={t("dashboard:courses.form.create_new_course")}
            onSubmit={form.handleSubmit(handleSubmit)}
            onCancel={props.control.hide}
            isLoading={isSaving || isSubmitting}
            submitText={t("dashboard:courses.form.create_course")}
            cancelText={t("common:dashboard.cancel")}
            maxWidth="xl"
        >
            <FieldGroup className="min-h-[300px]">
                <Controller
                    control={form.control}
                    name="title"
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>{t("dashboard:courses.form.course_title")}</FieldLabel>
                            <Input
                                {...field}
                                placeholder={t("dashboard:courses.form.title_placeholder")}
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
                            <FieldLabel>{t("dashboard:courses.form.course_code")}</FieldLabel>
                            <Input
                                {...field}
                                placeholder={t("dashboard:courses.form.course_code_placeholder")}
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
                                {t("dashboard:courses.form.level")}
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
                                        <SelectValue placeholder={t("dashboard:courses.form.level_placeholder")} />
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
                            <FieldLabel htmlFor="course-language">{t("dashboard:courses.form.language")}</FieldLabel>
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
                                        <SelectValue placeholder={t("dashboard:courses.form.language_placeholder")} />
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