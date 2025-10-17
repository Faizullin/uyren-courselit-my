import { CalendarContext } from './calendar-context'
import { CalendarEvent, Mode } from './calendar-types'
import { useState, useCallback, useMemo } from 'react'
import { CalendarService } from './services/calendar-service.base'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDialogControl } from '@workspace/components-library'
import CalendarEventDialog from './dialog/calendar-event-dialog'

export default function CalendarProvider<TEvent extends CalendarEvent = CalendarEvent>({
  service,
  mode,
  setMode,
  date,
  setDate,
  calendarIconIsToday = true,
  getColorByEvent,
  children,
}: {
  service: CalendarService<TEvent>
  mode: Mode
  setMode: (mode: Mode) => void
  date: Date
  setDate: (date: Date) => void
  calendarIconIsToday: boolean
  getColorByEvent?: (event: TEvent) => string
  children: React.ReactNode
}) {
  const queryClient = useQueryClient()
  const dialogControl = useDialogControl()

  // Calculate date range based on current mode and date
  const dateRange = useMemo(() => {
    let startDate: Date
    let endDate: Date

    if (mode === 'day') {
      startDate = startOfDay(date)
      endDate = endOfDay(date)
    } else if (mode === 'week') {
      startDate = startOfWeek(date, { weekStartsOn: service.getConfig().weekStartsOn || 1 })
      endDate = endOfWeek(date, { weekStartsOn: service.getConfig().weekStartsOn || 1 })
    } else {
      // month
      const monthStart = startOfMonth(date)
      const monthEnd = endOfMonth(date)
      startDate = startOfWeek(monthStart, { weekStartsOn: service.getConfig().weekStartsOn || 1 })
      endDate = endOfWeek(monthEnd, { weekStartsOn: service.getConfig().weekStartsOn || 1 })
    }

    return { startDate, endDate }
  }, [mode, date, service])

  // Fetch events using service
  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['calendar-events', mode, date.toISOString(), dateRange],
    queryFn: () => service.listEvents(dateRange),
    staleTime: 30000, // 30 seconds
  })

  // Create event mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => service.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    },
  })

  // Update event mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => service.updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    },
  })

  // Delete event mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => service.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    },
  })

  const createEvent = useCallback(async (data: any): Promise<TEvent> => {
    return createMutation.mutateAsync(data)
  }, [createMutation])

  const updateEvent = useCallback(async (id: string, data: any): Promise<TEvent> => {
    return updateMutation.mutateAsync({ id, data })
  }, [updateMutation])

  const deleteEvent = useCallback(async (id: string): Promise<void> => {
    await deleteMutation.mutateAsync(id)
  }, [deleteMutation])

  return (
    <CalendarContext.Provider
      value={{
        service,
        events,
        isLoading,
        refetchEvents: refetch,
        mode,
        setMode,
        date,
        setDate,
        calendarIconIsToday,
        getColorByEvent,
        createEvent,
        updateEvent,
        deleteEvent,
        dialogControl,
      }}
    >
      <CalendarEventDialog />
      {children}
    </CalendarContext.Provider>
  )
}
