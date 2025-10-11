// app/dashboard/student/assignments/[id]/page.tsx
"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";
import { Textarea } from "@workspace/ui/components/textarea";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  Upload, 
  Code, 
  BookOpen,
  MessageSquare,
  Eye,
  Star,
  Users
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useState } from "react";

export default function Page() {
  const { t } = useTranslation(["dashboard", "common"]);
  const params = useParams();
  const assignmentId = params.id as string;

  // Dummy assignment data
  const assignment = {
    id: assignmentId,
    title: "Python Data Structures Implementation",
    description: "Implement custom data structures including linked lists, stacks, queues, and hash tables from scratch. This assignment will test your understanding of fundamental data structures and their practical implementations in Python.",
    course: "Python Programming Fundamentals",
    courseId: "1",
    dueDate: "2024-01-15T23:59:00",
    status: "submitted", // pending, submitted, graded, overdue
    score: 45,
    maxScore: 50,
    submittedDate: "2024-01-14T14:30:00",
    gradedDate: "2024-01-15T10:00:00",
    type: "coding",
    language: "Python",
    estimatedTime: "4 hours",
    difficulty: "Intermediate",
    resources: [
      { id: 1, name: "Assignment Instructions.pdf", type: "pdf", size: "2.4 MB" },
      { id: 2, name: "Starter Code.py", type: "code", size: "1.2 KB" },
      { id: 3, name: "Test Cases.py", type: "code", size: "3.1 KB" },
      { id: 4, name: "Data Structures Guide.md", type: "document", size: "0.8 MB" }
    ],
    requirements: [
      "Implement LinkedList class with append, prepend, delete, and search methods",
      "Create Stack and Queue classes using both list and node-based implementations",
      "Build HashTable class with collision handling using chaining",
      "Write comprehensive unit tests for all data structures",
      "Include time complexity analysis in comments",
      "Follow PEP 8 style guide"
    ],
    gradingCriteria: [
      { criterion: "Code Correctness", weight: 40, score: 18, maxScore: 20 },
      { criterion: "Code Quality & Style", weight: 20, score: 9, maxScore: 10 },
      { criterion: "Test Coverage", weight: 20, score: 10, maxScore: 10 },
      { criterion: "Documentation", weight: 10, score: 5, maxScore: 5 },
      { criterion: "Time Complexity", weight: 10, score: 3, maxScore: 5 }
    ],
    instructor: "Dr. Sarah Chen",
    instructorNotes: "Excellent implementation! Your linked list and hash table implementations are particularly well-done. Consider optimizing the queue implementation for better time complexity.",
    submission: {
      files: [
        { id: 1, name: "data_structures.py", type: "code", size: "8.7 KB", uploadedAt: "2024-01-14T14:30:00" },
        { id: 2, name: "test_data_structures.py", type: "code", size: "4.2 KB", uploadedAt: "2024-01-14T14:30:00" },
        { id: 3, name: "README.md", type: "document", size: "1.1 KB", uploadedAt: "2024-01-14T14:30:00" }
      ],
      notes: "Implemented all required data structures with comprehensive testing. Used docstrings for documentation and followed PEP 8 guidelines."
    }
  };

  const [submissionText, setSubmissionText] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const breadcrumbs = [
    { label: t("common:dashboard.student.assignments.title"), href: "/dashboard/student/assignments" },
    { label: assignment.title, href: "#" }
  ];

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { variant: "outline" as const, icon: Clock, text: "Pending", color: "text-orange-600", bgColor: "bg-orange-50" },
      submitted: { variant: "secondary" as const, icon: CheckCircle, text: "Submitted", color: "text-blue-600", bgColor: "bg-blue-50" },
      graded: { variant: "default" as const, icon: CheckCircle, text: "Graded", color: "text-green-600", bgColor: "bg-green-50" },
      overdue: { variant: "destructive" as const, icon: AlertCircle, text: "Overdue", color: "text-red-600", bgColor: "bg-red-50" }
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'coding': return <Code className="h-4 w-4" />;
      case 'project': return <FileText className="h-4 w-4" />;
      case 'analysis': return <BookOpen className="h-4 w-4" />;
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = new Date(assignment.dueDate) < new Date();
  const timeRemaining = new Date(assignment.dueDate).getTime() - new Date().getTime();
  const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    }
  };

  const handleSubmit = () => {
    // In real app, this would submit to an API
    alert('Assignment submitted successfully!');
  };

  const statusConfig = getStatusConfig(assignment.status);

  return (
    <DashboardContent breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard/student/assignments">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Assignments
            </Button>
          </Link>
          <HeaderTopbar
            header={{
              title: assignment.title,
              subtitle: assignment.course
            }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Assignment Overview */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                      <statusConfig.icon className="h-3 w-3" />
                      {statusConfig.text}
                    </Badge>
                    <Badge variant="outline" className={getDifficultyColor(assignment.difficulty)}>
                      {assignment.difficulty}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      {getTypeIcon(assignment.type)}
                      <span>{assignment.type}</span>
                    </div>
                  </div>
                  {assignment.status === 'graded' && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {assignment.score}/{assignment.maxScore}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {Math.round((assignment.score / assignment.maxScore) * 100)}%
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-muted-foreground mb-6">{assignment.description}</p>

                {/* Due Date & Time */}
                <div className={`p-4 rounded-lg border ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className={`h-5 w-5 ${isOverdue ? 'text-red-600' : 'text-blue-600'}`} />
                      <div>
                        <div className="font-medium">
                          {isOverdue ? 'Overdue' : `Due in ${daysRemaining} days`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDateTime(assignment.dueDate)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {assignment.estimatedTime}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Assignment Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {assignment.requirements.map((requirement, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-blue-600 text-sm font-bold">{index + 1}</span>
                      </div>
                      <span className="text-sm">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Resources */}
            <Card>
              <CardHeader>
                <CardTitle>Resources & Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {assignment.resources.map((resource) => (
                    <div key={resource.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{resource.name}</p>
                          <p className="text-xs text-muted-foreground">{resource.size}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Submission Area - Only show if not submitted/graded */}
            {(assignment.status === 'pending' || assignment.status === 'overdue') && (
              <Card>
                <CardHeader>
                  <CardTitle>Submit Your Work</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Submission Notes</label>
                    <Textarea
                      placeholder="Describe your submission, any challenges you faced, or additional notes for the instructor..."
                      value={submissionText}
                      onChange={(e) => setSubmissionText(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Upload Files</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Drag and drop your files here, or click to browse
                      </p>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <Button variant="outline" asChild>
                        <label htmlFor="file-upload" className="cursor-pointer">
                          Choose Files
                        </label>
                      </Button>
                    </div>
                    {files.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {files.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm">{file.name}</span>
                            <Button variant="ghost" size="sm" onClick={() => setFiles(files.filter((_, i) => i !== index))}>
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button onClick={handleSubmit} className="w-full" size="lg">
                    Submit Assignment
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Submission Details - Show if submitted/graded */}
            {(assignment.status === 'submitted' || assignment.status === 'graded') && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Submission</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Submission Notes</label>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm">{assignment.submission.notes}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Submitted Files</label>
                      <div className="space-y-2">
                        {assignment.submission.files.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {file.size} • Submitted {formatDateTime(file.uploadedAt)}
                                </p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Submitted on {formatDateTime(assignment.submittedDate)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Grading Results - Show if graded */}
            {assignment.status === 'graded' && (
              <Card>
                <CardHeader>
                  <CardTitle>Grading Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Overall Score */}
                    <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {assignment.score}/{assignment.maxScore}
                      </div>
                      <div className="text-lg font-semibold">
                        {Math.round((assignment.score / assignment.maxScore) * 100)}%
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Graded on {formatDateTime(assignment.gradedDate)}
                      </div>
                    </div>

                    {/* Grading Breakdown */}
                    <div>
                      <h4 className="font-medium mb-3">Grading Breakdown</h4>
                      <div className="space-y-3">
                        {assignment.gradingCriteria.map((criterion, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>{criterion.criterion}</span>
                              <span>{criterion.score}/{criterion.maxScore}</span>
                            </div>
                            <Progress 
                              value={(criterion.score / criterion.maxScore) * 100} 
                              className="h-2"
                            />
                            <div className="text-xs text-muted-foreground">
                              Weight: {criterion.weight}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Instructor Feedback */}
                    <div>
                      <h4 className="font-medium mb-3">Instructor Feedback</h4>
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-sm mb-1">{assignment.instructor}</div>
                            <p className="text-sm text-muted-foreground">{assignment.instructorNotes}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/dashboard/student/courses/${assignment.courseId}`}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    View Course
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Ask Question
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Download All Resources
                </Button>
              </CardContent>
            </Card>

            {/* Assignment Info */}
            <Card>
              <CardHeader>
                <CardTitle>Assignment Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{assignment.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Language</span>
                  <span className="font-medium">{assignment.language}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Difficulty</span>
                  <Badge variant="outline" className={getDifficultyColor(assignment.difficulty)}>
                    {assignment.difficulty}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Time</span>
                  <span className="font-medium">{assignment.estimatedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Instructor</span>
                  <span className="font-medium">{assignment.instructor}</span>
                </div>
              </CardContent>
            </Card>

            {/* Status Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Status Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Assignment Created</div>
                      <div className="text-xs text-muted-foreground">{formatDate("2024-01-01")}</div>
                    </div>
                  </div>
                  {assignment.submittedDate && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Submitted</div>
                        <div className="text-xs text-muted-foreground">{formatDate(assignment.submittedDate)}</div>
                      </div>
                    </div>
                  )}
                  {assignment.gradedDate && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Graded</div>
                        <div className="text-xs text-muted-foreground">{formatDate(assignment.gradedDate)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardContent>
  );
}