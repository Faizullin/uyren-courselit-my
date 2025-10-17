"use client";

import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { CohortStatusEnum } from "@workspace/common-logic/models/lms/cohort.types";
import {
  ComboBox2,
  FormDialog,
  NiceModal,
  NiceModalHocProps,
  useToast,
} from "@workspace/components-library";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { slugify } from "@workspace/utils";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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

interface CohortCreateDialogProps extends NiceModalHocProps {
  courseId?: string;
}

export const CohortCreateNiceDialog = NiceModal.create<
  CohortCreateDialogProps,
  { reason: "cancel" | "submit"; data?: any }
>(({ courseId }) => {
  const { visible, hide, resolve } = NiceModal.useModal();
  const { toast } = useToast();
  const trpcUtils = trpc.useUtils();
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | undefined>(undefined);

  const form = useForm<CohortFormDataType>({
    resolver: zodResolver(CohortSchema),
    defaultValues: {
      title: "",
      courseId: courseId || "",
      description: "",
      inviteCode: "",
      beginDate: "",
      endDate: "",
      durationInWeeks: undefined,
      maxCapacity: undefined,
    },
  });

  useEffect(() => {
    if (visible) {
      form.reset({
        title: "",
        courseId: courseId || "",
        description: "",
        inviteCode: "",
        beginDate: "",
        endDate: "",
        durationInWeeks: undefined,
        maxCapacity: undefined,
      });
    }
  }, [visible, courseId, form]);

  // Load course details when courseId is provided
  useEffect(() => {
    const loadCourse = async () => {
      if (courseId && visible) {
        try {
          const course = await trpcUtils.lmsModule.courseModule.course.getById.fetch({
            id: courseId,
          });
          if (course) {
            setSelectedCourse({ _id: course._id, title: course.title });
          }
        } catch (error) {
          console.error("Failed to load course:", error);
          setSelectedCourse(undefined);
        }
      } else {
        setSelectedCourse(undefined);
      }
    };
    
    loadCourse();
  }, [courseId, visible, trpcUtils]);

  const createCohortMutation = trpc.lmsModule.cohortModule.cohort.create.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Cohort created successfully",
      });
      trpcUtils.lmsModule.cohortModule.cohort.list.invalidate();
      resolve({ reason: "submit", data });
      hide();
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = useCallback(
    async (data: CohortFormDataType) => {
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
    },
    [createCohortMutation],
  );

  const searchCourses = useCallback(
    async (search: string, offset: number, size: number): Promise<CourseItem[]> => {
      const result = await trpcUtils.lmsModule.courseModule.course.list.fetch({
        pagination: { skip: offset, take: size },
        search: search ? { q: search } : undefined,
      });
      return result.items.map((course) => ({ _id: course._id, title: course.title }));
    },
    [trpcUtils],
  );

  const handleCancel = useCallback(() => {
    resolve({ reason: "cancel" });
    hide();
  }, [resolve, hide]);

  return (
    <FormDialog
      open={visible}
      onOpenChange={(open) => {
        if (!open) {
          handleCancel();
        }
      }}
      title="Create New Cohort"
      onSubmit={form.handleSubmit(handleSubmit)}
      onCancel={handleCancel}
      isLoading={createCohortMutation.isPending || form.formState.isSubmitting}
      submitText="Create Cohort"
      cancelText="Cancel"
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
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
                value={selectedCourse || (field.value ? { _id: field.value, title: "" } : undefined)}
                searchFn={searchCourses}
                renderLabel={(item) => item.title}
                onChange={(item) => {
                  field.onChange(item?._id || "");
                  setSelectedCourse(item || undefined);
                }}
                multiple={false}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
                placeholder="Enter cohort description"
                aria-invalid={fieldState.invalid}
                rows={3}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
                placeholder="Enter unique invite code"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
                <FieldLabel>Duration (Weeks)</FieldLabel>
                <Input
                  {...field}
                  type="number"
                  placeholder="e.g., 12"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="maxCapacity"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Max Capacity (Optional)</FieldLabel>
                <Input
                  {...field}
                  type="number"
                  placeholder="e.g., 50"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
      </FieldGroup>
    </FormDialog>
  );
});

