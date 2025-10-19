"use client";

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
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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

const getLessonTypes = () => [
  { value: LessonTypeEnum.TEXT, label: "Text", icon: FileText },
  { value: LessonTypeEnum.VIDEO, label: "Video", icon: Video },
  { value: LessonTypeEnum.QUIZ, label: "Quiz", icon: HelpCircle },
  { value: LessonTypeEnum.FILE, label: "File", icon: File },
];

export default function LessonPage() {
  const router = useRouter();
  const params = useParams<{ id: string, section: string; lessonId: string; }>();
  const { id: courseId, section: chapterId, lessonId } = params;
  const { toast } = useToast();

  const loadCourseQuery = trpc.lmsModule.courseModule.course.getById.useQuery({
    id: courseId,
  }, {
    enabled: !!courseId,
  });

  const loadLessonQuery = trpc.lmsModule.courseModule.lesson.getById.useQuery({
    id: lessonId!,
  }, {
    enabled: !!lessonId,
  });

  const course = loadCourseQuery.data;
  const lesson = loadLessonQuery.data;
  const courseLoading = loadCourseQuery.isLoading;
  const lessonLoading = loadLessonQuery.isLoading;

  // Form setup
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


  const trpcUtils = trpc.useUtils();

  const updateLessonMutation = trpc.lmsModule.courseModule.lesson.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Lesson updated successfully",
      });
      trpcUtils.lmsModule.courseModule.course.getById.invalidate();
      trpcUtils.lmsModule.courseModule.course.getStats.invalidate();
      trpcUtils.lmsModule.courseModule.lesson.getById.invalidate();
      trpcUtils.lmsModule.courseModule.lesson.list.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Error",
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
      setEditorContent(content);
      form.reset({
        title: lesson.title,
        type: lesson.type,
        requiresEnrollment: lesson.requiresEnrollment,
        downloadable: lesson.downloadable,
      });
    }
  }, [lesson, form]);

  if (courseLoading || lessonLoading) {
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

  if (!course) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Course not found</p>
      </div>
    );
  }

  const chapter = course.chapters?.find((ch) => ch._id === chapterId);
  if (!chapter) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Chapter not found</p>
      </div>
    );
  }

  return (
    <>
      <HeaderTopbar
        backLink={`/dashboard/lms/courses/${courseId}/`}
        header={{
          title: "Edit Lesson",
          subtitle: "Update lesson details and content",
        }}
        rightAction={
          <Button type="button" variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Preview Lesson
          </Button>
        }
        className="mb-6"
      />

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
                <FieldLabel>Lesson Title</FieldLabel>
                <Input placeholder="Enter lesson title" {...field} aria-invalid={fieldState.invalid} />
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
                <FieldLabel>Lesson Type</FieldLabel>
                <div>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select lesson type" />
                    </SelectTrigger>
                    <SelectContent className="w-fit"  position="item-aligned">
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

          <Field>
            <FieldLabel
              onClick={() => {
                editorRef.current?.commands.focus("end");
              }}
            >
              Content
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

          <div className="space-y-4">
            <Controller
              control={form.control}
              name="requiresEnrollment"
              render={({ field }) => (
                <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FieldLabel className="text-base">
                      Requires Enrollment
                    </FieldLabel>
                    <p className="text-sm text-muted-foreground">
                      Students must be enrolled in the course to access this lesson
                    </p>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />

            <Controller
              control={form.control}
              name="downloadable"
              render={({ field }) => (
                <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FieldLabel className="text-base">Downloadable</FieldLabel>
                    <p className="text-sm text-muted-foreground">
                      Allow students to download lesson content
                    </p>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
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
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={form.formState.isSubmitting || updateLessonMutation.isPending}
            >
              {form.formState.isSubmitting || updateLessonMutation.isPending
                ? "Saving..."
                : "Update Lesson"}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </>
  );
}
