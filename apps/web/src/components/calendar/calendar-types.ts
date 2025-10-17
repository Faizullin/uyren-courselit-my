import { CalendarService } from './services/calendar-service.base'
import { IUseDialogControl } from '@workspace/components-library'
import { FormMode } from '@/components/dashboard/layout/types'

export interface EventDialogData {
  mode: FormMode
  eventId?: string
  initialDate?: Date
  initialStartTime?: string
  initialEndTime?: string
}

export type CalendarProps<TEvent extends CalendarEvent = CalendarEvent> = {
  service: CalendarService<TEvent>
  mode: Mode
  setMode: (mode: Mode) => void
  date: Date
  setDate: (date: Date) => void
  calendarIconIsToday?: boolean
  getColorByEvent?: (event: TEvent) => string
}

export type CalendarContextType<TEvent extends CalendarEvent = CalendarEvent> = CalendarProps<TEvent> & {
  events: TEvent[]
  isLoading: boolean
  refetchEvents: () => void
  createEvent: (data: any) => Promise<TEvent>
  updateEvent: (id: string, data: any) => Promise<TEvent>
  deleteEvent: (id: string) => Promise<void>
  dialogControl: IUseDialogControl<EventDialogData>
}

export type CalendarEvent = {
  id: string
  title: string
  color: string
  start: Date
  end: Date
}

export const calendarModes = ['day', 'week', 'month'] as const
export type Mode = (typeof calendarModes)[number]
