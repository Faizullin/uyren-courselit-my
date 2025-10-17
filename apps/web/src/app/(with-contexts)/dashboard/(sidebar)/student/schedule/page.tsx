"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { addDays, addWeeks, differenceInMinutes, format, parse, setHours, setMinutes, startOfWeek, subWeeks } from "date-fns";
import { useMemo, useState } from "react";

type EventItem = {
    id: number;
    title: string;
    date: string; // YYYY-MM-DD
    start: string; // "09:00"
    end: string; // "10:30"
    type?: string;
    instructor?: string;
    location?: string;
    color?: string;
};

export default function WeeklySchedulePage() {
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

    // Sample schedule data - using current week dates for better testing
    const currentDate = new Date();
    const currentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });

    const schedule: EventItem[] = [
        {
            id: 1,
            title: "Python OOP Concepts",
            date: format(addDays(currentWeek, 0), "yyyy-MM-dd"),
            start: "09:00",
            end: "10:30",
            color: "bg-blue-500",
            instructor: "Dr. Sarah Chen",
            location: "Virtual Classroom A"
        },
        {
            id: 2,
            title: "Web Dev Workshop",
            date: format(addDays(currentWeek, 1), "yyyy-MM-dd"),
            start: "13:00",
            end: "15:00",
            color: "bg-orange-500",
            instructor: "Prof. Mike Johnson",
            location: "Lab 201"
        },
        {
            id: 3,
            title: "Data Science Office Hours",
            date: format(addDays(currentWeek, 2), "yyyy-MM-dd"),
            start: "11:00",
            end: "12:00",
            color: "bg-purple-500",
            instructor: "Dr. Emily Zhang",
            location: "Zoom Room 3"
        },
        {
            id: 4,
            title: "Cloud Computing Lab",
            date: format(addDays(currentWeek, 3), "yyyy-MM-dd"),
            start: "10:00",
            end: "12:30",
            color: "bg-green-500",
            instructor: "Prof. David Wilson",
            location: "Lab 205"
        },
        {
            id: 5,
            title: "Mobile App Development",
            date: format(addDays(currentWeek, 1), "yyyy-MM-dd"),
            start: "16:00",
            end: "17:30",
            color: "bg-indigo-500",
            instructor: "Prof. Alex Thompson",
            location: "Online"
        },
    ];

    const daysOfWeek = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
    }, [currentWeekStart]);

    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00–20:00 (extended hours)

    const handlePrevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

    // Helper: parse date + time into a Date object - FIXED TYPE SAFETY
    const parseDateTime = (dateStr: string, timeStr: string) => {
        const [hoursStr, minutesStr] = timeStr.split(":");
        const hours = parseInt(hoursStr || "0", 10);
        const minutes = parseInt(minutesStr || "0", 10);
        const date = parse(dateStr, "yyyy-MM-dd", new Date());
        return setMinutes(setHours(date, hours), minutes);
    };

    // Calculate event position and height - FIXED TYPE SAFETY
    const getEventPosition = (event: EventItem) => {
        const start = parseDateTime(event.date, event.start);
        const end = parseDateTime(event.date, event.end);

        // Calculate minutes from start of day (7:00 AM)
        const dayStart = setHours(parse(event.date, "yyyy-MM-dd", new Date()), 7);
        const minutesFromStart = differenceInMinutes(start, dayStart);
        const durationMinutes = differenceInMinutes(end, start);

        // Each hour slot is 4rem (h-16), so 4rem = 60 minutes
        const top = (minutesFromStart / 60) * 4;
        const height = (durationMinutes / 60) * 4;

        return { top: `${top}rem`, height: `${height}rem` };
    };

    return (
        <DashboardContent breadcrumbs={[{ label: "Weekly Schedule", href: "#" }]}>
            <HeaderTopbar
                header={{
                    title: "Weekly Schedule",
                    subtitle: "Your learning sessions by day and time",
                }}
            />

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
                        {/* Removed Add Event button */}
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
                            <div className="h-12 border-b border-r bg-muted/50"></div> {/* Header spacer */}
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
                                            className={`flex-1 min-w-[120px] text-center p-3 border-b border-r ${isToday ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-muted/50'
                                                }`}
                                        >
                                            <div className="font-medium text-sm">
                                                {format(day, 'EEE')}
                                            </div>
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
                                    const dayEvents = schedule.filter((event) => event.date === dateStr);

                                    return (
                                        <div
                                            key={dateStr}
                                            className="flex-1 min-w-[120px] relative border-r"
                                            style={{ height: `${hours.length * 4}rem` }}
                                        >
                                            {/* Hour slots */}
                                            {hours.map((hour) => (
                                                <div
                                                    key={hour}
                                                    className="h-16 border-b border-dashed border-gray-200 dark:border-gray-700"
                                                />
                                            ))}

                                            {/* Events - FIXED WIDTH */}
                                            {dayEvents.map((event) => {
                                                const position = getEventPosition(event);
                                                return (
                                                    <Popover key={event.id}>
                                                        <PopoverTrigger asChild>
                                                            <div
                                                                className={`absolute ${event.color} text-white rounded p-1 text-xs shadow cursor-pointer hover:opacity-90 transition-opacity overflow-hidden w-full`}
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
                                                                {event.location && (
                                                                    <div className="truncate text-[10px] opacity-80 mt-0.5 px-1">
                                                                        {event.location}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-80">
                                                            <div className="space-y-2">
                                                                <div className="font-semibold">{event.title}</div>
                                                                <div className="text-sm text-muted-foreground">
                                                                    {format(parseDateTime(event.date, event.start), "EEEE, MMMM d, yyyy 'at' h:mm a")} - {format(parseDateTime(event.date, event.end), "h:mm a")}
                                                                </div>
                                                                {event.instructor && (
                                                                    <div className="text-sm">
                                                                        <span className="font-medium">Instructor:</span> {event.instructor}
                                                                    </div>
                                                                )}
                                                                {event.location && (
                                                                    <div className="text-sm">
                                                                        <span className="font-medium">Location:</span> {event.location}
                                                                    </div>
                                                                )}
                                                                <div className="flex gap-2 pt-2">
                                                                    <Button size="sm" className="flex-1">
                                                                        Join Session
                                                                    </Button>
                                                                    <Button size="sm" variant="outline">
                                                                        Details
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </PopoverContent>
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

            {/* Legend */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium">Legend:</span>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-blue-500 rounded"></div>
                            <span>Live Sessions</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-orange-500 rounded"></div>
                            <span>Workshops</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-purple-500 rounded"></div>
                            <span>Office Hours</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-green-500 rounded"></div>
                            <span>Labs</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </DashboardContent>
    );
}