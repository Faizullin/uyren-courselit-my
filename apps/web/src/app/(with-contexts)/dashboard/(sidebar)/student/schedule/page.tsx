// app/dashboard/student/schedule/page.tsx
"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Calendar, Clock, MapPin, Video, Users, BookOpen, Code, PlayCircle, Bell } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Calendar as ShadcnCalendar } from "@workspace/ui/components/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@workspace/ui/components/popover";
import { format } from "date-fns";

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const breadcrumbs = [{ label: t("common:dashboard.schedule.title"), href: "#" }];
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [filter, setFilter] = useState("all");

    // IT-focused schedule data
    const schedule = [
        {
            id: 1,
            title: "Python OOP Concepts Live Session",
            course: "Python Programming Fundamentals",
            courseId: "1",
            type: "live",
            date: "2025-10-15",
            time: "09:00 - 10:30",
            duration: "90 min",
            location: "Virtual Classroom A",
            instructor: "Dr. Sarah Chen",
            students: 24,
            description: "Deep dive into Object-Oriented Programming concepts with Python. We'll cover classes, inheritance, and polymorphism with live coding examples.",
            resources: 3,
            joinLink: "https://meet.example.com/python-oop",
            recordingAvailable: false
        },
        {
            id: 2,
            title: "Web Development Code Review",
            course: "Web Development Bootcamp",
            courseId: "2",
            type: "review",
            date: "2025-10-15",
            time: "14:00 - 15:30",
            duration: "90 min",
            location: "Online",
            instructor: "Prof. Mike Johnson",
            students: 18,
            description: "Group code review session for React component projects. Bring your code and questions!",
            resources: 2,
            joinLink: "https://meet.example.com/web-dev-review",
            recordingAvailable: true
        },
        {
            id: 3,
            title: "Data Science Office Hours",
            course: "Data Science with Python",
            courseId: "3",
            type: "office",
            date: "2025-10-16",
            time: "11:00 - 12:00",
            duration: "60 min",
            location: "Zoom Room 3",
            instructor: "Dr. Emily Zhang",
            students: 8,
            description: "One-on-one help with Pandas data analysis assignments and project guidance.",
            resources: 1,
            joinLink: "https://zoom.example.com/data-science",
            recordingAvailable: false
        },
        {
            id: 4,
            title: "Cloud Computing Workshop",
            course: "Cloud Computing & AWS",
            courseId: "4",
            type: "workshop",
            date: "2025-10-17",
            time: "10:00 - 12:00",
            duration: "120 min",
            location: "Lab 205",
            instructor: "Prof. David Wilson",
            students: 15,
            description: "Hands-on AWS EC2 deployment workshop. We'll deploy a sample application together.",
            resources: 4,
            joinLink: "https://meet.example.com/cloud-workshop",
            recordingAvailable: true
        },
        {
            id: 5,
            title: "Mobile App Q&A Session",
            course: "Mobile App Development",
            courseId: "5",
            type: "qa",
            date: "2025-10-18",
            time: "13:00 - 14:00",
            duration: "60 min",
            location: "Online",
            instructor: "Prof. Lisa Kim",
            students: 12,
            description: "Q&A session for React Native mobile app projects. Get help with navigation and state management.",
            resources: 2,
            joinLink: "https://meet.example.com/mobile-qa",
            recordingAvailable: true
        },
        {
            id: 6,
            title: "Cybersecurity Lab Session",
            course: "Cybersecurity Fundamentals",
            courseId: "6",
            type: "lab",
            date: "2025-10-19",
            time: "15:00 - 17:00",
            duration: "120 min",
            location: "Security Lab B",
            instructor: "Dr. Alex Thompson",
            students: 20,
            description: "Hands-on network security assessment lab. Bring your laptops for practical exercises.",
            resources: 5,
            joinLink: "https://meet.example.com/cyber-lab",
            recordingAvailable: false
        }
    ];

    const filteredSchedule = schedule.filter(item => {
        if (filter === "all") return true;
        return item.type === filter;
    });

    // Get schedule for selected date
    const getScheduleForDate = (date: Date) => {
        const dateString = date.toISOString().split('T')[0];
        return filteredSchedule.filter(item => item.date === dateString);
    };

    const selectedDateSchedule = selectedDate ? getScheduleForDate(selectedDate) : [];

    // Get dates that have events for calendar highlighting
    const getEventDates = () => {
        return filteredSchedule.map(item => new Date(item.date));
    };

    const getTypeConfig = (type: string) => {
        const configs = {
            live: { variant: "default" as const, text: "Live Session", color: "text-blue-400", bgColor: "bg-blue-900/50" },
            review: { variant: "secondary" as const, text: "Code Review", color: "text-green-400", bgColor: "bg-green-900/50" },
            office: { variant: "outline" as const, text: "Office Hours", color: "text-purple-400", bgColor: "bg-purple-900/50" },
            workshop: { variant: "default" as const, text: "Workshop", color: "text-orange-400", bgColor: "bg-orange-900/50" },
            qa: { variant: "secondary" as const, text: "Q&A Session", color: "text-indigo-400", bgColor: "bg-indigo-900/50" },
            lab: { variant: "outline" as const, text: "Lab Session", color: "text-red-400", bgColor: "bg-red-900/50" }
        };
        return configs[type as keyof typeof configs] || configs.live;
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'live': return <Video className="h-4 w-4" />;
            case 'review': return <Code className="h-4 w-4" />;
            case 'office': return <Users className="h-4 w-4" />;
            case 'workshop': return <BookOpen className="h-4 w-4" />;
            case 'qa': return <Users className="h-4 w-4" />;
            case 'lab': return <Code className="h-4 w-4" />;
            default: return <Video className="h-4 w-4" />;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const isToday = (dateString: string) => {
        const today = new Date().toDateString();
        return new Date(dateString).toDateString() === today;
    };

    const isUpcoming = (dateString: string) => {
        return new Date(dateString) >= new Date();
    };

    const todaySchedule = schedule.filter(item => isToday(item.date));
    const upcomingSchedule = schedule.filter(item => isUpcoming(item.date) && !isToday(item.date));

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="flex flex-col gap-6">
                <HeaderTopbar
                    header={{
                        title: t("common:dashboard.schedule.title"),
                        subtitle: "Track your live sessions, workshops, and coding labs"
                    }}
                />

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-900/50 rounded-lg">
                                    <Calendar className="h-5 w-5 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Today</p>
                                    <p className="text-xl font-bold">{todaySchedule.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-900/50 rounded-lg">
                                    <Clock className="h-5 w-5 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">This Week</p>
                                    <p className="text-xl font-bold">{upcomingSchedule.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-900/50 rounded-lg">
                                    <Video className="h-5 w-5 text-orange-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Live Sessions</p>
                                    <p className="text-xl font-bold">{schedule.filter(s => s.type === 'live').length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-900/50 rounded-lg">
                                    <Code className="h-5 w-5 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Labs & Workshops</p>
                                    <p className="text-xl font-bold">{schedule.filter(s => s.type === 'lab' || s.type === 'workshop').length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

{/* Calendar Section */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Calendar className="h-5 w-5" />
      Schedule Calendar
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left side: Calendar */}
      <div className="flex justify-center items-center">
        <ShadcnCalendar
          mode="single"
          selected={selectedDate}
          onSelect={(day) => setSelectedDate(day)}
          modifiers={{
            booked: filteredSchedule.map((s) => new Date(s.date)),
          }}
          modifiersClassNames={{
            booked: "bg-blue-500 text-white rounded-full",
          }}
          className="rounded-md border text-lg p-6 scale-125 lg:scale-150 transition-transform"
        />
      </div>

      {/* Right side: Events for selected date */}
      <div>
        <h3 className="font-semibold mb-2">
          {selectedDate
            ? `Events on ${format(selectedDate, "PPP")}`
            : "Select a date to view events"}
        </h3>

        <div className="space-y-3">
          {filteredSchedule
            .filter((item) => {
              if (!selectedDate) return false;
              return (
                new Date(item.date).toDateString() ===
                selectedDate.toDateString()
              );
            })
            .map((item) => {
              const typeConfig = getTypeConfig(item.type);
              return (
                <div
                  key={item.id}
                  className="p-3 border rounded-lg flex justify-between items-start hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeIcon(item.type)}
                      <h4 className="font-medium">{item.title}</h4>
                      <Badge variant={typeConfig.variant}>
                        {typeConfig.text}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {item.time} ({item.duration}) — {item.location}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    Join
                  </Button>
                </div>
              );
            })}
        </div>

        {/* Empty state */}
        {selectedDate &&
          filteredSchedule.filter(
            (item) =>
              new Date(item.date).toDateString() ===
              selectedDate.toDateString()
          ).length === 0 && (
            <div className="text-muted-foreground text-sm py-4 text-center">
              No events scheduled for this day.
            </div>
          )}
      </div>
    </div>
  </CardContent>
</Card>


                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant={filter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("all")}
                    >
                        All Events
                    </Button>
                    <Button
                        variant={filter === "live" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("live")}
                    >
                        Live Sessions
                    </Button>
                    <Button
                        variant={filter === "workshop" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("workshop")}
                    >
                        Workshops
                    </Button>
                    <Button
                        variant={filter === "lab" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("lab")}
                    >
                        Labs
                    </Button>
                    <Button
                        variant={filter === "office" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("office")}
                    >
                        Office Hours
                    </Button>
                </div>

                {/* Today's Schedule - FIXED FOR DARK THEME */}
                {todaySchedule.length > 0 && (
                    <Card className="border-blue-800 bg-blue-950/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-300">
                                <Calendar className="h-5 w-5" />
                                Today's Schedule
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {todaySchedule.map((item) => {
                                    const typeConfig = getTypeConfig(item.type);
                                    return (
                                        <div key={item.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-blue-800">
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className={`p-2 rounded-lg ${typeConfig.bgColor} ${typeConfig.color}`}>
                                                    {getTypeIcon(item.type)}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-semibold">{item.title}</h3>
                                                        <Badge variant={typeConfig.variant}>
                                                            {typeConfig.text}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                                                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {item.time} ({item.duration})
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            {item.location === 'Online' ? (
                                                                <Video className="h-3 w-3" />
                                                            ) : (
                                                                <MapPin className="h-3 w-3" />
                                                            )}
                                                            {item.location}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Users className="h-3 w-3" />
                                                            {item.students} students
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <Button size="sm" className="flex items-center gap-1">
                                                    <PlayCircle className="h-4 w-4" />
                                                    Join Now
                                                </Button>
                                                <Button variant="outline" size="sm">
                                                    <Bell className="h-4 w-4" />
                                                    Remind
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Upcoming Highlights */}
                {upcomingSchedule.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Upcoming Highlights</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {upcomingSchedule.slice(0, 3).map((item) => {
                                    const typeConfig = getTypeConfig(item.type);
                                    return (
                                        <div key={item.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className={`p-1 rounded ${typeConfig.bgColor} ${typeConfig.color}`}>
                                                    {getTypeIcon(item.type)}
                                                </div>
                                                <Badge variant={typeConfig.variant} className="text-xs">
                                                    {typeConfig.text}
                                                </Badge>
                                            </div>
                                            <h4 className="font-semibold text-sm mb-2">{item.title}</h4>
                                            <div className="space-y-1 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(item.date)}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {item.time}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <BookOpen className="h-3 w-3" />
                                                    {item.course}
                                                </div>
                                            </div>
                                            <Button size="sm" className="w-full mt-3">
                                                Add to Calendar
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Empty State */}
                {filteredSchedule.length === 0 && (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No scheduled events</h3>
                            <p className="text-muted-foreground mb-4">
                                {filter === "all" 
                                    ? "You don't have any scheduled events for the selected period." 
                                    : `No ${filter} events match your filter.`}
                            </p>
                            <Button>
                                Browse Available Sessions
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardContent>
    )
}