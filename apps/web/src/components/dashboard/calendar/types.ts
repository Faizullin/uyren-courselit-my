/**
 * Generic calendar event types
 * T represents additional type-specific data for the event
 */

export interface BaseEvent {
  id: string | number;
  title: string;
  date: string; // YYYY-MM-DD
  start: string; // "09:00" (HH:mm format)
  end: string; // "10:30" (HH:mm format)
  color?: string;
}

export interface Event<T = Record<string, unknown>> extends BaseEvent {
  data: T;
}

/**
 * Example: Schedule event specific data
 */
export interface ScheduleEventData {
  type?: string;
  instructor?: string;
  location?: string;
  description?: string;
  status?: string;
  cohortTitle?: string;
}

/**
 * Calendar configuration
 */
export interface CalendarConfig {
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday
  startHour?: number; // e.g., 7 for 7:00 AM
  endHour?: number; // e.g., 21 for 9:00 PM
  hourHeight?: number; // Height in rem (default 4)
}

/**
 * Event render props
 */
export interface EventRenderProps<T = Record<string, unknown>> {
  event: Event<T>;
  position: {
    top: string;
    height: string;
  };
  onClick?: (event: Event<T>) => void;
}

/**
 * Time slot click data
 */
export interface TimeSlotClickData {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm (1 hour after start by default)
}

/**
 * Calendar props
 */
export interface WeeklyCalendarProps<T = Record<string, unknown>> {
  events: Event<T>[];
  config?: CalendarConfig;
  currentWeekStart: Date;
  onWeekChange: (date: Date) => void;
  renderEventContent?: (props: EventRenderProps<T>) => React.ReactNode;
  renderEventPopover?: (event: Event<T>) => React.ReactNode;
  isLoading?: boolean;
  emptyStateMessage?: string;
  allowEdit?: boolean;
  onTimeSlotClick?: (slot: TimeSlotClickData) => void;
  onEventEdit?: (event: Event<T>) => void;
  onEventDelete?: (event: Event<T>) => void;
}

