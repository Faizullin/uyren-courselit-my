/**
 * Schedule Calendar Service
 * Concrete implementation for cohort schedule events
 */

import { CalendarEvent } from "../calendar-types";
import { CalendarService, CalendarServiceConfig, CalendarEventFilters } from "./calendar-service.base";
import { ScheduleTypeEnum, RecurrenceTypeEnum } from "@workspace/common-logic/models/lms/schedule.types";

export interface ScheduleCalendarEvent extends CalendarEvent {
  type: ScheduleTypeEnum;
  description?: string;
  status?: string;
  allDay?: boolean;
  instructor?: {
    _id: string;
    fullName: string;
  };
  instructorId?: string;
  cohortId?: string;
  location?: {
    name: string;
    online: boolean;
    meetingUrl?: string;
  };
  recurrence?: {
    type: RecurrenceTypeEnum;
    interval: number;
    daysOfWeek?: number[];
    endDate?: Date;
  };
  reminders?: {
    enabled: boolean;
    minutesBefore: number[];
  };
}

export interface ScheduleEventCreateData {
  title: string;
  description?: string;
  type: ScheduleTypeEnum;
  entityType: string;
  entityId: string;
  startDate: string; // ISO datetime
  endDate: string; // ISO datetime
  allDay: boolean;
  recurrenceType: RecurrenceTypeEnum;
  recurrenceInterval: number;
  recurrenceDaysOfWeek?: number[];
  recurrenceEndDate?: string;
  locationName?: string;
  locationOnline: boolean;
  locationMeetingUrl?: string;
  instructorId?: string;
  cohortId?: string;
  remindersEnabled: boolean;
  remindersMinutesBefore: number[];
}

export interface ScheduleEventUpdateData extends Partial<ScheduleEventCreateData> {}

export interface ScheduleCalendarFilters extends CalendarEventFilters {
  cohortId?: string;
  instructorId?: string;
  type?: ScheduleTypeEnum;
}

/**
 * Service configuration for schedule calendar
 */
export interface ScheduleCalendarServiceConfig extends CalendarServiceConfig {
  cohortId: string;
  // Functions injected from the page/component
  fetchEvents: (filters: ScheduleCalendarFilters) => Promise<ScheduleCalendarEvent[]>;
  createEventFn: (data: ScheduleEventCreateData) => Promise<ScheduleCalendarEvent>;
  updateEventFn: (id: string, data: ScheduleEventUpdateData) => Promise<ScheduleCalendarEvent>;
  deleteEventFn: (id: string) => Promise<void>;
  getEventByIdFn: (id: string) => Promise<ScheduleCalendarEvent>;
}

export class ScheduleCalendarService extends CalendarService<
  ScheduleCalendarEvent,
  ScheduleEventCreateData,
  ScheduleEventUpdateData
> {
  private serviceConfig: ScheduleCalendarServiceConfig;

  constructor(config: ScheduleCalendarServiceConfig) {
    super(config);
    this.serviceConfig = config;
  }

  /**
   * Get color based on schedule event type
   */
  getColorByEvent(event: ScheduleCalendarEvent): string {
    switch (event.type) {
      case ScheduleTypeEnum.LIVE_SESSION:
        return "blue";
      case ScheduleTypeEnum.LESSON:
        return "indigo";
      case ScheduleTypeEnum.COURSE:
        return "purple";
      case ScheduleTypeEnum.QUIZ:
        return "green";
      case ScheduleTypeEnum.ASSIGNMENT:
        return "orange";
      case ScheduleTypeEnum.EXAM:
        return "red";
      case ScheduleTypeEnum.DEADLINE:
        return "yellow";
      default:
        return "blue";
    }
  }

  /**
   * Get Tailwind background class based on event type
   */
  getBackgroundClass(event: ScheduleCalendarEvent): string {
    const color = this.getColorByEvent(event);
    return `bg-${color}-500`;
  }

  /**
   * List events within a date range
   */
  async listEvents(filters: ScheduleCalendarFilters): Promise<ScheduleCalendarEvent[]> {
    const scheduleFilters: ScheduleCalendarFilters = {
      ...filters,
      cohortId: this.serviceConfig.cohortId,
    };
    return this.serviceConfig.fetchEvents(scheduleFilters);
  }

  /**
   * Get a single event by ID
   */
  async getEventById(id: string): Promise<ScheduleCalendarEvent> {
    return await this.serviceConfig.getEventByIdFn(id);
  }

  /**
   * Create a new schedule event
   */
  async createEvent(data: ScheduleEventCreateData): Promise<ScheduleCalendarEvent> {
    const createData: ScheduleEventCreateData = {
      ...data,
      // Ensure cohort context is included
    };
    return this.serviceConfig.createEventFn(createData);
  }

  /**
   * Update an existing event
   */
  async updateEvent(id: string, data: ScheduleEventUpdateData): Promise<ScheduleCalendarEvent> {
    return this.serviceConfig.updateEventFn(id, data);
  }

  /**
   * Delete an event
   */
  async deleteEvent(id: string): Promise<void> {
    return this.serviceConfig.deleteEventFn(id);
  }

  /**
   * Get cohort ID
   */
  getCohortId(): string {
    return this.serviceConfig.cohortId;
  }
}

