import { zodResolver } from '@hookform/resolvers/zod'
import { TRPCClientError } from '@trpc/client'
import { RecurrenceTypeEnum, ScheduleTypeEnum } from '@workspace/common-logic/models/lms/schedule.types'
import { BaseDialog, DeleteConfirmNiceDialog, NiceModal, useToast } from '@workspace/components-library'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select'
import { Switch } from '@workspace/ui/components/switch'
import { Textarea } from '@workspace/ui/components/textarea'
import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useCalendarContext } from '../calendar-context'
import type { ScheduleCalendarEvent } from '../services/schedule-calendar-service'

// Form schema matching backend structure (nested objects match backend model)
const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string(),
  type: z.nativeEnum(ScheduleTypeEnum),
  startDate: z.string().min(1, 'Start date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endDate: z.string().min(1, 'End date is required'),
  endTime: z.string().min(1, 'End time is required'),
  allDay: z.boolean(),
  location: z.object({
    name: z.string(),
    online: z.boolean(),
    meetingUrl: z.string(),
  }),
  recurrence: z.object({
    type: z.nativeEnum(RecurrenceTypeEnum),
    interval: z.number().min(1),
    daysOfWeek: z.array(z.number().min(0).max(6)),
    endDate: z.string(),
  }),
  reminders: z.object({
    enabled: z.boolean(),
    minutesBefore: z.array(z.number()),
  }),
  instructorId: z.string(),
})

type FormData = z.infer<typeof formSchema>

export default function CalendarEventDialog() {
  const { dialogControl, date, createEvent, updateEvent, deleteEvent, service } = 
    useCalendarContext<ScheduleCalendarEvent>()
  const { toast } = useToast()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      type: ScheduleTypeEnum.LIVE_SESSION,
      startDate: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endDate: format(new Date(), 'yyyy-MM-dd'),
      endTime: '10:00',
      allDay: false,
      location: {
        name: '',
        online: false,
        meetingUrl: '',
      },
      recurrence: {
        type: RecurrenceTypeEnum.NONE,
        interval: 1,
        daysOfWeek: [],
        endDate: '',
      },
      reminders: {
        enabled: true,
        minutesBefore: [15, 60],
      },
      instructorId: '',
    },
  })

  const dialogData = dialogControl.data
  const mode = dialogData?.mode || 'create'
  const eventId = dialogData?.eventId

  // Update form defaults when dialog opens
  useEffect(() => {
    if (dialogControl.isVisible && dialogData) {
      const initialDate = dialogData.initialDate || date
      
      form.reset({
        ...form.getValues(),
        startDate: format(initialDate, 'yyyy-MM-dd'),
        startTime: dialogData.initialStartTime || '09:00',
        endDate: format(initialDate, 'yyyy-MM-dd'),
        endTime: dialogData.initialEndTime || '10:00',
      })
    }
  }, [dialogControl.isVisible, dialogData, date, form])

  // Load existing event data in edit mode
  useEffect(() => {
    const loadEventData = async () => {
      if (mode === 'edit' && eventId) {
        try {
          const event = await service.getEventById(eventId)
          const startDate = new Date(event.start)
          const endDate = new Date(event.end)

          form.reset({
            title: event.title,
            description: event.description || '',
            type: event.type || ScheduleTypeEnum.LIVE_SESSION,
            startDate: format(startDate, 'yyyy-MM-dd'),
            startTime: format(startDate, 'HH:mm'),
            endDate: format(endDate, 'yyyy-MM-dd'),
            endTime: format(endDate, 'HH:mm'),
            allDay: event.allDay || false,
            location: {
              name: event.location?.name || '',
              online: event.location?.online || false,
              meetingUrl: event.location?.meetingUrl || '',
            },
            recurrence: {
              type: event.recurrence?.type || RecurrenceTypeEnum.NONE,
              interval: event.recurrence?.interval || 1,
              daysOfWeek: event.recurrence?.daysOfWeek || [],
              endDate: event.recurrence?.endDate ? format(new Date(event.recurrence.endDate), 'yyyy-MM-dd') : '',
            },
            reminders: {
              enabled: event.reminders?.enabled ?? true,
              minutesBefore: event.reminders?.minutesBefore || [15, 60],
            },
            instructorId: event.instructor?._id || '',
          })
        } catch (error) {
          console.error('Failed to load event:', error)
        }
      }
    }

    if (dialogControl.isVisible && mode === 'edit') {
      loadEventData()
    }
  }, [dialogControl.isVisible, mode, eventId, service, form])

  const handleSubmit = async (values: FormData) => {
    try {
      const startDateTime = new Date(`${values.startDate}T${values.startTime}`).toISOString()
      const endDateTime = new Date(`${values.endDate}T${values.endTime}`).toISOString()

      const eventData = {
        title: values.title,
        description: values.description,
        type: values.type,
        startDate: startDateTime,
        endDate: endDateTime,
        allDay: values.allDay,
        locationName: values.location.name,
        locationOnline: values.location.online,
        locationMeetingUrl: values.location.meetingUrl || undefined,
        recurrenceType: values.recurrence.type,
        recurrenceInterval: values.recurrence.interval,
        recurrenceDaysOfWeek: values.recurrence.daysOfWeek,
        recurrenceEndDate: values.recurrence.endDate ? new Date(values.recurrence.endDate).toISOString() : undefined,
        remindersEnabled: values.reminders.enabled,
        remindersMinutesBefore: values.reminders.minutesBefore,
        instructorId: values.instructorId || undefined,
      }

      if (mode === 'create') {
        await createEvent(eventData)
      } else {
        await updateEvent(eventId!, eventData)
      }

      dialogControl.hide()
      form.reset()
    } catch (error: any) {
      console.error(`Failed to ${mode} event:`, error)
      
      // Parse error message from backend
      let errorMessage = ``
      if(error instanceof TRPCClientError){
        if (error.data?.zodError) {
          error.data?.zodError.forEach((error: any) => {
            errorMessage += `${error.message}\n`
          })
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleDelete = useCallback(async () => {
    if (mode === 'edit' && eventId) {
      const result = await NiceModal.show(DeleteConfirmNiceDialog, {
        title: "Delete Event",
        message: `Are you sure you want to delete "${form.getValues('title') || 'this event'}"? This action cannot be undone.`,
      })

      if (result.reason === "confirm") {
        try {
          await deleteEvent(eventId)
          toast({
            title: "Success",
            description: "Event deleted successfully",
          })
          dialogControl.hide()
          form.reset()
        } catch (error: any) {
          console.error('Failed to delete event:', error)
          
          // Parse error message from backend
          let errorMessage = "Failed to delete event"
          if (error?.message) {
            try {
              const errorData = JSON.parse(error.message)
              errorMessage = errorData.message || errorData.error || errorMessage
            } catch {
              errorMessage = error.message || errorMessage
            }
          }

          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          })
        }
      }
    }
  }, [mode, eventId, form, deleteEvent, toast, dialogControl])

  const handleCancel = useCallback(() => {
    dialogControl.hide()
    form.reset()
  }, [dialogControl, form])

  const handleFormSubmit = useCallback(() => {
    form.handleSubmit(handleSubmit)()
  }, [form, handleSubmit])

  return (
    <BaseDialog
      open={dialogControl.isVisible}
      onOpenChange={(open) => {
        if (!open) {
          handleCancel()
        }
      }}
      title={mode === 'create' ? 'Create Event' : 'Edit Event'}
      maxWidth="4xl"
      footer={
        <div className="flex justify-between items-center w-full">
          {/* Delete button for edit mode */}
          {mode === 'edit' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Event
            </Button>
          )}
          
          {/* Form action buttons */}
          <div className="flex gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              form="calendar-event-form"
              onClick={handleFormSubmit}
              disabled={form.formState.isSubmitting}
            >
              {mode === 'create' ? 'Create' : 'Update'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="calendar-event-form" onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Controller
            control={form.control}
            name="title"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="title">Title *</FieldLabel>
                <Input
                  id="title"
                  {...field}
                  placeholder="Event title"
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
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Textarea
                  id="description"
                  {...field}
                  placeholder="Event description"
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
            name="type"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="type">Type *</FieldLabel>
                <div>
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="type" aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ScheduleTypeEnum.LIVE_SESSION}>Live Session</SelectItem>
                      <SelectItem value={ScheduleTypeEnum.QUIZ}>Quiz</SelectItem>
                      <SelectItem value={ScheduleTypeEnum.ASSIGNMENT}>Assignment</SelectItem>
                      <SelectItem value={ScheduleTypeEnum.DEADLINE}>Deadline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="startDate"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="startDate">Start Date *</FieldLabel>
                  <Input
                    id="startDate"
                    type="date"
                    {...field}
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
              name="startTime"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="startTime">Start Time *</FieldLabel>
                  <Input
                    id="startTime"
                    type="time"
                    {...field}
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
              name="endDate"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="endDate">End Date *</FieldLabel>
                  <Input
                    id="endDate"
                    type="date"
                    {...field}
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
              name="endTime"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="endTime">End Time *</FieldLabel>
                  <Input
                    id="endTime"
                    type="time"
                    {...field}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <Controller
            control={form.control}
            name="allDay"
            render={({ field }) => (
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="allDay">All Day Event</FieldLabel>
                <Switch
                  id="allDay"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />

          <Controller
            control={form.control}
            name="location.name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="location.name">Location Name</FieldLabel>
                <Input
                  id="location.name"
                  {...field}
                  placeholder="Room name or address"
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
            name="location.online"
            render={({ field }) => (
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="location.online">Online Event</FieldLabel>
                <Switch
                  id="location.online"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />

          {form.watch('location.online') && (
            <Controller
              control={form.control}
              name="location.meetingUrl"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="location.meetingUrl">Meeting URL</FieldLabel>
                  <Input
                    id="location.meetingUrl"
                    {...field}
                    placeholder="https://meet.google.com/..."
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          )}

          <Controller
            control={form.control}
            name="recurrence.type"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="recurrence-type">Recurrence</FieldLabel>
                <div>
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="recurrence-type" aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Select recurrence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={RecurrenceTypeEnum.NONE}>None</SelectItem>
                      <SelectItem value={RecurrenceTypeEnum.DAILY}>Daily</SelectItem>
                      <SelectItem value={RecurrenceTypeEnum.WEEKLY}>Weekly</SelectItem>
                      <SelectItem value={RecurrenceTypeEnum.MONTHLY}>Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {form.watch('recurrence.type') !== RecurrenceTypeEnum.NONE && (
            <>
              <Controller
                control={form.control}
                name="recurrence.interval"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="recurrence.interval">Recurrence Interval</FieldLabel>
                    <Input
                      id="recurrence.interval"
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                      value={field.value || ""}
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
                name="recurrence.endDate"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="recurrence.endDate">Recurrence End Date</FieldLabel>
                    <Input
                      id="recurrence.endDate"
                      type="date"
                      {...field}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </>
          )}

          <Controller
            control={form.control}
            name="reminders.enabled"
            render={({ field }) => (
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="reminders.enabled">Enable Reminders</FieldLabel>
                <Switch
                  id="reminders.enabled"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />
        </div>
      </form>
    </BaseDialog>
  )
}

