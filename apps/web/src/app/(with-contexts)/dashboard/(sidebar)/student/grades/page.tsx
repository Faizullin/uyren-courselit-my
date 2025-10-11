// app/dashboard/student/grades/page.tsx
"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";
import { TrendingUp, Award, BarChart3, BookOpen, Code, FileText, Calendar, Download, Eye } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useState } from "react";

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const breadcrumbs = [{ label: t("common:dashboard.student.grades.title"), href: "#" }];

    // IT-focused grades data
    const courses = [
        {
            id: 1,
            name: "Python Programming Fundamentals",
            instructor: "Dr. Sarah Chen",
            currentGrade: 92,
            assignments: [
                { name: "Python Basics Quiz", score: 45, maxScore: 50, weight: 10, type: "quiz", submitted: "2024-01-08" },
                { name: "Data Structures Implementation", score: 48, maxScore: 50, weight: 15, type: "coding", submitted: "2024-01-15" },
                { name: "OOP Concepts Project", score: 95, maxScore: 100, weight: 20, type: "project", submitted: "2024-01-22" },
                { name: "Midterm Exam", score: 88, maxScore: 100, weight: 25, type: "exam", submitted: "2024-02-01" }
            ],
            language: "Python",
            category: "Programming",
            progress: 85
        },
        {
            id: 2,
            name: "Web Development Bootcamp",
            instructor: "Prof. Mike Johnson",
            currentGrade: 85,
            assignments: [
                { name: "HTML/CSS Portfolio", score: 38, maxScore: 40, weight: 15, type: "project", submitted: "2024-01-10" },
                { name: "JavaScript Fundamentals", score: 28, maxScore: 30, weight: 10, type: "quiz", submitted: "2024-01-17" },
                { name: "React Component Library", score: 85, maxScore: 100, weight: 25, type: "project", submitted: "2024-01-25" },
                { name: "Midterm Project", score: 82, maxScore: 100, weight: 30, type: "project", submitted: "2024-02-05" }
            ],
            language: "JavaScript",
            category: "Web Development",
            progress: 70
        },
        {
            id: 3,
            name: "Data Science with Python",
            instructor: "Dr. Emily Zhang",
            currentGrade: 95,
            assignments: [
                { name: "Pandas Data Analysis", score: 95, maxScore: 100, weight: 20, type: "analysis", submitted: "2024-01-12" },
                { name: "Data Visualization", score: 48, maxScore: 50, weight: 15, type: "project", submitted: "2024-01-19" },
                { name: "Machine Learning Basics", score: 92, maxScore: 100, weight: 25, type: "project", submitted: "2024-01-26" },
                { name: "Midterm Analysis", score: 96, maxScore: 100, weight: 30, type: "analysis", submitted: "2024-02-02" }
            ],
            language: "Python",
            category: "Data Science",
            progress: 90
        },
        {
            id: 4,
            name: "Cloud Computing & AWS",
            instructor: "Prof. David Wilson",
            currentGrade: 78,
            assignments: [
                { name: "EC2 Deployment Lab", score: 35, maxScore: 40, weight: 15, type: "lab", submitted: "2024-01-14" },
                { name: "S3 Storage Setup", score: 42, maxScore: 50, weight: 20, type: "lab", submitted: "2024-01-21" },
                { name: "Cloud Security Config", score: 70, maxScore: 100, weight: 25, type: "project", submitted: "2024-01-28" }
            ],
            language: "YAML/JSON",
            category: "Cloud Computing",
            progress: 60
        }
    ];

    const [selectedCourse, setSelectedCourse] = useState<number | null>(null);

    const getGradeColor = (grade: number) => {
        if (grade >= 90) return "text-green-600";
        if (grade >= 80) return "text-blue-600";
        if (grade >= 70) return "text-yellow-600";
        return "text-red-600";
    };

    const getGradeBadge = (grade: number) => {
        if (grade >= 90) return <Badge className="bg-green-100 text-green-800">A</Badge>;
        if (grade >= 80) return <Badge className="bg-blue-100 text-blue-800">B</Badge>;
        if (grade >= 70) return <Badge className="bg-yellow-100 text-yellow-800">C</Badge>;
        return <Badge className="bg-red-100 text-red-800">D</Badge>;
    };

    const getAssignmentIcon = (type: string) => {
        switch (type) {
            case 'quiz': return <FileText className="h-4 w-4" />;
            case 'coding': return <Code className="h-4 w-4" />;
            case 'project': return <Code className="h-4 w-4" />;
            case 'exam': return <FileText className="h-4 w-4" />;
            case 'analysis': return <BarChart3 className="h-4 w-4" />;
            case 'lab': return <Code className="h-4 w-4" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    const getAssignmentColor = (type: string) => {
        switch (type) {
            case 'quiz': return "text-blue-600 bg-blue-100";
            case 'coding': return "text-green-600 bg-green-100";
            case 'project': return "text-purple-600 bg-purple-100";
            case 'exam': return "text-orange-600 bg-orange-100";
            case 'analysis': return "text-indigo-600 bg-indigo-100";
            case 'lab': return "text-red-600 bg-red-100";
            default: return "text-gray-600 bg-gray-100";
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    // Calculate overall statistics
    const overallStats = {
        averageGrade: Math.round(courses.reduce((acc, course) => acc + course.currentGrade, 0) / courses.length),
        totalAssignments: courses.reduce((acc, course) => acc + course.assignments.length, 0),
        completedCourses: courses.filter(course => course.progress === 100).length,
        improvement: "+5% this month" // This would be calculated from historical data
    };

    const selectedCourseData = selectedCourse ? courses.find(course => course.id === selectedCourse) : null;

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="flex flex-col gap-6">
                <HeaderTopbar
                    header={{
                        title: t("common:dashboard.student.grades.title"),
                        subtitle: "Track your coding assignments and project grades"
                    }}
                />

                {/* Overall Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Average Grade</p>
                                    <p className="text-2xl font-bold mt-1">{overallStats.averageGrade}%</p>
                                    <p className="text-xs text-muted-foreground mt-1">Across all courses</p>
                                </div>
                                <div className="p-3 rounded-full bg-muted text-blue-600">
                                    <BarChart3 className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Assignments</p>
                                    <p className="text-2xl font-bold mt-1">{overallStats.totalAssignments}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Graded work</p>
                                </div>
                                <div className="p-3 rounded-full bg-muted text-green-600">
                                    <FileText className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Completed Courses</p>
                                    <p className="text-2xl font-bold mt-1">{overallStats.completedCourses}</p>
                                    <p className="text-xs text-muted-foreground mt-1">With certificates</p>
                                </div>
                                <div className="p-3 rounded-full bg-muted text-purple-600">
                                    <Award className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Trend</p>
                                    <p className="text-2xl font-bold mt-1">+5%</p>
                                    <p className="text-xs text-muted-foreground mt-1">This month</p>
                                </div>
                                <div className="p-3 rounded-full bg-muted text-orange-600">
                                    <TrendingUp className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Course List */}
                    <div className="lg:col-span-2 space-y-6">
                        {courses.map((course) => (
                            <Card key={course.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                                <CardTitle className="text-lg">{course.name}</CardTitle>
                                                <Badge variant="outline">{course.category}</Badge>
                                                <Badge variant="secondary">{course.language}</Badge>
                                            </div>
                                            
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                                <span>Instructor: {course.instructor}</span>
                                                <span>Progress: {course.progress}%</span>
                                            </div>

                                            {/* Recent Assignments */}
                                            <div className="space-y-3">
                                                <h4 className="font-medium text-sm">Recent Assignments</h4>
                                                {course.assignments.slice(0, 3).map((assignment, index) => (
                                                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-full ${getAssignmentColor(assignment.type)}`}>
                                                                {getAssignmentIcon(assignment.type)}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-sm">{assignment.name}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Submitted {formatDate(assignment.submitted)} • Weight: {assignment.weight}%
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-medium">
                                                                {assignment.score}/{assignment.maxScore}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {Math.round((assignment.score / assignment.maxScore) * 100)}%
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="ml-6 text-center">
                                            <div className={`text-3xl font-bold ${getGradeColor(course.currentGrade)} mb-2`}>
                                                {course.currentGrade}%
                                            </div>
                                            {getGradeBadge(course.currentGrade)}
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="mt-3"
                                                onClick={() => setSelectedCourse(course.id)}
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                Details
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Sidebar - Course Details or Quick Actions */}
                    <div className="space-y-6">
                        {selectedCourseData ? (
                            /* Course Details View */
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle>Grade Details</CardTitle>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setSelectedCourse(null)}
                                        >
                                            Back
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                                            <div className={`text-4xl font-bold ${getGradeColor(selectedCourseData.currentGrade)} mb-2`}>
                                                {selectedCourseData.currentGrade}%
                                            </div>
                                            <div className="flex items-center justify-center gap-2">
                                                {getGradeBadge(selectedCourseData.currentGrade)}
                                                <span className="text-sm text-muted-foreground">
                                                    Current Grade
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-medium mb-3">Assignment Breakdown</h4>
                                            <div className="space-y-3">
                                                {selectedCourseData.assignments.map((assignment, index) => (
                                                    <div key={index} className="space-y-2">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="flex items-center gap-2">
                                                                <div className={`p-1 rounded ${getAssignmentColor(assignment.type)}`}>
                                                                    {getAssignmentIcon(assignment.type)}
                                                                </div>
                                                                {assignment.name}
                                                            </span>
                                                            <span>{assignment.score}/{assignment.maxScore}</span>
                                                        </div>
                                                        <div className="flex justify-between text-xs text-muted-foreground">
                                                            <span>Weight: {assignment.weight}%</span>
                                                            <span>{Math.round((assignment.score / assignment.maxScore) * 100)}%</span>
                                                        </div>
                                                        <Progress 
                                                            value={(assignment.score / assignment.maxScore) * 100} 
                                                            className="h-2"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <Button variant="outline" className="w-full">
                                            <Download className="h-4 w-4 mr-2" />
                                            Download Grade Report
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            /* Quick Actions View */
                            <>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Quick Actions</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <Button variant="outline" className="w-full justify-start">
                                            <Download className="h-4 w-4 mr-2" />
                                            Download All Grades
                                        </Button>
                                        <Button variant="outline" className="w-full justify-start">
                                            <Award className="h-4 w-4 mr-2" />
                                            View Certificates
                                        </Button>
                                        <Button variant="outline" className="w-full justify-start">
                                            <BarChart3 className="h-4 w-4 mr-2" />
                                            Progress Analytics
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Performance Summary</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span>Programming</span>
                                                    <span className="font-semibold">92%</span>
                                                </div>
                                                <Progress value={92} className="h-2" />
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span>Web Development</span>
                                                    <span className="font-semibold">85%</span>
                                                </div>
                                                <Progress value={85} className="h-2" />
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span>Data Science</span>
                                                    <span className="font-semibold">95%</span>
                                                </div>
                                                <Progress value={95} className="h-2" />
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span>Cloud Computing</span>
                                                    <span className="font-semibold">78%</span>
                                                </div>
                                                <Progress value={78} className="h-2" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Recent Feedback</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <div className="p-3 border rounded-lg">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <BookOpen className="h-4 w-4 text-blue-600" />
                                                    <span className="font-medium text-sm">Python OOP Project</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    "Excellent implementation! Your class design shows strong understanding of OOP principles."
                                                </p>
                                            </div>
                                            <div className="p-3 border rounded-lg">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Code className="h-4 w-4 text-green-600" />
                                                    <span className="font-medium text-sm">React Component Library</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    "Great work on reusable components. Consider adding more TypeScript types for better safety."
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </div>
                </div>

                {/* Empty State (if no courses) */}
                {courses.length === 0 && (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No grades available</h3>
                            <p className="text-muted-foreground mb-4">
                                You haven't completed any graded assignments yet.
                            </p>
                            <Button asChild>
                                <Link href="/dashboard/student/courses">
                                    Browse Courses
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardContent>
    )
}