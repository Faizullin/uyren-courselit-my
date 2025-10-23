"use client";

import { removeAssignmentMedia, uploadAssignmentMedia } from "@/server/actions/lms/assignment-media";
import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AssignmentDifficultyEnum,
  AssignmentTypeEnum,
} from "@workspace/common-logic/models/lms/assignment.types";
import { IAttachmentMedia } from "@workspace/common-logic/models/media.types";
import { ComboBox2, MediaSelector, useToast } from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { format } from "date-fns";
import { Calendar, Clock, Paperclip, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import z from "zod";
import { useAssignmentContext } from "./assignment-context";

const AssignmentSettingsSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  course: z
    .object({
      key: z.string(),
      title: z.string(),
    })
    .nullable(),
  type: z.nativeEnum(AssignmentTypeEnum),
  difficulty: z.nativeEnum(AssignmentDifficultyEnum),
  totalPoints: z.number().min(1, "Total points must be at least 1"),
  instructions: z.string().optional(),
  beginDate: z.date().optional(),
  dueDate: z.date().optional(),
  scheduledDate: z.date().optional(),
  eventDuration: z.number().min(1).max(480).optional(),
  allowLateSubmission: z.boolean(),
  latePenalty: z.number().min(0).max(100),
  maxAttempts: z.number().min(1).optional(),
  allowPeerReview: z.boolean(),
  rubrics: z.array(
    z.object({
      criterion: z.string(),
      points: z.number().min(0),
      description: z.string().optional(),
    })
  ),
  requirements: z.array(z.string()),
  attachments: z.array(z.any()).optional(),
});

type AssignmentSettingsFormDataType = z.infer<
  typeof AssignmentSettingsSchema
>;

interface CourseSelectItemType {
  key: string;
  title: string;
}

export default function AssignmentSettings() {
  const { assignment, mode } = useAssignmentContext();
  const router = useRouter();
  const { t } = useTranslation(["dashboard", "common"]);
  const { toast } = useToast();
  const trpcUtils = trpc.useUtils();
  const [attachments, setAttachments] = useState<IAttachmentMedia[]>([]);

  const form = useForm<AssignmentSettingsFormDataType>({
    resolver: zodResolver(AssignmentSettingsSchema),
    defaultValues: {
      title: "",
      description: "",
      course: null,
      type: AssignmentTypeEnum.PROJECT,
      difficulty: AssignmentDifficultyEnum.MEDIUM,
      totalPoints: 100,
      instructions: "",
      requirements: [],
      beginDate: undefined,
      dueDate: undefined,
      scheduledDate: undefined,
      eventDuration: undefined,
      allowLateSubmission: true,
      latePenalty: 0,
      maxAttempts: undefined,
      allowPeerReview: false,
      rubrics: [],
      attachments: [],
    },
    mode: "onSubmit",
  });

  const rubricsFieldArray = useFieldArray({
    control: form.control,
    name: "rubrics",
  });

  const requirementsFieldArray = useFieldArray({
    control: form.control,
    name: "requirements",
  } as any);

  const createMutation =
    trpc.lmsModule.assignmentModule.assignment.create.useMutation({
      onSuccess: (response) => {
        toast({
          title: t("common:success"),
          description: t("dashboard:lms.assignment.toast.created"),
        });
        router.push(`/dashboard/lms/assignments/${response._id}`);
      },
      onError: (error) => {
        toast({
          title: t("common:error"),
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const updateMutation =
    trpc.lmsModule.assignmentModule.assignment.update.useMutation({
      onSuccess: () => {
        toast({
          title: t("common:success"),
          description: t("dashboard:lms.assignment.toast.updated"),
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
    async (data: AssignmentSettingsFormDataType) => {
      const transformedData = {
        title: data.title,
        description: data.description,
        courseId: data.course?.key || "",
        type: data.type,
        difficulty: data.difficulty,
        totalPoints: data.totalPoints,
        instructions: data.instructions,
        requirements: data.requirements,
        beginDate: data.beginDate,
        dueDate: data.dueDate,
        scheduledDate: data.scheduledDate,
        eventDuration: data.eventDuration || undefined,
        allowLateSubmission: data.allowLateSubmission,
        latePenalty: data.latePenalty,
        maxAttempts: data.maxAttempts || undefined,
        allowPeerReview: data.allowPeerReview,
        rubrics: data.rubrics,
        // attachments are handled separately via upload/remove actions
      };

      if (mode === "create") {
        await createMutation.mutateAsync({ data: transformedData });
      } else if (mode === "edit" && assignment) {
        await updateMutation.mutateAsync({
          id: assignment._id,
          data: transformedData,
        });
      }
    },
    [mode, assignment, createMutation, updateMutation]
  );

  const fetchCourses = useCallback(
    async (search: string) => {
      const response =
        await trpcUtils.lmsModule.courseModule.course.list.fetch({
          pagination: { take: 15, skip: 0 },
          search: { q: search },
        });
      return response.items.map((course) => ({
        key: course._id,
        title: course.title,
      }));
    },
    [trpcUtils]
  );

  useEffect(() => {
    if (assignment && mode === "edit") {
      form.reset({
        title: assignment.title || "",
        description: assignment.description || "",
        course: assignment.course
          ? {
              key: assignment.courseId || "",
              title: assignment.course.title,
            }
          : null,
        difficulty: assignment.difficulty || AssignmentDifficultyEnum.MEDIUM,
        type: AssignmentTypeEnum.ESSAY,
        totalPoints: assignment.totalPoints || 100,
        instructions: assignment.instructions || "",
        requirements: assignment.requirements || [],
        beginDate: assignment.beginDate
          ? new Date(assignment.beginDate)
          : undefined,
        dueDate: assignment.dueDate ? new Date(assignment.dueDate) : undefined,
        scheduledDate: assignment.scheduledDate
          ? new Date(assignment.scheduledDate)
          : undefined,
        eventDuration: assignment.eventDuration,
        allowLateSubmission: assignment.allowLateSubmission ?? true,
        latePenalty: assignment.latePenalty || 0,
        maxAttempts: assignment.maxAttempts,
        allowPeerReview: assignment.allowPeerReview || false,
        rubrics: assignment.rubrics || [],
        attachments: assignment.attachments || [],
      });
      setAttachments((assignment.attachments as unknown as IAttachmentMedia[]) || []);
    }
  }, [assignment, mode, form]);

  const handleCheckProject = useCallback(() => {
    const url = `${process.env.NEXT_PUBLIC_TUTOR_IDE_URL}/projects/init?externalAssignmentId=${assignment?._id}`;
    window.open(url, "_blank");
  }, [assignment?._id]);

  const handleUploadAttachment = useCallback(
    async (files: File[], _type: string): Promise<any[]> => {
      if (!assignment?._id) {
        toast({
          title: t("common:error"),
          description: t("common:toast.save_before_upload", { item: "assignment" }),
          variant: "destructive",
        });
        throw new Error("Assignment not saved yet");
      }

      if (!files[0]) {
        throw new Error("No file provided");
      }

      const formData = new FormData();
      formData.append("file", files[0]);

      const result = await uploadAssignmentMedia(assignment._id, formData);

      if (result.success && result.media) {
        setAttachments([...attachments, result.media as any]);
        toast({
          title: t("common:success"),
          description: t("common:toast.uploaded_successfully", { item: "Attachment" }),
        });
        return [result.media];
      } else {
        toast({
          title: t("common:error"),
          description: result.error || t("common:toast.upload_error", { item: "attachment" }),
          variant: "destructive",
        });
        throw new Error(result.error || "Failed to upload attachment");
      }
    },
    [assignment?._id, attachments, toast, t]
  );

  const handleRemoveAttachment = useCallback(
    async (mediaId: string) => {
      if (!assignment?._id) {
        toast({
          title: t("common:error"),
          description: t("common:toast.not_found", { item: "Assignment" }),
          variant: "destructive",
        });
        throw new Error("Assignment not found");
      }

      const result = await removeAssignmentMedia(assignment._id, mediaId);

      if (result.success) {
        setAttachments(attachments.filter((att) => att.mediaId !== mediaId));
        toast({
          title: t("common:success"),
          description: t("common:toast.removed_successfully", { item: "Attachment" }),
        });
      } else {
        toast({
          title: t("common:error"),
          description: result.error || t("common:toast.remove_error", { item: "attachment" }),
          variant: "destructive",
        });
        throw new Error(result.error || "Failed to remove attachment");
      }
    },
    [assignment?._id, attachments, toast, t]
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isSubmitting = form.formState.isSubmitting;

  const watchedBeginDate = form.watch("beginDate");
  const watchedDueDate = form.watch("dueDate");
  const watchedType = form.watch("type");

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t("dashboard:lms.assignment.settings.begin")}</p>
                <p className="text-sm font-medium">
                  {watchedBeginDate
                    ? format(new Date(watchedBeginDate), "MMM dd, HH:mm")
                    : t("common:not_set")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t("dashboard:lms.assignment.settings.due")}</p>
                <p className="text-sm font-medium">
                  {watchedDueDate
                    ? format(new Date(watchedDueDate), "MMM dd, HH:mm")
                    : t("common:not_set")}
                </p>
              </div>
            </div>
            <div className="border-l pl-6">
              <p className="text-xs text-muted-foreground">{t("common:points")}</p>
              <p className="text-xl font-bold">
                {form.watch("totalPoints") || 0}
              </p>
            </div>
            <Button
              type="submit"
              disabled={isSaving || isSubmitting}
              className="ml-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving || isSubmitting ? t("common:saving") : t("common:save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard:lms.assignment.settings.basic_info")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                control={form.control}
                name="title"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>{t("dashboard:lms.assignment.settings.title")} *</FieldLabel>
                    <Input
                      {...field}
                      placeholder={t("dashboard:lms.assignment.settings.assignment_title_placeholder")}
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
                      placeholder={t("dashboard:lms.assignment.settings.brief_description_placeholder")}
                      rows={2}
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
                    <FieldLabel>{t("dashboard:lms.assignment.settings.course")} *</FieldLabel>
                    <ComboBox2<CourseSelectItemType>
                      title={t("dashboard:lms.assignment.settings.select_course")}
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
                        window.open(`/dashboard/products/${item.key}`, "_blank");
                      }}
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
                  name="type"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="type">{t("dashboard:lms.assignment.settings.type")} *</FieldLabel>
                        <Select
                          name={field.name}
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger id="type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={AssignmentTypeEnum.ESSAY}>{t("dashboard:lms.assignment.types.essay")}</SelectItem>
                            <SelectItem value={AssignmentTypeEnum.PROJECT}>{t("dashboard:lms.assignment.types.project")}</SelectItem>
                            <SelectItem value={AssignmentTypeEnum.PRESENTATION}>{t("dashboard:lms.assignment.types.presentation")}</SelectItem>
                            <SelectItem value={AssignmentTypeEnum.FILE_UPLOAD}>{t("dashboard:lms.assignment.types.file_upload")}</SelectItem>
                          </SelectContent>
                        </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="difficulty"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="difficulty">{t("dashboard:lms.assignment.settings.difficulty")} *</FieldLabel>
                      <div className="w-full relative">
                        <Select
                          name={field.name}
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger id="difficulty">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={AssignmentDifficultyEnum.EASY}>{t("dashboard:lms.assignment.difficulty.easy")}</SelectItem>
                            <SelectItem value={AssignmentDifficultyEnum.MEDIUM}>{t("dashboard:lms.assignment.difficulty.medium")}</SelectItem>
                            <SelectItem value={AssignmentDifficultyEnum.HARD}>{t("dashboard:lms.assignment.difficulty.hard")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <Controller
                control={form.control}
                name="totalPoints"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>{t("dashboard:lms.assignment.settings.total_points")} *</FieldLabel>
                    <Input
                      {...field}
                      type="number"
                      min={1}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {watchedType === AssignmentTypeEnum.PROJECT && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCheckProject}
                  disabled={!assignment?._id}
                >
                  {t("dashboard:lms.assignment.settings.check_project_ide")}
                </Button>
              )}
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard:lms.assignment.settings.dates_config")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {["beginDate", "dueDate", "scheduledDate"].map((dateField) => (
                <Controller
                  key={dateField}
                  control={form.control}
                  name={dateField as "beginDate" | "dueDate" | "scheduledDate"}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>
                        {dateField === "beginDate" ? t("dashboard:lms.assignment.settings.begin_date") : dateField === "dueDate" ? t("dashboard:lms.assignment.settings.due_date") : t("dashboard:lms.assignment.settings.scheduled_date")}
                      </FieldLabel>
                      <Input
                        type="datetime-local"
                        value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              ))}

              <Controller
                control={form.control}
                name="eventDuration"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>{t("dashboard:lms.assignment.settings.event_duration")}</FieldLabel>
                    <Input
                      type="number"
                      min={1}
                      max={480}
                      placeholder={t("dashboard:lms.assignment.settings.event_duration_placeholder")}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : "")}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="allowLateSubmission"
                render={({ field }) => (
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <div className="text-base font-medium">
                        {t("dashboard:lms.assignment.settings.allow_late_submissions")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("dashboard:lms.assignment.settings.allow_late_submissions_desc")}
                      </div>
                    </div>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={form.control}
                  name="latePenalty"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>{t("dashboard:lms.assignment.settings.late_penalty")}</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="maxAttempts"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>{t("dashboard:lms.assignment.settings.max_attempts")}</FieldLabel>
                      <Input
                        type="number"
                        min={1}
                        placeholder={t("common:unlimited")}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : "")}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <Controller
                control={form.control}
                name="allowPeerReview"
                render={({ field }) => (
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <div className="text-base font-medium">
                        {t("dashboard:lms.assignment.settings.allow_peer_review")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("dashboard:lms.assignment.settings.allow_peer_review_desc")}
                      </div>
                    </div>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard:lms.assignment.settings.instructions_requirements")}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Controller
              control={form.control}
              name="instructions"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{t("dashboard:lms.assignment.settings.instructions")}</FieldLabel>
                  <Textarea
                    {...field}
                    placeholder={t("dashboard:lms.assignment.settings.detailed_instructions_placeholder")}
                    rows={4}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <FieldLabel>{t("dashboard:lms.assignment.settings.requirements")}</FieldLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => requirementsFieldArray.append("")}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("dashboard:lms.assignment.settings.add_requirement")}
                </Button>
              </div>
              <div className="space-y-2">
                {requirementsFieldArray.fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2">
                    <Controller
                      control={form.control}
                      name={`requirements.${index}`}
                      render={({ field, fieldState }) => (
                        <div className="flex-1">
                          <Input
                            {...field}
                            placeholder={t("dashboard:lms.assignment.settings.requirement_number", { number: index + 1 })}
                            aria-invalid={fieldState.invalid}
                          />
                        </div>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => requirementsFieldArray.remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {requirementsFieldArray.fields.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard:lms.assignment.settings.no_requirements")}
                  </p>
                )}
              </div>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("dashboard:lms.assignment.settings.grading_rubrics")}</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                rubricsFieldArray.append({ criterion: "", points: 0, description: "" })
              }
            >
              <Plus className="h-4 w-4 mr-1" />
              {t("dashboard:lms.assignment.settings.add_rubric")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rubricsFieldArray.fields.map((field, index) => (
              <Card key={field.id}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Controller
                          control={form.control}
                          name={`rubrics.${index}.criterion`}
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel>{t("dashboard:lms.assignment.settings.criterion")}</FieldLabel>
                              <Input
                                {...field}
                                placeholder={t("dashboard:lms.assignment.settings.grading_criterion_placeholder")}
                                aria-invalid={fieldState.invalid}
                              />
                            </Field>
                          )}
                        />
                      </div>
                      <div className="w-32">
                        <Controller
                          control={form.control}
                          name={`rubrics.${index}.points`}
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel>{t("common:points")}</FieldLabel>
                              <Input
                                {...field}
                                type="number"
                                min={0}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value
                                      ? parseFloat(e.target.value)
                                      : 0
                                  )
                                }
                                aria-invalid={fieldState.invalid}
                              />
                            </Field>
                          )}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-8"
                        onClick={() => rubricsFieldArray.remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Controller
                      control={form.control}
                      name={`rubrics.${index}.description`}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>{t("dashboard:lms.assignment.settings.rubric_description")}</FieldLabel>
                          <Textarea
                            {...field}
                            placeholder={t("dashboard:lms.assignment.settings.grading_criterion_desc_placeholder")}
                            rows={2}
                            aria-invalid={fieldState.invalid}
                          />
                        </Field>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            {rubricsFieldArray.fields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("dashboard:lms.assignment.settings.no_rubrics")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            <CardTitle>{t("dashboard:lms.assignment.settings.attachments")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("dashboard:lms.assignment.settings.attachments_desc")}
              {!assignment?._id && ` (${t("dashboard:lms.assignment.messages.save_first_upload")})`}
            </p>
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <MediaSelector
                  key={attachment.mediaId}
                  media={attachment}
                  onSelection={(media) => {}}
                  onRemove={() => handleRemoveAttachment(attachment.mediaId)}
                  type="course"
                  functions={{
                    uploadFile: handleUploadAttachment,
                    removeFile: handleRemoveAttachment,
                  }}
                  disabled={!assignment?._id}
                />
              ))}
              {assignment?._id && (
                <MediaSelector
                  media={null}
                  onSelection={(media) => {}}
                  onRemove={() => {}}
                  type="course"
                  strings={{
                    buttonCaption: attachments.length === 0 ? t("dashboard:lms.assignment.settings.upload_first_attachment") : t("dashboard:lms.assignment.settings.upload_another_attachment"),
                  }}
                  functions={{
                    uploadFile: handleUploadAttachment,
                    removeFile: handleRemoveAttachment,
                  }}
                  disabled={!assignment?._id}
                />
              )}
              {attachments.length === 0 && !assignment?._id && (
                <p className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded-lg">
                  {t("dashboard:lms.assignment.messages.save_first_upload_attachments")}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
