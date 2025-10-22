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
          title: "Success",
          description: "Assignment created successfully",
        });
        router.push(`/dashboard/lms/assignments/${response._id}`);
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const updateMutation =
    trpc.lmsModule.assignmentModule.assignment.update.useMutation({
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Assignment updated successfully",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
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
          title: "Error",
          description: "Please save the assignment before uploading attachments",
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
          title: "Success",
          description: "Attachment uploaded successfully",
        });
        return [result.media];
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to upload attachment",
          variant: "destructive",
        });
        throw new Error(result.error || "Failed to upload attachment");
      }
    },
    [assignment?._id, attachments, toast]
  );

  const handleRemoveAttachment = useCallback(
    async (mediaId: string) => {
      if (!assignment?._id) {
        toast({
          title: "Error",
          description: "Assignment not found",
          variant: "destructive",
        });
        throw new Error("Assignment not found");
      }

      const result = await removeAssignmentMedia(assignment._id, mediaId);

      if (result.success) {
        setAttachments(attachments.filter((att) => att.mediaId !== mediaId));
        toast({
          title: "Success",
          description: "Attachment removed successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to remove attachment",
          variant: "destructive",
        });
        throw new Error(result.error || "Failed to remove attachment");
      }
    },
    [assignment?._id, attachments, toast]
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
                <p className="text-xs text-muted-foreground">Begin</p>
                <p className="text-sm font-medium">
                  {watchedBeginDate
                    ? format(new Date(watchedBeginDate), "MMM dd, HH:mm")
                    : "Not set"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Due</p>
                <p className="text-sm font-medium">
                  {watchedDueDate
                    ? format(new Date(watchedDueDate), "MMM dd, HH:mm")
                    : "Not set"}
                </p>
              </div>
            </div>
            <div className="border-l pl-6">
              <p className="text-xs text-muted-foreground">Points</p>
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
              {isSaving || isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                control={form.control}
                name="title"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Title *</FieldLabel>
                    <Input
                      {...field}
                      placeholder="Assignment title"
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
                      placeholder="Brief description"
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
                    <FieldLabel>Course *</FieldLabel>
                    <ComboBox2<CourseSelectItemType>
                      title="Select a course"
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
                      <FieldLabel htmlFor="type">Type *</FieldLabel>
                        <Select
                          name={field.name}
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger id="type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={AssignmentTypeEnum.ESSAY}>Essay</SelectItem>
                            <SelectItem value={AssignmentTypeEnum.PROJECT}>Project</SelectItem>
                            <SelectItem value={AssignmentTypeEnum.PRESENTATION}>Presentation</SelectItem>
                            <SelectItem value={AssignmentTypeEnum.FILE_UPLOAD}>File Upload</SelectItem>
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
                      <FieldLabel htmlFor="difficulty">Difficulty *</FieldLabel>
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
                            <SelectItem value={AssignmentDifficultyEnum.EASY}>Easy</SelectItem>
                            <SelectItem value={AssignmentDifficultyEnum.MEDIUM}>Medium</SelectItem>
                            <SelectItem value={AssignmentDifficultyEnum.HARD}>Hard</SelectItem>
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
                    <FieldLabel>Total Points *</FieldLabel>
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
                  Check Project in IDE
                </Button>
              )}
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Dates & Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Dates & Configuration</CardTitle>
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
                        {dateField === "beginDate" ? "Begin Date" : dateField === "dueDate" ? "Due Date" : "Scheduled Date"}
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
                    <FieldLabel>Event Duration (minutes)</FieldLabel>
                    <Input
                      type="number"
                      min={1}
                      max={480}
                      placeholder="Optional (1-480)"
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
                        Allow Late Submissions
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Students can submit after due date
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
                      <FieldLabel>Late Penalty (%)</FieldLabel>
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
                      <FieldLabel>Max Attempts</FieldLabel>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Unlimited"
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
                        Allow Peer Review
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Enable students to review each other
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

      {/* Instructions & Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions & Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Controller
              control={form.control}
              name="instructions"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Instructions</FieldLabel>
                  <Textarea
                    {...field}
                    placeholder="Detailed instructions for students"
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
                <FieldLabel>Requirements</FieldLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => requirementsFieldArray.append("")}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Requirement
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
                            placeholder={`Requirement ${index + 1}`}
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
                    No requirements added yet
                  </p>
                )}
              </div>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Rubrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Grading Rubrics</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                rubricsFieldArray.append({ criterion: "", points: 0, description: "" })
              }
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Rubric
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
                              <FieldLabel>Criterion</FieldLabel>
                              <Input
                                {...field}
                                placeholder="Grading criterion"
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
                              <FieldLabel>Points</FieldLabel>
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
                          <FieldLabel>Description</FieldLabel>
                          <Textarea
                            {...field}
                            placeholder="Describe this grading criterion"
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
                No rubrics added yet. Add rubrics to define grading criteria.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attachments */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            <CardTitle>Attachments</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add files, documents, or resources for students to reference when completing this assignment.
              {!assignment?._id && " (Save the assignment first to enable file uploads)"}
            </p>
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <MediaSelector
                  key={attachment.mediaId}
                  media={attachment}
                  onSelection={(media) => {
                    // Selection handler if needed
                  }}
                  onRemove={() => handleRemoveAttachment(attachment.mediaId)}
                  type="course"
                  strings={{
                    buttonCaption: "Upload Attachment",
                    removeButtonCaption: "Remove",
                  }}
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
                  onSelection={(media) => {
                    // Will be handled by upload
                  }}
                  onRemove={() => {}}
                  type="course"
                  strings={{
                    buttonCaption: attachments.length === 0 ? "Upload First Attachment" : "Upload Another Attachment",
                    removeButtonCaption: "Remove",
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
                  Save the assignment first to upload attachments
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
