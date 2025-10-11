// app/dashboard/student/courses/[id]/page.tsx
"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";
import { BookOpen, Clock, Users, Star, PlayCircle, CheckCircle, FileText, Video, Download, Calendar } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const params = useParams();
    const courseId = params.id as string;

    // Dummy course data
    const course = {
        id: courseId,
        title: "Python Programming Fundamentals",
        description: "Learn Python from scratch with hands-on projects and real-world applications. Master the fundamentals of programming and build your first Python applications.",
        instructor: "Dr. Sarah Chen",
        instructorBio: "Senior Software Engineer with 10+ years of experience in Python development and machine learning",
        progress: 75,
        duration: "8 weeks",
        students: 1247,
        category: "Programming",
        level: "Beginner",
        rating: 4.8,
        totalLessons: 20,
        completedLessons: 15,
        totalHours: 24,
        enrolledDate: "2024-01-10",
        certificateAvailable: true
    };

    // Dummy curriculum data
    const curriculum = [
        {
            week: 1,
            title: "Python Basics",
            lessons: [
                { id: 1, title: "Introduction to Python", type: "video", duration: "15 min", completed: true },
                { id: 2, title: "Variables and Data Types", type: "video", duration: "20 min", completed: true },
                { id: 3, title: "Basic Operations", type: "video", duration: "18 min", completed: true },
                { id: 4, title: "Week 1 Quiz", type: "quiz", duration: "10 min", completed: true }
            ]
        },
        {
            week: 2,
            title: "Control Structures",
            lessons: [
                { id: 5, title: "If Statements", type: "video", duration: "22 min", completed: true },
                { id: 6, title: "Loops - For and While", type: "video", duration: "25 min", completed: true },
                { id: 7, title: "Loop Control Statements", type: "video", duration: "20 min", completed: true },
                { id: 8, title: "Practice Exercises", type: "exercise", duration: "30 min", completed: true }
            ]
        },
        // ... more modules
    ];

    const breadcrumbs = [
        { label: t("common:dashboard.student.courses.title"), href: "/dashboard/student/courses" },
        { label: course.title, href: "#" }
    ];

    const getLessonIcon = (type: string) => {
        switch (type) {
            case 'video': return <Video className="h-4 w-4" />;
            case 'quiz': return <FileText className="h-4 w-4" />;
            case 'exercise': return <PlayCircle className="h-4 w-4" />;
            case 'project': return <Calendar className="h-4 w-4" />;
            default: return <BookOpen className="h-4 w-4" />;
        }
    };

    const getLessonColor = (type: string) => {
        switch (type) {
            case 'video': return 'text-blue-600';
            case 'quiz': return 'text-orange-600';
            case 'exercise': return 'text-green-600';
            case 'project': return 'text-purple-600';
            default: return 'text-gray-600';
        }
    };

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="flex flex-col gap-6">
                <HeaderTopbar
                    header={{
                        title: course.title,
                        subtitle: course.description
                    }}
                />

                {/* Course Header */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Course Image and Basic Info */}
                            <div className="lg:w-1/3">
                                <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mb-4"></div>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <Badge variant="secondary">{course.category}</Badge>
                                    <Badge variant="outline">{course.level}</Badge>
                                    <div className="flex items-center gap-1 text-amber-600">
                                        <Star className="h-4 w-4 fill-current" />
                                        <span className="text-sm">{course.rating}</span>
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <span>{course.students.toLocaleString()} students enrolled</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span>{course.totalHours} total hours</span>
                                    </div>
                                </div>
                            </div>

                            {/* Progress and Actions */}
                            <div className="lg:w-2/3">
                                <div className="mb-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-semibold">Your Progress</span>
                                        <span className="font-bold text-lg">{course.progress}%</span>
                                    </div>
                                    <Progress value={course.progress} className="h-3" />
                                    <div className="flex justify-between text-sm text-muted-foreground mt-2">
                                        <span>{course.completedLessons}/{course.totalLessons} lessons completed</span>
                                        <span>Enrolled on {new Date(course.enrolledDate).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                                        <div className="font-bold text-blue-600">{course.completedLessons}</div>
                                        <div className="text-xs text-muted-foreground">Lessons Done</div>
                                    </div>
                                    <div className="text-center p-3 bg-green-50 rounded-lg">
                                        <div className="font-bold text-green-600">{course.totalLessons - course.completedLessons}</div>
                                        <div className="text-xs text-muted-foreground">Remaining</div>
                                    </div>
                                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                                        <div className="font-bold text-orange-600">3</div>
                                        <div className="text-xs text-muted-foreground">Quizzes</div>
                                    </div>
                                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                                        <div className="font-bold text-purple-600">2</div>
                                        <div className="text-xs text-muted-foreground">Projects</div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <Button className="flex items-center gap-2">
                                        <PlayCircle className="h-4 w-4" />
                                        Continue Learning
                                    </Button>
                                    <Button variant="outline" className="flex items-center gap-2">
                                        <Download className="h-4 w-4" />
                                        Download Materials
                                    </Button>
                                    {course.certificateAvailable && (
                                        <Button variant="outline" className="flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            View Certificate
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Curriculum */}
                <Card>
                    <CardHeader>
                        <CardTitle>Course Curriculum</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {curriculum.map((week, weekIndex) => (
                                <div key={weekIndex} className="border rounded-lg">
                                    <div className="p-4 bg-muted/50 border-b">
                                        <h3 className="font-semibold">Week {week.week}: {week.title}</h3>
                                    </div>
                                    <div className="divide-y">
                                        {week.lessons.map((lesson, lessonIndex) => (
                                            <Link 
                                                key={lesson.id} 
                                                href={`/dashboard/student/courses/${courseId}/lessons/${lesson.id}`}
                                                className="block"
                                            >
                                                <div className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer group">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-full ${lesson.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                                            {lesson.completed ? (
                                                                <CheckCircle className="h-4 w-4" />
                                                            ) : (
                                                                getLessonIcon(lesson.type)
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`font-medium group-hover:text-blue-600 transition-colors ${lesson.completed ? 'text-green-600' : ''}`}>
                                                                    {lesson.title}
                                                                </span>
                                                                <Badge variant="outline" className={`text-xs ${getLessonColor(lesson.type)}`}>
                                                                    {lesson.type}
                                                                </Badge>
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                Duration: {lesson.duration}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-muted-foreground group-hover:text-blue-600 transition-colors">
                                                        {lesson.completed ? 'Review' : 'Start'}
                                                        <PlayCircle className="h-4 w-4" />
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Instructor */}
                <Card>
                    <CardHeader>
                        <CardTitle>About the Instructor</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-start gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                SC
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">{course.instructor}</h3>
                                <p className="text-muted-foreground mb-3">{course.instructorBio}</p>
                                <div className="flex gap-4 text-sm">
                                    <div>
                                        <div className="font-semibold">4.8</div>
                                        <div className="text-muted-foreground">Instructor Rating</div>
                                    </div>
                                    <div>
                                        <div className="font-semibold">12,457</div>
                                        <div className="text-muted-foreground">Students</div>
                                    </div>
                                    <div>
                                        <div className="font-semibold">8</div>
                                        <div className="text-muted-foreground">Courses</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardContent>
    )
}