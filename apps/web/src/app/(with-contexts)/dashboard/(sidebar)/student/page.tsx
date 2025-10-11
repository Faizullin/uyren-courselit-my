// app/dashboard/student/page.tsx
"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { BookOpen, ClipboardList, Calendar, Award, TrendingUp, Code, Database, Cloud, Smartphone, Shield } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);

    const breadcrumbs = [{ label: t("common:dashboard.student.title"), href: "#" }];

    // IT-focused dashboard stats
    const stats = [
        {
            title: "Active Courses",
            value: "6",
            icon: BookOpen,
            description: "IT & Programming",
            color: "text-blue-600",
            trend: "+2 this month"
        },
        {
            title: "Code Assignments",
            value: "3",
            icon: ClipboardList,
            description: "Due this week",
            color: "text-orange-600",
            trend: "2 submitted"
        },
        {
            title: "Live Sessions",
            value: "2",
            icon: Calendar,
            description: "Scheduled today",
            color: "text-green-600",
            trend: "Next: 14:00"
        },
        {
            title: "Coding Score",
            value: "87%",
            icon: Award,
            description: "Average grade",
            color: "text-purple-600",
            trend: "+5% improvement"
        }
    ];

    // IT-focused recent activities
    const recentActivities = [
        { 
            id: 1, 
            course: "Python Programming", 
            action: "Completed functions module", 
            time: "2 hours ago", 
            score: "92%",
            icon: Code,
            color: "text-blue-600"
        },
        { 
            id: 2, 
            course: "Web Development", 
            action: "Submitted React project", 
            time: "1 day ago", 
            status: "Under Review",
            icon: Code,
            color: "text-orange-600"
        },
        { 
            id: 3, 
            course: "Data Science", 
            action: "Watched ML lecture", 
            time: "2 days ago", 
            progress: "Pandas completed",
            icon: Database,
            color: "text-green-600"
        },
        { 
            id: 4, 
            course: "Cloud Computing", 
            action: "Completed AWS lab", 
            time: "3 days ago", 
            topic: "EC2 Deployment",
            icon: Cloud,
            color: "text-purple-600"
        }
    ];

    // Upcoming deadlines
    const upcomingDeadlines = [
        { id: 1, title: "Python Data Structures Quiz", course: "Python Programming", due: "Today, 18:00", priority: "high" },
        { id: 2, title: "React Component Library", course: "Web Development", due: "Tomorrow, 23:59", priority: "medium" },
        { id: 3, title: "SQL Database Design", course: "Data Science", due: "Jan 20, 12:00", priority: "medium" },
        { id: 4, title: "AWS Security Config", course: "Cloud Computing", due: "Jan 22, 14:00", priority: "low" }
    ];

    // Recommended next lessons
    const recommendedLessons = [
        { id: 1, title: "Python OOP Concepts", course: "Python Programming", duration: "45 min", type: "video" },
        { id: 2, title: "React Hooks Deep Dive", course: "Web Development", duration: "30 min", type: "interactive" },
        { id: 3, title: "Data Visualization", course: "Data Science", duration: "60 min", type: "lab" }
    ];

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="flex flex-col gap-6">
                <HeaderTopbar
                    header={{
                        title: "Developer Dashboard",
                        subtitle: "Track your programming journey and coding progress"
                    }}
                />
                
                {/* Welcome Section */}
                <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Welcome back, Developer! 👋</h2>
                                <p className="opacity-90">Continue your coding journey. You have 3 assignments due this week.</p>
                            </div>
                            <Button variant="secondary" className="mt-4 md:mt-0">
                                View Weekly Plan
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, index) => (
                        <Card key={index} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">
                                            {stat.title}
                                        </p>
                                        <p className="text-2xl font-bold mt-1">{stat.value}</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            <p className="text-xs text-muted-foreground">
                                                {stat.description}
                                            </p>
                                        </div>
                                        <p className="text-xs text-green-600 font-medium mt-1">
                                            {stat.trend}
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-full bg-muted ${stat.color}`}>
                                        <stat.icon className="h-6 w-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Activity */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Recent Coding Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentActivities.map((activity) => (
                                    <div key={activity.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className={`p-2 rounded-full bg-muted ${activity.color}`}>
                                            <activity.icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{activity.course}</p>
                                            <p className="text-sm text-muted-foreground">{activity.action}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-muted-foreground">{activity.time}</p>
                                            {(activity.score || activity.status || activity.progress) && (
                                                <p className="text-xs font-medium mt-1">
                                                    {activity.score || activity.status || activity.progress}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Upcoming Deadlines */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Upcoming Coding Deadlines</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {upcomingDeadlines.map((deadline) => (
                                    <div key={deadline.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{deadline.title}</p>
                                            <p className="text-xs text-muted-foreground">{deadline.course}</p>
                                        </div>
                                        <div className="text-right">
                                            <Badge 
                                                variant={
                                                    deadline.priority === 'high' ? 'destructive' : 
                                                    deadline.priority === 'medium' ? 'outline' : 'secondary'
                                                }
                                                className="text-xs"
                                            >
                                                {deadline.due}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                                <Button variant="outline" className="w-full mt-2" size="sm">
                                    View All Assignments
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Course Progress & Recommendations */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Course Progress */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Your Coding Progress</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[
                                    { name: "Python Programming", progress: 75, color: "bg-blue-500", language: "Python" },
                                    { name: "Web Development", progress: 60, color: "bg-orange-500", language: "JavaScript" },
                                    { name: "Data Science", progress: 45, color: "bg-green-500", language: "Python" },
                                    { name: "Cloud Computing", progress: 30, color: "bg-purple-500", language: "YAML/JSON" },
                                    { name: "Mobile Development", progress: 20, color: "bg-indigo-500", language: "React Native" },
                                    { name: "Cybersecurity", progress: 85, color: "bg-red-500", language: "Bash/Python" }
                                ].map((course, index) => (
                                    <div key={index} className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{course.name}</span>
                                                <Badge variant="outline" className="text-xs">{course.language}</Badge>
                                            </div>
                                            <span>{course.progress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div 
                                                className={`h-2 rounded-full ${course.color} transition-all duration-500`}
                                                style={{ width: `${course.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recommended Next */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Continue Learning</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recommendedLessons.map((lesson) => (
                                    <Link key={lesson.id} href={`/dashboard/student/courses/1/lessons/${lesson.id}`}>
                                        <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-medium text-sm">{lesson.title}</p>
                                                    <p className="text-xs text-muted-foreground">{lesson.course}</p>
                                                </div>
                                                <Badge variant="secondary" className="text-xs">
                                                    {lesson.duration}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge variant="outline" className="text-xs">
                                                    {lesson.type}
                                                </Badge>
                                                <Button size="sm" className="h-6 text-xs">
                                                    Continue
                                                </Button>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                                <Button variant="outline" className="w-full" size="sm">
                                    Browse All Lessons
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Developer Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Button variant="outline" className="h-16 flex flex-col gap-1">
                                <Code className="h-5 w-5" />
                                <span className="text-xs">Code Editor</span>
                            </Button>
                            <Button variant="outline" className="h-16 flex flex-col gap-1">
                                <Database className="h-5 w-5" />
                                <span className="text-xs">Projects</span>
                            </Button>
                            <Button variant="outline" className="h-16 flex flex-col gap-1">
                                <Cloud className="h-5 w-5" />
                                <span className="text-xs">Labs</span>
                            </Button>
                            <Button variant="outline" className="h-16 flex flex-col gap-1">
                                <Shield className="h-5 w-5" />
                                <span className="text-xs">Certifications</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardContent>
    )
}