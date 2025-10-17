"use client";

import { FormMode } from "@/components/dashboard/layout/types";
import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormDialog, NiceModal, NiceModalHocProps, useToast, ComboBox2 } from "@workspace/components-library";
import { RecurrenceTypeEnum, ScheduleTypeEnum } from "@workspace/common-logic/models/lms/schedule.types";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { Switch } from "@workspace/ui/components/switch";
import { useCallback, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const ScheduleEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  type: z.nativeEnum(ScheduleTypeEnum),
  startDate: z.string().min(1, "Start date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endDate: z.string().min(1, "End date is required"),
  endTime: z.string().min(1, "End time is required"),
  allDay: z.boolean(),
  locationName: z.string().optional(),
  locationOnline: z.boolean(),
  locationMeetingUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  instructorId: z.string().optional(),
  recurrenceType: z.nativeEnum(RecurrenceTypeEnum),
  recurrenceInterval: z.number().min(1),
  recurrenceEndDate: z.string().optional().or(z.literal("")),
  remindersEnabled: z.boolean(),
});

type ScheduleEventFormData = z.infer<typeof ScheduleEventSchema>;

type InstructorItem = {
  _id: string;
  fullName: string;
};

interface ScheduleEventFormDialogArgs {
  mode: FormMode;
  cohortId: string;
  eventId?: string;
  initialDate?: string; // YYYY-MM-DD
  initialStartTime?: string; // HH:mm
  initialEndTime?: string; // HH:mm
}

export const ScheduleEventFormDialog = NiceModal.create<
  NiceModalHocProps & { args: ScheduleEventFormDialogArgs },
  { reason: "cancel" | "submit"; data?: any }
>(({ args }) => {
  const { mode, cohortId, eventId, initialDate, initialStartTime, initialEndTime } = args;
  const { visible, hide, resolve } = NiceModal.useModal();
  const { toast } = useToast();
  const trpcUtils = trpc.useUtils();

  const form = useForm<ScheduleEventFormData>({
    resolver: zodResolver(ScheduleEventSchema),
    defaultValues: {
      title: "",
      description: "",
      type: ScheduleTypeEnum.LIVE_SESSION,
      startDate: initialDate || "",
      startTime: initialStartTime || "09:00",
      endDate: initialDate || "",
      endTime: initialEndTime || "10:00",
      allDay: false,
      locationName: "",
      locationOnline: true,
      locationMeetingUrl: "",
      instructorId: "",
      recurrenceType: RecurrenceTypeEnum.NONE,
      recurrenceInterval: 1,
      recurrenceEndDate: "",
      remindersEnabled: true,
    },
  });

  // Load existing event data in edit mode
  const loadEventQuery = trpc.lmsModule.schedule.getById.useQuery(
    { id: eventId! },
    { enabled: mode === "edit" && !!eventId }
  );

  // Populate form when editing
  useEffect(() => {
    if (mode === "edit" && loadEventQuery.data) {
      const event = loadEventQuery.data;
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);

      form.reset({
        title: event.title,
        description: event.description || "",
        type: event.type,
        startDate: startDate.toISOString().split('T')[0],
        startTime: startDate.toTimeString().slice(0, 5),
        endDate: endDate.toISOString().split('T')[0],
        endTime: endDate.toTimeString().slice(0, 5),
        allDay: event.allDay,
        locationName: event.location?.name || "",
        locationOnline: event.location?.online || false,
        locationMeetingUrl: event.location?.meetingUrl || "",
        instructorId: event.instructorId?.toString() || "",
        recurrenceType: event.recurrence?.type || RecurrenceTypeEnum.NONE,
        recurrenceInterval: event.recurrence?.interval || 1,
        recurrenceEndDate: event.recurrence?.endDate ? new Date(event.recurrence.endDate).toISOString().split('T')[0] : "",
        remindersEnabled: event.reminders?.enabled || true,
      });
    }
  }, [mode, loadEventQuery.data, form]);

  // Reset form when dialog becomes visible in create mode
  useEffect(() => {
    if (visible && mode === "create") {
      form.reset({
        title: "",
        description: "",
        type: ScheduleTypeEnum.LIVE_SESSION,
        startDate: initialDate || "",
        startTime: initialStartTime || "09:00",
        endDate: initialDate || "",
        endTime: initialEndTime || "10:00",
        allDay: false,
        locationName: "",
        locationOnline: true,
        locationMeetingUrl: "",
        instructorId: "",
        recurrenceType: RecurrenceTypeEnum.NONE,
        recurrenceInterval: 1,
        recurrenceEndDate: "",
        remindersEnabled: true,
      });
    }
  }, [visible, mode, initialDate, initialStartTime, initialEndTime, form]);

  const createEventMutation = trpc.lmsModule.schedule.create.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Schedule event created successfully",
      });
      trpcUtils.lmsModule.cohortModule.cohort.getSchedule.invalidate();
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

  const updateEventMutation = trpc.lmsModule.schedule.update.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Schedule event updated successfully",
      });
      trpcUtils.lmsModule.cohortModule.cohort.getSchedule.invalidate();
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

  const searchInstructors = useCallback(
    async (search: string, offset: number, size: number): Promise<InstructorItem[]> => {
      const result = await trpcUtils.userModule.user.list.fetch({
        pagination: { skip: offset, take: size },
        search: search ? { q: search } : undefined,
      });
      return result.items.map((user) => ({
        _id: user._id,
        fullName: `${user.firstName} ${user.lastName}`.trim() || user.email,
      }));
    },
    [trpcUtils]
  );

  const handleSubmit = useCallback(
    async (data: ScheduleEventFormData) => {
      // Combine date and time into ISO datetime strings
      const startDateTime = new Date(`${data.startDate}T${data.startTime}:00`).toISOString();
      const endDateTime = new Date(`${data.endDate}T${data.endTime}:00`).toISOString();

      const submitData = {
        title: data.title,
        description: data.description,
        type: data.type,
        entityType: "cohort",
        entityId: cohortId,
        startDate: startDateTime,
        endDate: endDateTime,
        allDay: data.allDay,
        recurrenceType: data.recurrenceType,
        recurrenceInterval: data.recurrenceInterval,
        recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate).toISOString() : undefined,
        locationName: data.locationName || undefined,
        locationOnline: data.locationOnline,
        locationMeetingUrl: data.locationMeetingUrl || undefined,
        instructorId: data.instructorId || undefined,
        cohortId: cohortId,
        remindersEnabled: data.remindersEnabled,
        remindersMinutesBefore: [15, 60],
      };

      if (mode === "create") {
        await createEventMutation.mutateAsync({ data: submitData });
      } else {
        await updateEventMutation.mutateAsync({ id: eventId!, data: submitData });
      }
    },
    [mode, createEventMutation, updateEventMutation, cohortId, eventId]
  );

  const handleCancel = useCallback(() => {
    resolve({ reason: "cancel" });
    hide();
  }, [resolve, hide]);

  const handleFormSubmit = useCallback(() => {
    form.handleSubmit(handleSubmit)();
  }, [form, handleSubmit]);

  const isLoading = 
    createEventMutation.isPending || 
    updateEventMutation.isPending || 
    form.formState.isSubmitting ||
    (mode === "edit" && loadEventQuery.isLoading);

  return (
    <FormDialog
      open={visible}
      onOpenChange={(open) => {
        if (!open) {
          handleCancel();
        }
      }}
      title={mode === "create" ? "Create Schedule Event" : "Edit Schedule Event"}
      onSubmit={handleFormSubmit}
      onCancel={handleCancel}
      isLoading={isLoading}
      submitText={mode === "create" ? "Create Event" : "Update Event"}
      cancelText="Cancel"
      maxWidth="4xl"
    >
      <FieldGroup>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div className="md:col-span-2">
            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Event Title</FieldLabel>
                  <Input
                    {...field}
                    placeholder="e.g., Live Session: Introduction to React"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          {/* Type */}
          <Controller
            name="type"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Event Type</FieldLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ScheduleTypeEnum.LIVE_SESSION}>Live Session</SelectItem>
                    <SelectItem value={ScheduleTypeEnum.LESSON}>Lesson</SelectItem>
                    <SelectItem value={ScheduleTypeEnum.ASSIGNMENT}>Assignment</SelectItem>
                    <SelectItem value={ScheduleTypeEnum.QUIZ}>Quiz</SelectItem>
                    <SelectItem value={ScheduleTypeEnum.EXAM}>Exam</SelectItem>
                    <SelectItem value={ScheduleTypeEnum.DEADLINE}>Deadline</SelectItem>
                    <SelectItem value={ScheduleTypeEnum.COURSE}>Course</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* Instructor */}
          <Controller
            name="instructorId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Instructor (Optional)</FieldLabel>
                <ComboBox2<InstructorItem>
                  title="Select instructor"
                  valueKey="_id"
                  value={field.value ? { _id: field.value, fullName: "" } : undefined}
                  searchFn={searchInstructors}
                  renderLabel={(item) => item.fullName}
                  onChange={(item) => field.onChange(item?._id || "")}
                  multiple={false}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* Description */}
          <div className="md:col-span-2">
            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Description (Optional)</FieldLabel>
                  <Textarea
                    {...field}
                    placeholder="Enter event description"
                    rows={3}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          {/* Date and Time */}
          <Controller
            name="startDate"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Start Date</FieldLabel>
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
            name="startTime"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Start Time</FieldLabel>
                <Input
                  {...field}
                  type="time"
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
                <FieldLabel>End Date</FieldLabel>
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
            name="endTime"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>End Time</FieldLabel>
                <Input
                  {...field}
                  type="time"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* All Day */}
          <div className="md:col-span-2">
            <Controller
              name="allDay"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <FieldLabel className="!mb-0">All Day Event</FieldLabel>
                  </div>
                </Field>
              )}
            />
          </div>

          {/* Location */}
          <Controller
            name="locationName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Location Name (Optional)</FieldLabel>
                <Input
                  {...field}
                  placeholder="e.g., Conference Room A or Zoom"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* Online Location */}
          <div className="flex items-center">
            <Controller
              name="locationOnline"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <FieldLabel className="!mb-0">Online Event</FieldLabel>
                  </div>
                </Field>
              )}
            />
          </div>

          {/* Meeting URL */}
          {form.watch("locationOnline") && (
            <div className="md:col-span-2">
              <Controller
                name="locationMeetingUrl"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Meeting URL (Optional)</FieldLabel>
                    <Input
                      {...field}
                      type="url"
                      placeholder="https://zoom.us/j/..."
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
          )}

          {/* Recurrence */}
          <Controller
            name="recurrenceType"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Recurrence</FieldLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recurrence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={RecurrenceTypeEnum.NONE}>None</SelectItem>
                    <SelectItem value={RecurrenceTypeEnum.DAILY}>Daily</SelectItem>
                    <SelectItem value={RecurrenceTypeEnum.WEEKLY}>Weekly</SelectItem>
                    <SelectItem value={RecurrenceTypeEnum.MONTHLY}>Monthly</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {form.watch("recurrenceType") !== RecurrenceTypeEnum.NONE && (
            <>
              <Controller
                name="recurrenceInterval"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Repeat Every</FieldLabel>
                    <Input
                      {...field}
                      type="number"
                      min="1"
                      value={field.value}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <div className="md:col-span-2">
                <Controller
                  name="recurrenceEndDate"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Recurrence End Date (Optional)</FieldLabel>
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
            </>
          )}

          {/* Reminders */}
          <div className="md:col-span-2">
            <Controller
              name="remindersEnabled"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <FieldLabel className="!mb-0">Enable Reminders (15 & 60 minutes before)</FieldLabel>
                  </div>
                </Field>
              )}
            />
          </div>
        </div>
      </FieldGroup>
    </FormDialog>
  );
});

