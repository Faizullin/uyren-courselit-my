"use client";

import { useCourseDetail } from "@/components/course/detail/course-detail-context";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { ITextEditorContent } from "@workspace/common-logic/lib/text-editor-content";
import { LessonTypeEnum } from "@workspace/common-logic/models/lms/lesson.types";
import { useToast } from "@workspace/components-library";
import { ContentEditorRef } from "@workspace/text-editor/tiptap-sh";
import { Button } from "@workspace/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Switch } from "@workspace/ui/components/switch";
import { Eye, File, FileText, HelpCircle, Video } from "lucide-react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";

const LessonContentEditor = dynamic(() =>
  import(
    "@/components/editors/tiptap/templates/lesson-content/lesson-content-editor"
  ).then((mod) => mod.LessonContentEditor),
);

// Zod validation schema
const lessonFormSchema = z.object({
  title: z.string().min(1).trim(),
  type: z.nativeEnum(LessonTypeEnum),
  requiresEnrollment: z.boolean(),
  downloadable: z.boolean(),
  embedUrl: z.string().optional(),
});

type LessonFormData = z.infer<typeof lessonFormSchema>;

export default function Page() {
  const router = useRouter();
  const params = useParams<{ id: string, section: string; lessonId: string; }>();
  const { id: courseId, section: chapterId, lessonId } = params;
  const trpcUtils = trpc.useUtils();
  const { toast } = useToast();
  const { t } = useTranslation(["dashboard", "common"]);

  const getLessonTypes = () => [
    { value: LessonTypeEnum.TEXT, label: t("dashboard:lesson.types.text"), icon: FileText },
    { value: LessonTypeEnum.VIDEO, label: t("dashboard:lesson.types.video"), icon: Video },
    { value: LessonTypeEnum.QUIZ, label: t("dashboard:lesson.types.quiz"), icon: HelpCircle },
    { value: LessonTypeEnum.FILE, label: t("dashboard:lesson.types.file"), icon: File },
  ];

  const {loadCourseDetailQuery, loadLessonDetailQuery} = useCourseDetail()

  const course = loadCourseDetailQuery.data;
  const lesson = loadLessonDetailQuery.data;

  const form = useForm<LessonFormData>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      title: "",
      type: LessonTypeEnum.TEXT,
      requiresEnrollment: true,
      downloadable: false,
    },
  });

  const editorRef = useRef<ContentEditorRef>(null);
  const [editorContent, setEditorContent] = useState<ITextEditorContent>({
    type: "doc",
    content: "",
    assets: [],
    widgets: [],
    config: { editorType: "tiptap" },
  });


  const updateLessonMutation = trpc.lmsModule.courseModule.lesson.update.useMutation({
    onSuccess: () => {
      toast({
        title: t("common:success"),
        description: t("dashboard:lesson.updated_successfully"),
      });
      trpcUtils.lmsModule.courseModule.lesson.getById.invalidate();
      trpcUtils.lmsModule.courseModule.lesson.list.invalidate();
      trpcUtils.lmsModule.courseModule.course.getStats.invalidate();
    },
    onError: (error) => {
      toast({
        title: t("common:error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: LessonFormData) => {
    await updateLessonMutation.mutateAsync({
      id: lessonId!,
      data: {
        title: data.title,
        content: editorContent,
        requiresEnrollment: data.requiresEnrollment,
        downloadable: data.downloadable,
        type: data.type,
      },
    });
  };

  useEffect(() => {
    if (lesson) {
      const content = lesson.content;
      setEditorContent(content as unknown as ITextEditorContent);
      form.reset({
        title: lesson.title,
        type: lesson.type,
        requiresEnrollment: lesson.requiresEnrollment,
        downloadable: lesson.downloadable,
      });
    }
  }, [lesson, form]);

  if (loadCourseDetailQuery.isLoading || loadLessonDetailQuery.isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  const chapter = course?.chapters?.find((ch) => ch._id === chapterId);
  if (!chapter) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{t("dashboard:lesson.section_not_found")}</p>
      </div>
    );
  }

  return (
    <>
      <HeaderTopbar
        backLink={`/dashboard/lms/courses/${courseId}/`}
        header={{
          title: t("dashboard:lesson.edit_lesson"),
          subtitle: t("dashboard:lesson.edit_subtitle"),
        }}
        rightAction={
          <Button type="button" variant="outline" size="sm" onClick={() => 
            window.open(`/dashboard/student/courses/${courseId}/lessons/${lessonId}`, "_blank")
          }>
            <Eye className="h-4 w-4 mr-2" />
            {t("common:preview")}
          </Button>
        }
        className="mb-6"
      />

      <div className="space-y-6">
        <form 
          onSubmit={form.handleSubmit(onSubmit)} 
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
              e.preventDefault();
            }
          }}
          className="space-y-6"
        >
          <FieldGroup>
            <Controller
              control={form.control}
              name="title"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="lesson-title">{t("dashboard:lesson.title")}</FieldLabel>
                  <Input 
                    {...field}
                    id="lesson-title"
                    placeholder={t("dashboard:lesson.title_placeholder")} 
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
              name="type"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="lesson-type">{t("dashboard:lesson.type")}</FieldLabel>
                  <div>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        if (value) {
                          field.onChange(value as LessonTypeEnum);
                        }
                      }}
                    >
                      <SelectTrigger id="lesson-type">
                        <SelectValue placeholder={t("dashboard:lesson.type_placeholder")} />
                      </SelectTrigger>
                      <SelectContent className="w-fit">
                        {getLessonTypes().map((type) => {
                          const Icon = type.icon;
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                <span>{type.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <div className="space-y-3">
              <Controller
                control={form.control}
                name="requiresEnrollment"
                render={({ field }) => (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FieldLabel htmlFor="lesson-requires-enrollment" className="text-sm font-medium">
                        {t("dashboard:lesson.requires_enrollment")}
                      </FieldLabel>
                      <p className="text-xs text-muted-foreground">
                        {t("dashboard:lesson.requires_enrollment_description")}
                      </p>
                    </div>
                    <Switch
                      id="lesson-requires-enrollment"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="scale-90"
                    />
                  </div>
                )}
              />

              <Controller
                control={form.control}
                name="downloadable"
                render={({ field }) => (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FieldLabel htmlFor="lesson-downloadable" className="text-sm font-medium">
                        {t("dashboard:lesson.downloadable")}
                      </FieldLabel>
                      <p className="text-xs text-muted-foreground">
                        {t("dashboard:lesson.downloadable_description")}
                      </p>
                    </div>
                    <Switch
                      id="lesson-downloadable"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="scale-90"
                    />
                  </div>
                )}
              />
            </div>

            <div className="flex items-center justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/dashboard/lms/courses/${courseId}/content`)}
              >
                {t("common:cancel")}
              </Button>
              <Button 
                type="submit" 
                disabled={form.formState.isSubmitting || updateLessonMutation.isPending}
              >
                {form.formState.isSubmitting || updateLessonMutation.isPending
                  ? t("common:saving")
                  : t("common:update")}
              </Button>
            </div>
          </FieldGroup>
        </form>

        <Field>
          <FieldLabel
            onClick={() => {
              editorRef.current?.commands.focus("end");
            }}
          >
            {t("dashboard:lesson.content")}
          </FieldLabel>
          <LessonContentEditor
            lesson={lesson!}
            onEditor={(editor, meta) => {
              if (meta.reason === "create") {
                editorRef.current = editor;
                editorRef.current!.commands.setMyContent(editorContent);
              }
            }}
            onChange={(content) => {
              setEditorContent({
                ...editorContent,
                content: content,
              });
            }}
          />
        </Field>
      </div>
    </>
  );
}
