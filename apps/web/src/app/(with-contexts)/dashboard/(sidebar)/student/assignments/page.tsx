// app/dashboard/student/assignments/page.tsx
"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";
import { Calendar, Clock, FileText, CheckCircle, AlertCircle, PlayCircle, Code, Download, ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useState } from "react";

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const breadcrumbs = [{ label: t("common:dashboard.student.assignments.title"), href: "#" }];

    // IT-focused dummy assignments data
    const assignments = [
        {
            id: 1,
            title: "Python Data Structures Implementation",
            course: "Python Programming Fundamentals",
            courseId: "1",
            dueDate: "2024-01-15T23:59:00",
            status: "submitted",
            score: 45,
            maxScore: 50,
            submittedDate: "2024-01-14T14:30:00",
            type: "coding",
            language: "Python",
            description: "Implement custom data structures including linked lists and hash tables",
            resources: 3,
            estimatedTime: "4 hours",
            difficulty: "Intermediate"
        },
        {
            id: 2,
            title: "React Component Library",
            course: "Web Development Bootcamp", 
            courseId: "2",
            dueDate: "2024-01-18T23:59:00",
            status: "pending",
            type: "project",
            language: "JavaScript",
            description: "Build a reusable React component library with Storybook documentation",
            resources: 5,
            estimatedTime: "6 hours",
            difficulty: "Advanced"
        },
        {
            id: 3,
            title: "Data Analysis with Pandas",
            course: "Data Science with Python",
            courseId: "3",
            dueDate: "2024-01-20T12:00:00",
            status: "graded",
            score: 38,
            maxScore: 40,
            submittedDate: "2024-01-19T10:15:00",
            type: "analysis",
            language: "Python",
            description: "Analyze dataset and create visualizations using Pandas and Matplotlib",
            resources: 2,
            estimatedTime: "3 hours",
            difficulty: "Intermediate"
        },
        {
            id: 4,
            title: "AWS EC2 Deployment Script",
            course: "Cloud Computing & AWS",
            courseId: "4",
            dueDate: "2024-01-22T14:00:00",
            status: "overdue",
            type: "scripting",
            language: "Bash/Python",
            description: "Create deployment scripts for AWS EC2 instances with auto-scaling",
            resources: 4,
            estimatedTime: "5 hours",
            difficulty: "Advanced"
        },
        {
            id: 5,
            title: "Mobile App UI Components",
            course: "Mobile App Development",
            courseId: "5",
            dueDate: "2024-01-25T23:59:00",
            status: "pending",
            type: "development",
            language: "React Native",
            description: "Design and implement responsive UI components for mobile application",
            resources: 3,
            estimatedTime: "4 hours",
            difficulty: "Intermediate"
        },
        {
            id: 6,
            title: "Network Security Assessment",
            course: "Cybersecurity Fundamentals",
            courseId: "6",
            dueDate: "2024-01-28T16:00:00",
            status: "submitted",
            score: 28,
            maxScore: 30,
            submittedDate: "2024-01-27T15:45:00",
            type: "report",
            language: "N/A",
            description: "Conduct security assessment and write comprehensive report",
            resources: 2,
            estimatedTime: "3 hours",
            difficulty: "Beginner"
        }
    ];

    const [filter, setFilter] = useState("all");

    const filteredAssignments = assignments.filter(assignment => {
        if (filter === "all") return true;
        return assignment.status === filter;
    });

    const getStatusBadge = (status: string) => {
        const variants = {
            submitted: { variant: "secondary" as const, icon: CheckCircle, text: "Submitted", color: "text-green-600" },
            pending: { variant: "outline" as const, icon: Clock, text: "Pending", color: "text-orange-600" },
            graded: { variant: "default" as const, icon: CheckCircle, text: "Graded", color: "text-blue-600" },
            overdue: { variant: "destructive" as const, icon: AlertCircle, text: "Overdue", color: "text-red-600" }
        };
        
        const config = variants[status as keyof typeof variants] || variants.pending;
        const IconComponent = config.icon;
        
        return (
            <Badge variant={config.variant} className="flex items-center gap-1">
                <IconComponent className="h-3 w-3" />
                {config.text}
            </Badge>
        );
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'coding': return <Code className="h-4 w-4" />;
            case 'project': return <FileText className="h-4 w-4" />;
            case 'analysis': return <BookOpen className="h-4 w-4" />;
            case 'scripting': return <Code className="h-4 w-4" />;
            case 'development': return <Code className="h-4 w-4" />;
            case 'report': return <FileText className="h-4 w-4" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case 'beginner': return 'bg-green-100 text-green-800';
            case 'intermediate': return 'bg-blue-100 text-blue-800';
            case 'advanced': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const isUpcoming = (dueDate: string) => {
        return new Date(dueDate) > new Date();
    };

    const stats = {
        total: assignments.length,
        submitted: assignments.filter(a => a.status === 'submitted' || a.status === 'graded').length,
        pending: assignments.filter(a => a.status === 'pending').length,
        overdue: assignments.filter(a => a.status === 'overdue').length
    };

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="flex flex-col gap-6">
                <HeaderTopbar
                    header={{
                        title: t("common:dashboard.student.assignments.title"),
                        subtitle: "Track your coding assignments and project submissions"
                    }}
                />

                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total</p>
                                    <p className="text-xl font-bold">{stats.total}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Submitted</p>
                                    <p className="text-xl font-bold">{stats.submitted}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <Clock className="h-5 w-5 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Pending</p>
                                    <p className="text-xl font-bold">{stats.pending}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 rounded-lg">
                                    <AlertCircle className="h-5 w-5 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                                    <p className="text-xl font-bold">{stats.overdue}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant={filter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("all")}
                    >
                        All Assignments
                    </Button>
                    <Button
                        variant={filter === "pending" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("pending")}
                    >
                        Pending
                    </Button>
                    <Button
                        variant={filter === "submitted" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("submitted")}
                    >
                        Submitted
                    </Button>
                    <Button
                        variant={filter === "graded" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("graded")}
                    >
                        Graded
                    </Button>
                    <Button
                        variant={filter === "overdue" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("overdue")}
                    >
                        Overdue
                    </Button>
                </div>

                {/* Assignments List */}
                <div className="space-y-4">
                    {filteredAssignments.map((assignment) => (
                        <Link 
                            key={assignment.id} 
                            href={`/dashboard/student/assignments/${assignment.id}`}
                            className="block"
                        >
                            <Card className="hover:shadow-md transition-shadow cursor-pointer group border-l-4 border-l-blue-500">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                                <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                                                    {assignment.title}
                                                </CardTitle>
                                                {getStatusBadge(assignment.status)}
                                            </div>
                                            
                                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                                                <span className="flex items-center gap-1">
                                                    <BookOpen className="h-4 w-4" />
                                                    {assignment.course}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    {getTypeIcon(assignment.type)}
                                                    {assignment.type.charAt(0).toUpperCase() + assignment.type.slice(1)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Code className="h-4 w-4" />
                                                    {assignment.language}
                                                </span>
                                                <Badge variant="outline" className={getDifficultyColor(assignment.difficulty)}>
                                                    {assignment.difficulty}
                                                </Badge>
                                            </div>

                                            <p className="text-sm text-muted-foreground mb-4">
                                                {assignment.description}
                                            </p>

                                            <div className="flex flex-wrap items-center gap-6 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className={`h-4 w-4 ${
                                                        !isUpcoming(assignment.dueDate) ? 'text-red-500' : 'text-muted-foreground'
                                                    }`} />
                                                    <span className={!isUpcoming(assignment.dueDate) ? 'text-red-600 font-medium' : ''}>
                                                        Due: {formatDate(assignment.dueDate)} at {formatTime(assignment.dueDate)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                    <span>{assignment.estimatedTime}</span>
                                                </div>
                                                {assignment.resources > 0 && (
                                                    <div className="flex items-center gap-2">
                                                        <Download className="h-4 w-4 text-muted-foreground" />
                                                        <span>{assignment.resources} resources</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Score if graded */}
                                            {(assignment.status === 'graded' || assignment.status === 'submitted') && assignment.score && (
                                                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium">
                                                            Score: {assignment.score}/{assignment.maxScore} 
                                                            ({Math.round((assignment.score / assignment.maxScore) * 100)}%)
                                                        </span>
                                                        {assignment.status === 'graded' && (
                                                            <Badge variant="default" className="bg-green-100 text-green-800">
                                                                Graded
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {assignment.submittedDate && (
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            Submitted on {formatDate(assignment.submittedDate)}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 ml-4">
                                            {assignment.status === 'pending' && (
                                                <div className="flex items-center gap-1 text-blue-600 group-hover:translate-x-1 transition-transform">
                                                    <PlayCircle className="h-4 w-4" />
                                                    <span className="text-sm font-medium">Start</span>
                                                </div>
                                            )}
                                            {assignment.status === 'overdue' && (
                                                <div className="flex items-center gap-1 text-red-600 group-hover:translate-x-1 transition-transform">
                                                    <AlertCircle className="h-4 w-4" />
                                                    <span className="text-sm font-medium">Submit Late</span>
                                                </div>
                                            )}
                                            {(assignment.status === 'submitted' || assignment.status === 'graded') && (
                                                <div className="flex items-center gap-1 text-green-600 group-hover:translate-x-1 transition-transform">
                                                    <CheckCircle className="h-4 w-4" />
                                                    <span className="text-sm font-medium">View</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}

                    {filteredAssignments.length === 0 && (
                        <Card>
                            <CardContent className="p-8 text-center">
                                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No assignments found</h3>
                                <p className="text-muted-foreground">
                                    {filter === "all" 
                                        ? "You don't have any assignments yet." 
                                        : `No ${filter} assignments match your filter.`}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Upcoming Deadlines */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Upcoming Deadlines
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {assignments
                                .filter(a => a.status === 'pending' && isUpcoming(a.dueDate))
                                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                                .slice(0, 3)
                                .map((assignment) => (
                                    <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                                                <Clock className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{assignment.title}</p>
                                                <p className="text-xs text-muted-foreground">{assignment.course}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="outline" className="text-xs">
                                                Due {formatDate(assignment.dueDate)}
                                            </Badge>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {formatTime(assignment.dueDate)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            {assignments.filter(a => a.status === 'pending' && isUpcoming(a.dueDate)).length === 0 && (
                                <div className="text-center py-4 text-muted-foreground">
                                    No upcoming deadlines
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardContent>
    )
}