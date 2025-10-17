import { createContext, useContext } from 'react'
import type { CalendarContextType, CalendarEvent } from './calendar-types'

export const CalendarContext = createContext<CalendarContextType<any> | undefined>(
  undefined
)

export function useCalendarContext<TEvent extends CalendarEvent = CalendarEvent>() {
  const context = useContext(CalendarContext) as CalendarContextType<TEvent> | undefined
  if (!context) {
    throw new Error('useCalendarContext must be used within a CalendarProvider')
  }
  return context
}
