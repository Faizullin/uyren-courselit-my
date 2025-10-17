/**
 * Base Calendar Service
 * Abstract class that defines the interface for calendar data operations
 */

import { CalendarEvent } from "../calendar-types";

export interface CalendarServiceConfig {
  allowEdit: boolean;
  allowDelete: boolean;
  allowCreate: boolean;
  enableReminders?: boolean;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday
}

export interface CalendarEventFilters {
  startDate: Date;
  endDate: Date;
  [key: string]: any;
}

export abstract class CalendarService<TEvent extends CalendarEvent = CalendarEvent, TCreateData = any, TUpdateData = any> {
  protected config: CalendarServiceConfig;

  constructor(config: CalendarServiceConfig) {
    this.config = config;
  }

  /**
   * Get service configuration
   */
  getConfig(): CalendarServiceConfig {
    return this.config;
  }

  /**
   * Get color for an event based on its properties
   * Override this method to provide custom color logic
   */
  getColorByEvent(event: TEvent): string {
    return event.color || "blue";
  }

  /**
   * List events within a date range
   * Must be implemented by child classes
   */
  abstract listEvents(filters: CalendarEventFilters): Promise<TEvent[]>;

  /**
   * Get a single event by ID
   * Must be implemented by child classes
   */
  abstract getEventById(id: string): Promise<TEvent>;

  /**
   * Create a new event
   * Must be implemented by child classes
   */
  abstract createEvent(data: TCreateData): Promise<TEvent>;

  /**
   * Update an existing event
   * Must be implemented by child classes
   */
  abstract updateEvent(id: string, data: TUpdateData): Promise<TEvent>;

  /**
   * Delete an event
   * Must be implemented by child classes
   */
  abstract deleteEvent(id: string): Promise<void>;

  /**
   * Validate if user can perform an action
   */
  canPerformAction(action: "create" | "edit" | "delete"): boolean {
    switch (action) {
      case "create":
        return this.config.allowCreate;
      case "edit":
        return this.config.allowEdit;
      case "delete":
        return this.config.allowDelete;
      default:
        return false;
    }
  }
}

