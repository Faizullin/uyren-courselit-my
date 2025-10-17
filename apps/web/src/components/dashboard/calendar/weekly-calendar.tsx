"use client";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { addDays, addWeeks, differenceInMinutes, format, parse, setHours, setMinutes, subWeeks } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useMemo } from "react";
import { Event, WeeklyCalendarProps } from "./types";

export function WeeklyCalendar<T = Record<string, unknown>>({
  events,
  config = {},
  currentWeekStart,
  onWeekChange,
  renderEventContent,
  renderEventPopover,
  isLoading = false,
  emptyStateMessage = "No events scheduled for this week",
  allowEdit = false,
  onTimeSlotClick,
  onEventEdit,
  onEventDelete,
}: WeeklyCalendarProps<T>) {
  const {
    weekStartsOn = 1,
    startHour = 7,
    endHour = 21,
    hourHeight = 4,
  } = config;

  const daysOfWeek = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const hours = useMemo(() => {
    return Array.from({ length: endHour - startHour }, (_, i) => i + startHour);
  }, [startHour, endHour]);

  const handlePrevWeek = () => onWeekChange(subWeeks(currentWeekStart, 1));
  const handleNextWeek = () => onWeekChange(addWeeks(currentWeekStart, 1));
  const handleToday = () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((today.getDay() + 7 - weekStartsOn) % 7));
    onWeekChange(weekStart);
  };

  // Helper: parse date + time into a Date object
  const parseDateTime = (dateStr: string, timeStr: string) => {
    const [hoursStr, minutesStr] = timeStr.split(":");
    const hours = parseInt(hoursStr || "0", 10);
    const minutes = parseInt(minutesStr || "0", 10);
    const date = parse(dateStr, "yyyy-MM-dd", new Date());
    return setMinutes(setHours(date, hours), minutes);
  };

  // Calculate event position and height
  const getEventPosition = (event: Event<T>) => {
    const start = parseDateTime(event.date, event.start);
    const end = parseDateTime(event.date, event.end);

    // Calculate minutes from start of day
    const dayStart = setHours(parse(event.date, "yyyy-MM-dd", new Date()), startHour);
    const minutesFromStart = differenceInMinutes(start, dayStart);
    const durationMinutes = differenceInMinutes(end, start);

    // Calculate position
    const top = (minutesFromStart / 60) * hourHeight;
    const height = (durationMinutes / 60) * hourHeight;

    return { top: `${top}rem`, height: `${height}rem` };
  };

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrevWeek} size="sm">
                ← Previous Week
              </Button>
              <Button variant="outline" onClick={handleToday} size="sm">
                Today
              </Button>
              <Button variant="outline" onClick={handleNextWeek} size="sm">
                Next Week →
              </Button>
            </div>
            <h2 className="text-lg font-semibold text-center">
              Week of {format(currentWeekStart, "MMMM d, yyyy")}
            </h2>
            <div className="w-20"></div> {/* Spacer to maintain layout */}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Schedule Grid */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-0">
          <CardTitle>Weekly Schedule</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <div className="flex">
              {/* Time column */}
              <div className="w-20 flex-shrink-0">
                <div className="h-12 border-b border-r bg-muted/50"></div>
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-16 border-b border-r text-xs text-muted-foreground flex items-start justify-end pr-2 pt-1"
                  >
                    {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                  </div>
                ))}
              </div>

              {/* Days columns */}
              <div className="flex-1 overflow-x-auto">
                {/* Days header */}
                <div className="flex">
                  {daysOfWeek.map((day) => {
                    const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                    return (
                      <div
                        key={day.toISOString()}
                        className={`flex-1 min-w-[120px] text-center p-3 border-b border-r ${
                          isToday ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-muted/50'
                        }`}
                      >
                        <div className="font-medium text-sm">{format(day, 'EEE')}</div>
                        <div className={`text-sm ${isToday ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}`}>
                          {format(day, 'MMM d')}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Time slots grid */}
                <div className="flex relative">
                  {daysOfWeek.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayEvents = events.filter((event) => event.date === dateStr);

                    return (
                      <div
                        key={dateStr}
                        className="flex-1 min-w-[120px] relative border-r"
                        style={{ height: `${hours.length * hourHeight}rem` }}
                      >
                        {/* Hour slots */}
                        {hours.map((hour) => (
                          <div
                            key={hour}
                            className={`h-16 border-b border-dashed border-gray-200 dark:border-gray-700 ${
                              allowEdit && onTimeSlotClick
                                ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors'
                                : ''
                            }`}
                            onClick={() => {
                              if (allowEdit && onTimeSlotClick) {
                                const startTime = `${hour.toString().padStart(2, '0')}:00`;
                                const endHour = hour + 1;
                                const endTime = `${endHour.toString().padStart(2, '0')}:00`;
                                onTimeSlotClick({
                                  date: dateStr,
                                  startTime,
                                  endTime,
                                });
                              }
                            }}
                          />
                        ))}

                        {/* Events */}
                        {dayEvents.map((event) => {
                          const position = getEventPosition(event);
                          
                          return (
                            <Popover key={event.id}>
                              <PopoverTrigger asChild>
                                {renderEventContent ? (
                                  renderEventContent({ event, position })
                                ) : (
                                  <div
                                    className={`absolute ${event.color || 'bg-blue-500'} text-white rounded p-1 text-xs shadow cursor-pointer hover:opacity-90 transition-opacity overflow-hidden w-full`}
                                    style={{
                                      top: position.top,
                                      height: position.height,
                                      minHeight: '2rem',
                                    }}
                                  >
                                    <div className="font-semibold truncate leading-tight px-1">
                                      {event.title}
                                    </div>
                                    <div className="truncate text-[10px] opacity-90 mt-0.5 px-1">
                                      {event.start} - {event.end}
                                    </div>
                                  </div>
                                )}
                              </PopoverTrigger>
                              {renderEventPopover && (
                                <PopoverContent className="w-80">
                                  {renderEventPopover(event)}
                                </PopoverContent>
                              )}
                            </Popover>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

