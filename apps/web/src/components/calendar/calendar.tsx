"use client"; 

import CalendarBody from './body/calendar-body';
import CalendarProvider from './calendar-provider';
import type { CalendarEvent, CalendarProps } from './calendar-types';
import CalendarHeaderActions from './header/actions/calendar-header-actions';
import CalendarHeaderActionsAdd from './header/actions/calendar-header-actions-add';
import CalendarHeaderActionsMode from './header/actions/calendar-header-actions-mode';
import CalendarHeader from './header/calendar-header';
import CalendarHeaderDate from './header/date/calendar-header-date';

export default function Calendar<TEvent extends CalendarEvent = CalendarEvent>({
  service,
  mode,
  setMode,
  date,
  setDate,
  calendarIconIsToday = true,
  getColorByEvent,
}: CalendarProps<TEvent>) {
  return (
    <CalendarProvider<TEvent>
      service={service}
      mode={mode}
      setMode={setMode}
      date={date}
      setDate={setDate}
      calendarIconIsToday={calendarIconIsToday}
      getColorByEvent={getColorByEvent}
    >
      <CalendarHeader>
        <CalendarHeaderDate />
        <CalendarHeaderActions>
          <CalendarHeaderActionsMode />
          <CalendarHeaderActionsAdd />
        </CalendarHeaderActions>
      </CalendarHeader>
      <CalendarBody />
    </CalendarProvider>
  )
}
