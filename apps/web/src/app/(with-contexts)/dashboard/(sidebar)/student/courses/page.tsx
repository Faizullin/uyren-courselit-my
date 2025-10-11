// app/dashboard/student/courses/page.tsx
"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { BookOpen, Clock, Users, PlayCircle, Star, BarChart3 } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);

    const breadcrumbs = [{ label: t("common:dashboard.student.courses.title"), href: "#" }];

    // IT-focused dummy courses data
    const courses = [
        {
            id: 1,
            title: "Python Programming Fundamentals",
            description: "Learn Python from scratch with hands-on projects and real-world applications",
            instructor: "Dr. Sarah Chen",
            progress: 75,
            duration: "8 weeks",
            students: 1247,
            image: "/api/placeholder/300/200",
            category: "Programming",
            level: "Beginner",
            rating: 4.8,
            nextLesson: "Functions and Modules",
            lessonsCompleted: 15,
            totalLessons: 20,
            lastAccessed: "2 hours ago"
        },
        {
            id: 2,
            title: "Web Development Bootcamp",
            description: "Full-stack web development with HTML, CSS, JavaScript, and React",
            instructor: "Prof. Mike Johnson",
            progress: 60,
            duration: "12 weeks",
            students: 893,
            image: "/api/placeholder/300/200",
            category: "Web Development",
            level: "Intermediate",
            rating: 4.6,
            nextLesson: "React Hooks",
            lessonsCompleted: 18,
            totalLessons: 30,
            lastAccessed: "1 day ago"
        },
        // ... other courses
    ];

    const getLevelColor = (level: string) => {
        switch (level.toLowerCase()) {
            case 'beginner': return 'bg-green-100 text-green-800';
            case 'intermediate': return 'bg-blue-100 text-blue-800';
            case 'advanced': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="flex flex-col gap-6">
                <HeaderTopbar
                    header={{
                        title: t("common:dashboard.student.courses.title"),
                        subtitle: "Continue your learning journey with these IT courses"
                    }}
                />

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {/* ... stats cards ... */}
                </div>

                {/* Courses Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => (
                        <Link 
                            key={course.id} 
                            href={`/dashboard/student/courses/${course.id}`}
                            className="block"
                        >
                            <Card className="hover:shadow-lg transition-shadow duration-300 border cursor-pointer group">
                                <div className="relative">
                                    <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-t-lg" />
                                    <div className="absolute top-3 left-3 flex gap-2">
                                        <Badge className={getLevelColor(course.level)}>
                                            {course.level}
                                        </Badge>
                                        <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm">
                                            {course.category}
                                        </Badge>
                                    </div>
                                </div>
                                
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-2">
                                        <CardTitle className="text-lg leading-tight group-hover:text-blue-600 transition-colors">
                                            {course.title}
                                        </CardTitle>
                                        <div className="flex items-center gap-1 text-sm text-amber-600">
                                            <Star className="h-4 w-4 fill-current" />
                                            <span>{course.rating}</span>
                                        </div>
                                    </div>
                                    
                                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                        {course.description}
                                    </p>
                                    
                                    <div className="flex items-center text-sm text-muted-foreground mb-3">
                                        <BookOpen className="h-4 w-4 mr-1 flex-shrink-0" />
                                        <span className="truncate">{course.instructor}</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                                        <div className="flex items-center">
                                            <Clock className="h-4 w-4 mr-1" />
                                            {course.duration}
                                        </div>
                                        <div className="flex items-center">
                                            <Users className="h-4 w-4 mr-1" />
                                            {course.students.toLocaleString()}
                                        </div>
                                    </div>

                                    {/* Progress Section */}
                                    <div className="space-y-3 mb-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">Your Progress</span>
                                            <span className="font-semibold">{course.progress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div 
                                                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${course.progress}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>{course.lessonsCompleted}/{course.totalLessons} lessons</span>
                                            <span>Last: {course.lastAccessed}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-2 border-t">
                                        <div className="text-sm text-muted-foreground">
                                            <div className="font-medium">Next:</div>
                                            <div className="truncate max-w-[120px]">{course.nextLesson}</div>
                                        </div>
                                        <div className="flex items-center gap-1 text-blue-600 group-hover:translate-x-1 transition-transform">
                                            <PlayCircle className="h-4 w-4" />
                                            <span className="text-sm font-medium">
                                                {course.progress > 0 ? "Continue" : "Start"}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>

                {/* Recommended Section */}
                <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4">Recommended for You</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.slice(0, 3).map(course => (
                            <Link 
                                key={`rec-${course.id}`} 
                                href={`/dashboard/student/courses/${course.id}`}
                                className="block"
                            >
                                <Card className="border-dashed hover:shadow-md transition-shadow cursor-pointer">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                                <BookOpen className="h-6 w-6 text-white" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm group-hover:text-blue-600">{course.title}</p>
                                                <p className="text-xs text-muted-foreground">{course.category}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardContent>
    )
}