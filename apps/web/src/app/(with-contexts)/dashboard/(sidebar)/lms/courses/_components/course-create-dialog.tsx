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
    const { t } = useTranslation(["course", "common"]);
    const { toast } = useToast();
    const router = useRouter();

    // Zod schema with translated error messages
    const CourseSchema = useMemo(() => z.object({
        title: z
            .string()
            .min(1, { message: t("course:validation.title_required") })
            .max(255, { message: t("course:validation.title_max") }),
        courseCode: z
            .string()
            .min(1, { message: t("course:validation.course_code_required") })
            .max(50, { message: t("course:validation.course_code_max") }),
        level: z.nativeEnum(CourseLevelEnum),
        language: z.string().min(1, { message: t("course:validation.language_required") }),
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
                    title: t("common:success"),
                    description: t("course:toast.created"),
                });
                props.control.hide();
                router.push(`/dashboard/lms/courses/${response._id}`);
            },
            onError: (err) => {
                toast({
                    title: t("common:error"),
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
            title={t("course:form.create_title")}
            onSubmit={form.handleSubmit(handleSubmit)}
            onCancel={props.control.hide}
            isLoading={isSaving || isSubmitting}
            submitText={t("course:form.create_button")}
            cancelText={t("common:cancel")}
            maxWidth="xl"
        >
            <FieldGroup className="min-h-[300px]">
                <Controller
                    control={form.control}
                    name="title"
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>{t("course:form.course_title")}</FieldLabel>
                            <Input
                                {...field}
                                placeholder={t("course:form.title_placeholder")}
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
                            <FieldLabel>{t("course:form.course_code")}</FieldLabel>
                            <Input
                                {...field}
                                placeholder={t("course:form.course_code_placeholder")}
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
                                {t("course:form.level")}
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
                                        <SelectValue placeholder={t("course:form.level_placeholder")} />
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
                            <FieldLabel htmlFor="course-language">{t("course:form.language")}</FieldLabel>
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
                                        <SelectValue placeholder={t("course:form.language_placeholder")} />
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