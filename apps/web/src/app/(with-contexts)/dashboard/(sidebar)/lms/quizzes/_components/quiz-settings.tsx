"use client";

import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { ComboBox2, useToast } from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { Switch } from "@workspace/ui/components/switch";
import { Link, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import z from "zod";
import { useQuizContext } from "./quiz-context";

const QuizSettingsSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  course: z.object(
    {
      key: z.string(),
      title: z.string(),
    },
    { required_error: "Please select a course" },
  ),
  timeLimit: z.number().min(1).optional(),
  maxAttempts: z.number().min(1).max(10),
  passingScore: z.number().min(0).max(100),
  shuffleQuestions: z.boolean(),
  showResults: z.boolean(),
  totalPoints: z.number().min(1),
});

type QuizSettingsFormDataType = z.infer<typeof QuizSettingsSchema>;
type CourseSelectItemType = {
  key: string;
  title: string;
};

export default function QuizSettings() {
  const { quiz, mode } = useQuizContext();
  const router = useRouter();
  const { t } = useTranslation(["dashboard", "common"]);
  const { toast } = useToast();
  const form = useForm<QuizSettingsFormDataType>({
    resolver: zodResolver(QuizSettingsSchema),
    defaultValues: {
      title: "",
      description: "",
      course: undefined,
      timeLimit: 30,
      passingScore: 70,
      maxAttempts: 3,
      shuffleQuestions: true,
      showResults: false,
      totalPoints: 0,
    },
  });

  const createMutation = trpc.lmsModule.quizModule.quiz.create.useMutation({
    onSuccess: (response) => {
      toast({
        title: t("common:success"),
        description: t("dashboard:lms.quiz.toast.created"),
      });
      router.push(`/dashboard/lms/quizzes/${response._id}`);
    },
    onError: (error) => {
      toast({
        title: t("common:error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
  const updateMutation = trpc.lmsModule.quizModule.quiz.update.useMutation({
    onSuccess: () => {
      toast({
        title: t("common:success"),
        description: t("dashboard:lms.quiz.toast.updated"),
      });
    },
    onError: (error) => {
      toast({
        title: t("common:error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = useCallback(
    async (data: QuizSettingsFormDataType) => {
      // Transform the data to match the API expectations
      const transformedData = {
        ...data,
        courseId: data.course?.key || "", // Extract just the key for API
        course: undefined,
      };
      if (mode === "create") {
        await createMutation.mutateAsync({
          data: transformedData,
        });
      } else if (mode === "edit" && quiz) {
        await updateMutation.mutateAsync({
          id: quiz._id,
          data: transformedData,
        });
      }
    },
    [mode, quiz, createMutation, updateMutation],
  );

  useEffect(() => {
    if (quiz && mode === "edit") {
      form.reset({
        title: quiz.title || "",
        description: quiz.description || "",
        course: quiz.course
          ? {
            key: quiz.course._id,
            title: quiz.course.title
          }
          : undefined,
        timeLimit: quiz.timeLimit || 30,
        passingScore: quiz.passingScore || 70,
        maxAttempts: quiz.maxAttempts || 3,
        shuffleQuestions: quiz.shuffleQuestions ?? true,
        showResults: quiz.showResults ?? false,
        totalPoints: quiz.totalPoints || 0,
      });
    }
  }, [quiz, mode, form]);

  const trpcUtils = trpc.useUtils();
  const fetchCourses = useCallback(
    async (search: string) => {
      const response = await trpcUtils.lmsModule.courseModule.course.list.fetch(
        {
          pagination: {
            take: 15,
            skip: 0,
          },
          search: {
            q: search,
          },
        },
      );
      return response.items.map((course) => ({
        key: course._id,
        title: course.title,
      }));
    },
    [trpcUtils],
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isSubmitting = form.formState.isSubmitting;

  const handleCopyLink = useCallback(async () => {
    if (!quiz?._id) return;

    const quizUrl = `${window.location.origin}/quiz/${quiz._id}`;

    try {
      await navigator.clipboard.writeText(quizUrl);
      toast({
        title: t("dashboard:lms.quiz.toast.link_copied"),
        description: t("dashboard:lms.quiz.toast.link_copied_desc"),
      });
    } catch (error) {
      const textArea = document.createElement("textarea");
      textArea.value = quizUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);

      toast({
        title: t("dashboard:lms.quiz.toast.link_copied"),
        description: t("dashboard:lms.quiz.toast.link_copied_desc"),
      });
    }
  }, [quiz?._id, toast, t]);

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={mode === "create" || !quiz?._id}
          onClick={handleCopyLink}
          className="flex items-center gap-2"
        >
          <Link className="h-4 w-4" />
          {t("dashboard:lms.quiz.settings.copy_link")}
        </Button>
        <Button type="submit" disabled={isSaving || isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving || isSubmitting ? t("common:saving") : t("dashboard:lms.quiz.settings.save_settings")}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard:lms.quiz.settings.basic_info")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                control={form.control}
                name="title"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>{t("dashboard:lms.quiz.settings.quiz_title")}</FieldLabel>
                    <Input
                      {...field}
                      placeholder={t("dashboard:lms.quiz.settings.quiz_title_placeholder")}
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
                    <FieldLabel>{t("common:description")}</FieldLabel>
                    <Textarea
                      {...field}
                      placeholder={t("dashboard:lms.quiz.settings.quiz_description_placeholder")}
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
                control={form.control}
                name="course"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>{t("dashboard:lms.quiz.settings.course")}</FieldLabel>
                    <ComboBox2<CourseSelectItemType>
                      title={t("dashboard:lms.quiz.settings.select_course")}
                      valueKey="key"
                      value={field.value || undefined}
                      searchFn={fetchCourses}
                      renderLabel={(item) => item.title}
                      onChange={field.onChange}
                      multiple={false}
                      showCreateButton={true}
                      showEditButton={true}
                      onCreateClick={() => {
                        window.open(`/dashboard/products/new`, "_blank");
                      }}
                      onEditClick={(item) => {
                        window.open(
                          `/dashboard/products/${item.key}`,
                          "_blank",
                        );
                      }}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard:lms.quiz.settings.quiz_configuration")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={form.control}
                  name="timeLimit"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>{t("dashboard:lms.quiz.settings.time_limit")}</FieldLabel>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
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
                  name="passingScore"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>{t("dashboard:lms.quiz.settings.passing_score")}</FieldLabel>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Controller
                  control={form.control}
                  name="maxAttempts"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="max-attempts">{t("dashboard:lms.quiz.settings.max_attempts")}</FieldLabel>
                      <Select
                        name={field.name}
                        value={field.value.toString()}
                        onValueChange={(value) =>
                          field.onChange(parseInt(value))
                        }
                      >
                        <SelectTrigger
                          id="max-attempts"
                          className="w-full"
                          aria-invalid={fieldState.invalid}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">{t("dashboard:lms.quiz.settings.attempts.one")}</SelectItem>
                          <SelectItem value="2">{t("dashboard:lms.quiz.settings.attempts.two")}</SelectItem>
                          <SelectItem value="3">{t("dashboard:lms.quiz.settings.attempts.three")}</SelectItem>
                          <SelectItem value="-1">{t("dashboard:lms.quiz.settings.attempts.unlimited")}</SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="totalPoints"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>{t("dashboard:lms.quiz.settings.total_points")}</FieldLabel>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
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
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
