import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useEffect, useCallback } from 'react'
import { FormDialog } from '@workspace/components-library'
import { useCalendarContext } from '../calendar-context'
import { format } from 'date-fns'
import { ScheduleTypeEnum, RecurrenceTypeEnum } from '@workspace/common-logic/models/lms/schedule.types'
import type { ScheduleCalendarEvent } from '../services/schedule-calendar-service'
import { Field, FieldGroup, FieldLabel, FieldError } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select'
import { Switch } from '@workspace/ui/components/switch'

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
    } catch (error) {
      console.error(`Failed to ${mode} event:`, error)
    }
  }

  const handleDelete = async () => {
    if (mode === 'edit' && eventId) {
      try {
        await deleteEvent(eventId)
        dialogControl.hide()
        form.reset()
      } catch (error) {
        console.error('Failed to delete event:', error)
      }
    }
  }

  const handleCancel = useCallback(() => {
    dialogControl.hide()
    form.reset()
  }, [dialogControl, form])

  const handleFormSubmit = useCallback(() => {
    form.handleSubmit(handleSubmit)()
  }, [form, handleSubmit])

  return (
    <FormDialog
      open={dialogControl.isVisible}
      onOpenChange={(open) => {
        if (!open) {
          handleCancel()
        }
      }}
      title={mode === 'create' ? 'Create Event' : 'Edit Event'}
      maxWidth="4xl"
      onSubmit={handleFormSubmit}
      onCancel={handleCancel}
      submitText={mode === 'create' ? 'Create' : 'Update'}
      cancelText="Cancel"
    >
      <form id="calendar-event-form" onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <FieldGroup>
            <FieldLabel htmlFor="title">Title *</FieldLabel>
            <Field>
              <Input
                id="title"
                {...form.register('title')}
                placeholder="Event title"
              />
            </Field>
            {form.formState.errors.title && (
              <FieldError>{form.formState.errors.title.message}</FieldError>
            )}
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Field>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Event description"
                rows={3}
              />
            </Field>
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="type">Type *</FieldLabel>
            <Field>
              <Select
                value={form.watch('type')}
                onValueChange={(value: ScheduleTypeEnum) => form.setValue('type', value)}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent position="item-aligned">
                  <SelectItem value={ScheduleTypeEnum.LIVE_SESSION}>Live Session</SelectItem>
                  <SelectItem value={ScheduleTypeEnum.LESSON}>Lesson</SelectItem>
                  <SelectItem value={ScheduleTypeEnum.COURSE}>Course</SelectItem>
                  <SelectItem value={ScheduleTypeEnum.QUIZ}>Quiz</SelectItem>
                  <SelectItem value={ScheduleTypeEnum.ASSIGNMENT}>Assignment</SelectItem>
                  <SelectItem value={ScheduleTypeEnum.EXAM}>Exam</SelectItem>
                  <SelectItem value={ScheduleTypeEnum.DEADLINE}>Deadline</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {form.formState.errors.type && (
              <FieldError>{form.formState.errors.type.message}</FieldError>
            )}
          </FieldGroup>

          <div className="grid grid-cols-2 gap-4">
            <FieldGroup>
              <FieldLabel htmlFor="startDate">Start Date *</FieldLabel>
              <Field>
                <Input
                  id="startDate"
                  type="date"
                  {...form.register('startDate')}
                />
              </Field>
              {form.formState.errors.startDate && (
                <FieldError>{form.formState.errors.startDate.message}</FieldError>
              )}
            </FieldGroup>

            <FieldGroup>
              <FieldLabel htmlFor="startTime">Start Time *</FieldLabel>
              <Field>
                <Input
                  id="startTime"
                  type="time"
                  {...form.register('startTime')}
                />
              </Field>
              {form.formState.errors.startTime && (
                <FieldError>{form.formState.errors.startTime.message}</FieldError>
              )}
            </FieldGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FieldGroup>
              <FieldLabel htmlFor="endDate">End Date *</FieldLabel>
              <Field>
                <Input
                  id="endDate"
                  type="date"
                  {...form.register('endDate')}
                />
              </Field>
              {form.formState.errors.endDate && (
                <FieldError>{form.formState.errors.endDate.message}</FieldError>
              )}
            </FieldGroup>

            <FieldGroup>
              <FieldLabel htmlFor="endTime">End Time *</FieldLabel>
              <Field>
                <Input
                  id="endTime"
                  type="time"
                  {...form.register('endTime')}
                />
              </Field>
              {form.formState.errors.endTime && (
                <FieldError>{form.formState.errors.endTime.message}</FieldError>
              )}
            </FieldGroup>
          </div>
        </div>

        <div className="space-y-4">
          <FieldGroup>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="allDay">All Day Event</FieldLabel>
              <Switch
                id="allDay"
                checked={form.watch('allDay')}
                onCheckedChange={(checked) => form.setValue('allDay', checked)}
              />
            </div>
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="location.name">Location Name</FieldLabel>
            <Field>
              <Input
                id="location.name"
                {...form.register('location.name')}
                placeholder="Room name or address"
              />
            </Field>
          </FieldGroup>

          <FieldGroup>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="location.online">Online Event</FieldLabel>
              <Switch
                id="location.online"
                checked={form.watch('location.online')}
                onCheckedChange={(checked) => form.setValue('location.online', checked)}
              />
            </div>
          </FieldGroup>

          {form.watch('location.online') && (
            <FieldGroup>
              <FieldLabel htmlFor="location.meetingUrl">Meeting URL</FieldLabel>
              <Field>
                <Input
                  id="location.meetingUrl"
                  {...form.register('location.meetingUrl')}
                  placeholder="https://meet.google.com/..."
                />
              </Field>
              {form.formState.errors.location?.meetingUrl && (
                <FieldError>{form.formState.errors.location.meetingUrl.message}</FieldError>
              )}
            </FieldGroup>
          )}

          <FieldGroup>
            <Field>
            <FieldLabel htmlFor="recurrence-type">Recurrence</FieldLabel>
              <div>
              <Select
                value={form.watch('recurrence.type')}
                onValueChange={(value: RecurrenceTypeEnum) => form.setValue('recurrence.type', value)}
              >
                <SelectTrigger 
                      id="recurrence-type">
                  <SelectValue placeholder="Select recurrence" />
                </SelectTrigger>
                <SelectContent position="item-aligned">
                  <SelectItem value={RecurrenceTypeEnum.NONE}>None</SelectItem>
                  <SelectItem value={RecurrenceTypeEnum.DAILY}>Daily</SelectItem>
                  <SelectItem value={RecurrenceTypeEnum.WEEKLY}>Weekly</SelectItem>
                  <SelectItem value={RecurrenceTypeEnum.MONTHLY}>Monthly</SelectItem>
                </SelectContent>
              </Select>
              </div>
            </Field>
          </FieldGroup>

          {form.watch('recurrence.type') !== RecurrenceTypeEnum.NONE && (
            <>
              <FieldGroup>
                <FieldLabel htmlFor="recurrence.interval">Recurrence Interval</FieldLabel>
                <Field>
                  <Input
                    id="recurrence.interval"
                    type="number"
                    min="1"
                    {...form.register('recurrence.interval', { valueAsNumber: true })}
                  />
                </Field>
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="recurrence.endDate">Recurrence End Date</FieldLabel>
                <Field>
                  <Input
                    id="recurrence.endDate"
                    type="date"
                    {...form.register('recurrence.endDate')}
                  />
                </Field>
              </FieldGroup>
            </>
          )}

          <FieldGroup>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="reminders.enabled">Enable Reminders</FieldLabel>
              <Switch
                id="reminders.enabled"
                checked={form.watch('reminders.enabled')}
                onCheckedChange={(checked) => form.setValue('reminders.enabled', checked)}
              />
            </div>
          </FieldGroup>
        </div>
      </form>
    </FormDialog>
  )
}

