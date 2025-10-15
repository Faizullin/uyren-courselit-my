// app/dashboard/instructor/page.tsx
"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Progress } from "@workspace/ui/components/progress";
import { 
  Users, 
  BookOpen, 
  UserCheck, 
  Activity, 
  Calendar, 
  BarChart3, 
  PieChart, 
  MessageSquare,
  Send,
  Eye,
  Clock,
  TrendingUp
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useState } from "react";

// Local types to replace the missing common-models
interface Course {
  id: number;
  title: string;
  students: number;
  progress: number;
  addedDate: string;
}

interface CalendarEvent {
  date: string;
  title: string;
  time: string;
}

interface AssignmentData {
  course: string;
  submitted: number;
  total: number;
}

interface AssignmentStatus {
  status: string;
  count: number;
  color: string;
}

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  activeCourses: number;
  activeToday: number;
}

export default function InstructorPage() {
    const { t } = useTranslation(["dashboard", "common"]);
    const breadcrumbs = [
        { label: t("sidebar.instructor"), href: "/dashboard/instructor" },
    ];

    // Fake API data
    const stats: Stats = {
        totalStudents: 1247,
        totalTeachers: 24,
        activeCourses: 18,
        activeToday: 342
    };

    // Course assignment submission data for bar chart
    const assignmentData: AssignmentData[] = [
        { course: "Python Programming", submitted: 45, total: 50 },
        { course: "Web Development", submitted: 38, total: 45 },
        { course: "Data Science", submitted: 42, total: 48 },
        { course: "Cloud Computing", submitted: 28, total: 35 },
        { course: "Mobile Development", submitted: 35, total: 40 },
        { course: "Cybersecurity", submitted: 40, total: 42 }
    ];

    // Assignment status data for pie chart
    const assignmentStatus: AssignmentStatus[] = [
        { status: "Completed", count: 156, color: "bg-green-500" },
        { status: "In Progress", count: 89, color: "bg-blue-500" },
        { status: "Not Started", count: 45, color: "bg-gray-300" },
        { status: "Overdue", count: 12, color: "bg-red-500" }
    ];

    // Recently added courses
    const recentCourses: Course[] = [
        {
            id: 1,
            title: "Advanced Python Patterns",
            students: 45,
            progress: 30,
            addedDate: "2024-01-15"
        },
        {
            id: 2,
            title: "React Native Masterclass",
            students: 32,
            progress: 65,
            addedDate: "2024-01-14"
        },
        {
            id: 3,
            title: "AWS DevOps Fundamentals",
            students: 28,
            progress: 45,
            addedDate: "2024-01-13"
        }
    ];

    // Calendar events
    const calendarEvents: CalendarEvent[] = [
        { date: "2024-01-15", title: "Python Live Session", time: "10:00 AM" },
        { date: "2024-01-16", title: "Code Review", time: "2:00 PM" },
        { date: "2024-01-17", title: "Team Meeting", time: "11:00 AM" },
        { date: "2024-01-18", title: "Workshop Prep", time: "3:00 PM" }
    ];

    const [announcement, setAnnouncement] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePostAnnouncement = async () => {
        if (!announcement.trim()) return;
        
        setIsSubmitting(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("Announcement posted:", announcement);
        setAnnouncement("");
        setIsSubmitting(false);
    };

    const totalAssignments = assignmentStatus.reduce((sum, item) => sum + item.count, 0);

    // Function to generate pie chart segments
    const renderPieChart = () => {
        let currentPercent = 0;
        return assignmentStatus.map((item, index) => {
            const percent = (item.count / totalAssignments) * 100;
            const dashArray = `${percent} ${100 - percent}`;
            const dashOffset = -currentPercent;
            currentPercent += percent;
            
            return (
                <circle
                    key={index}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="20"
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                    className={item.color}
                />
            );
        });
    };

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="flex flex-col gap-6">
                <HeaderTopbar
                    header={{
                        title: t("sidebar.instructor"),
                        subtitle: "Manage your courses and track student progress"
                    }}
                />

                {/* Section 1: Stats Overview */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                                    <p className="text-2xl font-bold mt-1">{stats.totalStudents.toLocaleString()}</p>
                                    <p className="text-xs text-green-600 font-medium mt-1">
                                        <TrendingUp className="h-3 w-3 inline mr-1" />
                                        +12% this month
                                    </p>
                                </div>
                                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                                    <Users className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Instructors</p>
                                    <p className="text-2xl font-bold mt-1">{stats.totalTeachers}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Teaching staff</p>
                                </div>
                                <div className="p-3 rounded-full bg-green-100 text-green-600">
                                    <UserCheck className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Active Courses</p>
                                    <p className="text-2xl font-bold mt-1">{stats.activeCourses}</p>
                                    <p className="text-xs text-muted-foreground mt-1">This semester</p>
                                </div>
                                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                                    <BookOpen className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Active Today</p>
                                    <p className="text-2xl font-bold mt-1">{stats.activeToday}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Students online</p>
                                </div>
                                <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                                    <Activity className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Section 2a: Assignment Submissions Bar Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    Assignment Submissions by Course
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {assignmentData.map((course, index) => {
                                        const percentage = (course.submitted / course.total) * 100;
                                        return (
                                            <div key={index} className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="font-medium">{course.course}</span>
                                                    <span>{course.submitted}/{course.total} ({Math.round(percentage)}%)</span>
                                                </div>
                                                <Progress value={percentage} className="h-3" />
                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>{course.submitted} submitted</span>
                                                    <span>{course.total - course.submitted} pending</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Section 2b: Assignment Status Pie Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PieChart className="h-5 w-5" />
                                    Assignment Status Overview
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Pie Chart Visualization */}
                                    <div className="relative w-48 h-48 mx-auto">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold">{totalAssignments}</div>
                                                <div className="text-sm text-muted-foreground">Total</div>
                                            </div>
                                        </div>
                                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                            {renderPieChart()}
                                        </svg>
                                    </div>

                                    {/* Legend */}
                                    <div className="space-y-3">
                                        {assignmentStatus.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                                                    <span className="text-sm font-medium">{item.status}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-semibold">{item.count}</span>
                                                    <span className="text-sm text-muted-foreground ml-1">
                                                        ({Math.round((item.count / totalAssignments) * 100)}%)
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Section 3: Announcements Editor */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5" />
                                    Post Announcement
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <Textarea
                                        placeholder="Write an announcement for your students..."
                                        value={announcement}
                                        onChange={(e) => setAnnouncement(e.target.value)}
                                        rows={4}
                                        className="resize-none"
                                    />
                                    <div className="flex justify-between items-center">
                                        <div className="text-sm text-muted-foreground">
                                            {announcement.length}/500 characters
                                        </div>
                                        <Button 
                                            onClick={handlePostAnnouncement}
                                            disabled={!announcement.trim() || isSubmitting}
                                            className="flex items-center gap-2"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    Posting...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="h-4 w-4" />
                                                    Post Announcement
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Sidebar */}
                    <div className="space-y-6">
                        {/* Calendar */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Upcoming Events
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {calendarEvents.map((event, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div>
                                                <p className="font-medium text-sm">{event.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(event.date).toLocaleDateString('en-US', { 
                                                        month: 'short', 
                                                        day: 'numeric' 
                                                    })} • {event.time}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="text-xs">
                                                <Clock className="h-3 w-3 mr-1" />
                                                Remind
                                            </Badge>
                                        </div>
                                    ))}
                                    <Button variant="outline" className="w-full">
                                        View Full Calendar
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recently Added Courses */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Recently Added Courses</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {recentCourses.map((course) => (
                                        <Link 
                                            key={course.id} 
                                            href={`/dashboard/lms/courses/${course.id}`}
                                            className="block"
                                        >
                                            <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                                                <div className="flex items-start justify-between mb-2">
                                                    <h4 className="font-medium text-sm flex-1">{course.title}</h4>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {course.students} students
                                                    </Badge>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs text-muted-foreground">
                                                        <span>Progress</span>
                                                        <span>{course.progress}%</span>
                                                    </div>
                                                    <Progress value={course.progress} className="h-2" />
                                                    <div className="text-xs text-muted-foreground">
                                                        Added {new Date(course.addedDate).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <Button size="sm" className="w-full mt-2" variant="outline">
                                                    <Eye className="h-3 w-3 mr-1" />
                                                    View Course
                                                </Button>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardContent>
    );
}