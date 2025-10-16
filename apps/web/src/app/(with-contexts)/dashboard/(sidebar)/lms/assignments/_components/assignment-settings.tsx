"use client";

import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { AssignmentTypeEnum } from "@workspace/common-logic/models/lms/assignment.types";
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
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { Calendar, Clock, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { format } from "date-fns";
import z from "zod";
import { useAssignmentContext } from "./assignment-context";

const AssignmentSettingsSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  course: z.object(
    {
      key: z.string(),
      title: z.string(),
    },
    { required_error: "Please select a course" },
  ),
  instructions: z.string().optional(),
  totalPoints: z.number().min(1),
  beginDate: z.date().optional(),
  dueDate: z.date().optional(),
  type: z.nativeEnum(AssignmentTypeEnum),
  allowLateSubmission: z.boolean(),
});

type AssignmentSettingsFormDataType = z.infer<typeof AssignmentSettingsSchema>;

interface CourseSelectItemType {
  key: string;
  title: string;
}

export default function AssignmentSettings() {
  const { assignment, mode } = useAssignmentContext();
  const router = useRouter();
  const { toast } = useToast();
  const trpcUtils = trpc.useUtils();
  const form = useForm<AssignmentSettingsFormDataType>({
    resolver: zodResolver(AssignmentSettingsSchema),
    defaultValues: {
      title: "",
      description: "",
      course: undefined,
      instructions: "",
      totalPoints: 100,
      beginDate: undefined,
      dueDate: undefined,
      type: AssignmentTypeEnum.PROJECT,
      allowLateSubmission: false,
    },
    mode: "onSubmit",
  });

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
        instructions: data.instructions,
        totalPoints: data.totalPoints,
        beginDate: data.beginDate,
        dueDate: data.dueDate,
        allowLateSubmission: data.allowLateSubmission,
      };

      if (mode === "create") {
        await createMutation.mutateAsync({
          data: transformedData,
        });
      } else if (mode === "edit" && assignment) {
        await updateMutation.mutateAsync({
          id: `${assignment._id}`,
          data: transformedData,
        });
      }
    },
    [mode, assignment, createMutation, updateMutation],
  );

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

  useEffect(() => {
    if (assignment && mode === "edit") {
      const assignmentWithPopulated = assignment as typeof assignment & {
        courseId?: string;
        beginDate?: Date;
        course?: { title: string };
      };

      form.reset({
        title: assignment.title || "",
        description: assignment.description || "",
        course: assignmentWithPopulated.course
          ? { key: assignmentWithPopulated.courseId || "", title: assignmentWithPopulated.course.title }
          : undefined,
        instructions: assignment.instructions || "",
        totalPoints: assignment.totalPoints || 100,
        beginDate: assignmentWithPopulated.beginDate
          ? new Date(assignmentWithPopulated.beginDate)
          : undefined,
        dueDate: assignment.dueDate ? new Date(assignment.dueDate) : undefined,
        type: assignment.type || AssignmentTypeEnum.PROJECT,
        allowLateSubmission: assignment.allowLateSubmission || false,
      });
    }
  }, [assignment, mode, form]);

  const handleCheckProject = useCallback(() => {
    const url = `${process.env.NEXT_PUBLIC_TUTOR_IDE_URL}/projects/init?externalAssignmentId=${assignment?._id}`;
    window.open(url, "_blank");
  }, [assignment?._id]);

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isSubmitting = form.formState.isSubmitting;
  
  const watchedBeginDate = form.watch("beginDate");
  const watchedDueDate = form.watch("dueDate");
  
  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <Card>
        <CardContent>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Begin</p>
                <p className="text-sm font-medium">
                  {watchedBeginDate ? format(new Date(watchedBeginDate), "MMM dd, HH:mm") : "Not set"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Due</p>
                <p className="text-sm font-medium">
                  {watchedDueDate ? format(new Date(watchedDueDate), "MMM dd, HH:mm") : "Not set"}
                </p>
              </div>
            </div>
            <div className="border-l pl-6">
              <p className="text-xs text-muted-foreground">Points</p>
              <p className="text-xl font-bold">{form.watch("totalPoints") || 0}</p>
            </div>
            <div className="border-l pl-6">
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="text-sm font-medium capitalize">
                {form.watch("type")?.replace(/_/g, " ").toLowerCase() || "Not set"}
              </p>
            </div>
            <Button type="submit" disabled={isSaving || isSubmitting} className="ml-auto">
              <Save className="h-4 w-4 mr-2" />
              {isSaving || isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
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
                    <FieldLabel>Assignment Title</FieldLabel>
                    <Input
                      {...field}
                      placeholder="Enter assignment title"
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
                      placeholder="Enter assignment description"
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
                    <FieldLabel>Associated Course</FieldLabel>
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
                        window.open(
                          `/dashboard/products/${item.key}`,
                          "_blank");
                      }}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="instructions"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Instructions</FieldLabel>
                    <Textarea
                      {...field}
                      placeholder="Enter detailed instructions for students"
                      rows={4}
                      aria-invalid={fieldState.invalid}
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
            <CardTitle>Assignment Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={form.control}
                  name="beginDate"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Begin Date</FieldLabel>
                      <Input
                        type="datetime-local"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? new Date(e.target.value)
                              : undefined,
                          )
                        }
                        value={
                          field.value
                            ? new Date(field.value).toISOString().slice(0, 16)
                            : ""
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
                  name="dueDate"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Due Date</FieldLabel>
                      <Input
                        {...field}
                        type="datetime-local"
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? new Date(e.target.value)
                              : undefined,
                          )
                        }
                        value={
                          field.value
                            ? new Date(field.value).toISOString().slice(0, 16)
                            : ""
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
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={form.control}
                  name="type"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="assignment-type">Assignment Type</FieldLabel>
                      <div>
                        <Select
                          name={field.name}
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger
                            id="assignment-type"
                            aria-invalid={fieldState.invalid}
                            className="w-full"
                          >
                            <SelectValue placeholder="Select assignment type" />
                          </SelectTrigger>
                          <SelectContent position="item-aligned">
                            <SelectItem value={AssignmentTypeEnum.ESSAY}>Essay</SelectItem>
                            <SelectItem value={AssignmentTypeEnum.PROJECT}>Project</SelectItem>
                            <SelectItem value={AssignmentTypeEnum.PRESENTATION}>Presentation</SelectItem>
                            <SelectItem value={AssignmentTypeEnum.FILE_UPLOAD}>File Upload</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <div className="flex flex-col justify-end">
                  {form.watch("type") === AssignmentTypeEnum.PROJECT && (
                    <Button variant="outline" className="w-full" size="sm" onClick={handleCheckProject}>
                      Check Project
                    </Button>
                  )}
                </div>
              </div>
              <Controller
                control={form.control}
                name="allowLateSubmission"
                render={({ field }) => (
                  <div className="flex flex-row items-center justify-between rounded-lg border p-4">
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
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
