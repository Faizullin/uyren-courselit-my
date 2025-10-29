"use client";

import { FormMode } from "@/components/dashboard/layout/types";
import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    RecurrenceTypeEnum,
    ScheduleStatusEnum,
    ScheduleTypeEnum,
} from "@workspace/common-logic/models/lms/schedule.types";
import {
    BaseDialog,
    DeleteConfirmNiceDialog,
    NiceModal,
    useDialogControl,
    useToast
} from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

const ScheduleSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  type: z.nativeEnum(ScheduleTypeEnum),
  startDate: z.string().min(1, "Start date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endDate: z.string().min(1, "End date is required"),
  endTime: z.string().min(1, "End time is required"),
  allDay: z.boolean(),
  instructorId: z.string().optional(),
  recurrenceType: z.nativeEnum(RecurrenceTypeEnum),
  recurrenceInterval: z.number().min(1),
  recurrenceDaysOfWeek: z.array(z.number()).optional(),
  recurrenceEndDate: z.string().optional(),
  locationName: z.string().optional(),
  locationOnline: z.boolean(),
  meetingUrl: z.string().url().optional().or(z.literal("")),
  remindersEnabled: z.boolean(),
  reminderMinutes: z.array(z.number()),
});

type ScheduleFormDataType = z.infer<typeof ScheduleSchema>;
type CohortType = GeneralRouterOutputs["lmsModule"]["cohortModule"]["cohort"]["getById"];

interface CohortScheduleEditDialogProps {
  control: ReturnType<typeof useDialogControl<{ cohort: CohortType }>>;
  onSuccess?: () => void;
}

export function CohortScheduleEditDialog({ control, onSuccess }: CohortScheduleEditDialogProps) {
  const { t } = useTranslation(["dashboard", "common"]);
  const { toast } = useToast();
  const trpcUtils = trpc.useUtils();
  const [mode, setMode] = useState<FormMode>("create");

  const cohort = control.data?.cohort;
  const cohortId = cohort?._id || "";

  const form = useForm<ScheduleFormDataType>({
    resolver: zodResolver(ScheduleSchema),
    defaultValues: {
      title: "",
      description: "",
      type: ScheduleTypeEnum.LIVE_SESSION,
      startDate: new Date().toISOString().split("T")[0],
      startTime: "09:00",
      endDate: new Date().toISOString().split("T")[0],
      endTime: "10:00",
      allDay: false,
      instructorId: "",
      recurrenceType: RecurrenceTypeEnum.NONE,
      recurrenceInterval: 1,
      recurrenceDaysOfWeek: [],
      recurrenceEndDate: "",
      locationName: "",
      locationOnline: true,
      meetingUrl: "",
      remindersEnabled: true,
      reminderMinutes: [15, 60],
    },
  });

  // Load schedule settings when dialog opens
  const scheduleSettingsQuery = trpc.lmsModule.cohortModule.cohort.getCohortScheduleSettings.useQuery(
    { cohortId: cohortId, upsert: false },
    { 
        enabled: !!cohortId && control.isVisible,
        staleTime: 0,
     }
  );

  useEffect(() => {
    if (control.isVisible && scheduleSettingsQuery.data) {
      const scheduleEvent = scheduleSettingsQuery.data.scheduleEvent;
      setMode(scheduleEvent ? "edit" : "create");

      if (scheduleEvent) {
        const start = new Date(scheduleEvent.startDate);
        const end = new Date(scheduleEvent.endDate);
        
        form.reset({
          title: scheduleEvent.title,
          description: scheduleEvent.description || "",
          type: scheduleEvent.type,
          startDate: start.toISOString().split("T")[0],
          startTime: start.toTimeString().substring(0, 5),
          endDate: end.toISOString().split("T")[0],
          endTime: end.toTimeString().substring(0, 5),
          allDay: scheduleEvent.allDay,
          instructorId: scheduleEvent.instructorId?.toString() || "",
          recurrenceType: scheduleEvent.recurrence?.type || RecurrenceTypeEnum.NONE,
          recurrenceInterval: scheduleEvent.recurrence?.interval || 1,
          recurrenceDaysOfWeek: scheduleEvent.recurrence?.daysOfWeek || [],
          recurrenceEndDate: scheduleEvent.recurrence?.endDate ? new Date(scheduleEvent.recurrence.endDate).toISOString().split("T")[0] : "",
          locationName: scheduleEvent.location?.name || "",
          locationOnline: scheduleEvent.location?.online ?? true,
          meetingUrl: scheduleEvent.location?.meetingUrl || "",
          remindersEnabled: scheduleEvent.reminders?.enabled ?? true,
          reminderMinutes: scheduleEvent.reminders?.minutesBefore || [15, 60],
        });
      } else {
        form.reset({
          title: cohort?.title ? `${cohort.title} Schedule` : "",
          description: "",
          type: ScheduleTypeEnum.LIVE_SESSION,
          startDate: cohort?.beginDate ? new Date(cohort.beginDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          startTime: "09:00",
          endDate: cohort?.endDate ? new Date(cohort.endDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          endTime: "10:00",
          allDay: false,
          instructorId: cohort?.instructorId?.toString() || "",
          recurrenceType: RecurrenceTypeEnum.NONE,
          recurrenceInterval: 1,
          recurrenceDaysOfWeek: [],
          recurrenceEndDate: "",
          locationName: "",
          locationOnline: true,
          meetingUrl: "",
          remindersEnabled: true,
          reminderMinutes: [15, 60],
        });
      }
    }
  }, [control.isVisible, scheduleSettingsQuery.data, cohort, form]);

  const createMutation = trpc.lmsModule.schedule.create.useMutation({
    onSuccess: () => {
      toast({ title: t("common:success"), description: t("common:toast.created_successfully", { item: t("common:schedule_event") }) });
      onSuccess?.();
      handleClose();
    },
    onError: (err) => {
      toast({ title: t("common:error"), description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = trpc.lmsModule.schedule.update.useMutation({
    onSuccess: () => {
      toast({ title: t("common:success"), description: t("common:toast.updated_successfully", { item: t("common:schedule_event") }) });
      onSuccess?.();
      handleClose();
    },
    onError: (err) => {
      toast({ title: t("common:error"), description: err.message, variant: "destructive" });
    },
  });

  const handleClose = useCallback(() => {
    control.hide();
    form.reset();
    setMode("create");
  }, [control, form]);

  const handleSubmit = useCallback(
    async (data: ScheduleFormDataType) => {
      const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
      const endDateTime = new Date(`${data.endDate}T${data.endTime}`);

      const submitData = {
        title: data.title,
        description: data.description,
        type: data.type,
        status: ScheduleStatusEnum.ACTIVE,
        entityType: "cohort",
        entityId: cohortId,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        allDay: data.allDay,
        cohortId: cohortId,
        instructorId: data.instructorId || undefined,
        // ✅ recurrence is REQUIRED - always send
        recurrence: {
          type: data.recurrenceType,
          interval: data.recurrenceInterval,
          daysOfWeek: data.recurrenceDaysOfWeek,
          endDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate).toISOString() : undefined,
        },
        // ✅ location is OPTIONAL - only send if online or has name
        location: (data.locationOnline || data.locationName) ? {
          name: data.locationName || "",
          online: data.locationOnline,
          meetingUrl: data.meetingUrl || undefined,
        } : undefined,
        // ✅ reminders is REQUIRED - always send
        reminders: {
          enabled: data.remindersEnabled,
          minutesBefore: data.reminderMinutes,
        },
      };

      if (mode === "edit" && scheduleSettingsQuery.data?.scheduleEvent?._id) {
        await updateMutation.mutateAsync({ id: scheduleSettingsQuery.data.scheduleEvent._id, data: submitData });
      } else {
        await createMutation.mutateAsync({ data: submitData });
      }
    },
    [cohortId, mode, scheduleSettingsQuery.data, createMutation, updateMutation],
  );

  const recurrenceType = form.watch("recurrenceType");
  const locationOnline = form.watch("locationOnline");

  const isLoading = createMutation.isPending || updateMutation.isPending || scheduleSettingsQuery.isLoading;

  const dialogConfig = useMemo(() => ({
    title: mode === "edit" ? t("dashboard:schedule_dialog.edit_schedule_event") : t("dashboard:schedule_dialog.create_schedule_event"),
    submitText: mode === "edit" ? t("common:update") : t("common:create"),
  }), [mode, t]);

  const handleCancel = () => {
    handleClose();
};

const deleteMutation = trpc.lmsModule.schedule.delete.useMutation({
    onSuccess: () => {
        toast({ title: t("common:success"), description: t("common:toast.deleted_successfully", { item: t("common:schedule_event") }) });
        onSuccess?.();
        handleClose();
    },
    onError: (err) => {
        toast({ title: t("common:error"), description: err.message, variant: "destructive" });
    },
});
const handleDelete = useCallback(() => {
    NiceModal.show(DeleteConfirmNiceDialog, {
        title: t("dashboard:schedule_dialog.delete_schedule_event"),
    }).then((result) => {
        if (result.reason === "confirm") {
            deleteMutation.mutate({ id: scheduleSettingsQuery.data?.scheduleEvent?._id! });
        }
    });
}, [deleteMutation, scheduleSettingsQuery.data?.scheduleEvent?._id, t]);

const footer = (
    <>
        <Button type="button" variant="outline" onClick={handleDelete} disabled={mode !== "edit"}>
            {t("common:delete")}
        </Button>
        <Button type="button" variant="outline" onClick={handleCancel}>
            {t("common:cancel")}
        </Button>
        <Button type="button" onClick={form.handleSubmit(handleSubmit)} disabled={isLoading}>
            {isLoading ? t("common:saving") : t("common:save")}
        </Button>
    </>
);

  return (
    <BaseDialog
      open={control.isVisible}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      title={dialogConfig.title}
      maxWidth="4xl"
      footer={footer}
    >
      <FieldGroup>
        {/* Title */}
        <Controller
          name="title"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="schedule-title">{t("common:title")} *</FieldLabel>
              <Input
                {...field}
                id="schedule-title"
                placeholder={t("dashboard:schedule_dialog.event_title_placeholder")}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Type */}
        <Controller
          name="type"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="schedule-type">{t("common:type")} *</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="schedule-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ScheduleTypeEnum.LIVE_SESSION}>{t("dashboard:schedule_dialog.types.live_session")}</SelectItem>
                  <SelectItem value={ScheduleTypeEnum.ASSIGNMENT}>{t("dashboard:schedule_dialog.types.assignment")}</SelectItem>
                  <SelectItem value={ScheduleTypeEnum.QUIZ}>{t("dashboard:schedule_dialog.types.quiz")}</SelectItem>
                  <SelectItem value={ScheduleTypeEnum.DEADLINE}>{t("dashboard:schedule_dialog.types.deadline")}</SelectItem>
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Description */}
        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="schedule-description">{t("common:description")}</FieldLabel>
              <Textarea
                {...field}
                id="schedule-description"
                placeholder={t("dashboard:schedule_dialog.event_description_placeholder")}
                aria-invalid={fieldState.invalid}
                rows={3}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="startDate"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="schedule-start-date">{t("common:start_date")} *</FieldLabel>
                <Input
                  {...field}
                  id="schedule-start-date"
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
                <FieldLabel htmlFor="schedule-start-time">{t("dashboard:schedule_dialog.start_time")} *</FieldLabel>
                <Input
                  {...field}
                  id="schedule-start-time"
                  type="time"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="endDate"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="schedule-end-date">{t("common:end_date")} *</FieldLabel>
                <Input
                  {...field}
                  id="schedule-end-date"
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
                <FieldLabel htmlFor="schedule-end-time">{t("dashboard:schedule_dialog.end_time")} *</FieldLabel>
                <Input
                  {...field}
                  id="schedule-end-time"
                  type="time"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        {/* All Day Toggle */}
        <Controller
          name="allDay"
          control={form.control}
          render={({ field }) => (
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="schedule-all-day">{t("dashboard:schedule_dialog.all_day_event")}</FieldLabel>
                <Switch
                  id="schedule-all-day"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            </Field>
          )}
        />

        {/* Recurrence */}
        <Controller
          name="recurrenceType"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="schedule-recurrence">{t("dashboard:schedule_dialog.recurrence")}</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="schedule-recurrence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={RecurrenceTypeEnum.NONE}>{t("dashboard:schedule_dialog.recurrence_types.none")}</SelectItem>
                  <SelectItem value={RecurrenceTypeEnum.DAILY}>{t("dashboard:schedule_dialog.recurrence_types.daily")}</SelectItem>
                  <SelectItem value={RecurrenceTypeEnum.WEEKLY}>{t("dashboard:schedule_dialog.recurrence_types.weekly")}</SelectItem>
                  <SelectItem value={RecurrenceTypeEnum.MONTHLY}>{t("dashboard:schedule_dialog.recurrence_types.monthly")}</SelectItem>
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {recurrenceType !== RecurrenceTypeEnum.NONE && (
          <>
            <Controller
              name="recurrenceInterval"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="schedule-recurrence-interval">{t("dashboard:schedule_dialog.repeat_every")}</FieldLabel>
                  <Input
                    {...field}
                    id="schedule-recurrence-interval"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={field.value || 1}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="recurrenceEndDate"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="schedule-recurrence-end">{t("dashboard:schedule_dialog.end_recurrence")}</FieldLabel>
                  <Input
                    {...field}
                    id="schedule-recurrence-end"
                    type="date"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </>
        )}

        {/* Location */}
        <Controller
          name="locationOnline"
          control={form.control}
          render={({ field }) => (
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="schedule-online">{t("dashboard:schedule_dialog.online_event")}</FieldLabel>
                <Switch
                  id="schedule-online"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            </Field>
          )}
        />

        {locationOnline && (
          <Controller
            name="meetingUrl"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="schedule-meeting-url">{t("dashboard:schedule_dialog.meeting_url")}</FieldLabel>
                <Input
                  {...field}
                  id="schedule-meeting-url"
                  type="url"
                  placeholder={t("dashboard:schedule_dialog.meeting_url_placeholder")}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        )}

        {!locationOnline && (
          <Controller
            name="locationName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="schedule-location">{t("dashboard:schedule_dialog.location_name")}</FieldLabel>
                <Input
                  {...field}
                  id="schedule-location"
                  placeholder={t("dashboard:schedule_dialog.location_placeholder")}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        )}

        {/* Reminders */}
        <Controller
          name="remindersEnabled"
          control={form.control}
          render={({ field }) => (
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="schedule-reminders">{t("dashboard:schedule_dialog.enable_reminders")}</FieldLabel>
                <Switch
                  id="schedule-reminders"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            </Field>
          )}
        />
      </FieldGroup>
    </BaseDialog>
  );
}
