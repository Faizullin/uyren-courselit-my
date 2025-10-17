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
  Users,
  X,
  File,
  Plus,
  Send
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useState, useCallback, useRef, useEffect } from "react";

interface UploadedFile {
  id: string;
  file: File;
  uploadProgress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

interface SubmissionFile {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
}

interface Question {
  id: string;
  text: string;
  createdAt: string;
  status: 'pending' | 'answered';
  answer?: string;
  answeredAt?: string;
}

// Store uploaded files separately in memory (not in localStorage)
let uploadedFilesMemory: { [key: string]: File } = {};

export default function Page() {
  const { t } = useTranslation(["dashboard", "common"]);
  const params = useParams();
  const assignmentId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on component mount - do this BEFORE useState
  const loadInitialData = () => {
    const savedAssignment = localStorage.getItem(`assignment-${assignmentId}`);
    const savedQuestions = localStorage.getItem(`questions-${assignmentId}`);
    
    let assignmentData = {
      id: assignmentId,
      title: "Python Data Structures Implementation",
      description: "Implement custom data structures including linked lists, stacks, queues, and hash tables from scratch. This assignment will test your understanding of fundamental data structures and their practical implementations in Python.",
      course: "Python Programming Fundamentals",
      courseId: "1",
      dueDate: "2024-01-15T23:59:00",
      status: "pending" as "pending" | "submitted" | "graded",
      score: 0,
      maxScore: 50,
      submittedDate: "",
      gradedDate: "",
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
      instructor: "Dr. Sarah Chen",
      submission: {
        files: [] as SubmissionFile[],
        notes: ""
      }
    };

    let questionsData: Question[] = [];

    if (savedAssignment) {
      try {
        const parsed = JSON.parse(savedAssignment);
        assignmentData = {
          ...assignmentData,
          status: parsed.status,
          submittedDate: parsed.submittedDate,
          submission: {
            files: parsed.submission?.files || [],
            notes: parsed.submission?.notes || ""
          }
        };
      } catch (error) {
        console.error('Error parsing saved assignment:', error);
      }
    }

    if (savedQuestions) {
      try {
        questionsData = JSON.parse(savedQuestions);
      } catch (error) {
        console.error('Error parsing saved questions:', error);
      }
    }

    return { assignmentData, questionsData };
  };

  const { assignmentData, questionsData } = loadInitialData();

  // State for assignment data that can be updated
  const [assignment, setAssignment] = useState(assignmentData);
  const [submissionText, setSubmissionText] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [questions, setQuestions] = useState<Question[]>(questionsData);
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);

  // Save to localStorage whenever assignment changes
  useEffect(() => {
    localStorage.setItem(`assignment-${assignmentId}`, JSON.stringify(assignment));
  }, [assignment, assignmentId]);

  // Save to localStorage whenever questions change
  useEffect(() => {
    localStorage.setItem(`questions-${assignmentId}`, JSON.stringify(questions));
  }, [questions, assignmentId]);

  const breadcrumbs = [
    { label: t("common:dashboard.student.assignments.title"), href: "/dashboard/student/assignments" },
    { label: assignment.title, href: "#" }
  ];

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { variant: "outline" as const, icon: Clock, text: "Pending", color: "text-orange-600", bgColor: "bg-orange-50" },
      submitted: { variant: "secondary" as const, icon: CheckCircle, text: "Submitted", color: "text-blue-600", bgColor: "bg-blue-50" },
      graded: { variant: "default" as const, icon: CheckCircle, text: "Graded", color: "text-green-600", bgColor: "bg-green-50" }
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
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
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

  // File upload handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files).map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        uploadProgress: 0,
        status: 'uploading' as const
      }));
      
      setUploadedFiles(prev => [...prev, ...newFiles]);
      
      // Store files in memory for download
      newFiles.forEach(uploadedFile => {
        uploadedFilesMemory[uploadedFile.id] = uploadedFile.file;
      });
      
      // Simulate file upload progress
      newFiles.forEach(file => {
        simulateFileUpload(file.id);
      });
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const simulateFileUpload = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { ...f, uploadProgress: 100, status: 'completed' }
              : f
          )
        );
      } else {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { ...f, uploadProgress: Math.min(progress, 100) }
              : f
          )
        );
      }
    }, 200);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    // Also remove from memory
    delete uploadedFilesMemory[fileId];
  };

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      const newFiles = files.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        uploadProgress: 0,
        status: 'uploading' as const
      }));
      
      setUploadedFiles(prev => [...prev, ...newFiles]);
      
      // Store files in memory for download
      newFiles.forEach(uploadedFile => {
        uploadedFilesMemory[uploadedFile.id] = uploadedFile.file;
      });
      
      // Simulate file upload progress
      newFiles.forEach(file => {
        simulateFileUpload(file.id);
      });
    }
  }, []);

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      alert('Please upload at least one file before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Convert uploaded files to submission format
      const submissionFiles: SubmissionFile[] = uploadedFiles.map(uploadedFile => ({
        id: uploadedFile.id,
        name: uploadedFile.file.name,
        type: getFileType(uploadedFile.file.name),
        size: formatFileSize(uploadedFile.file.size),
        uploadedAt: new Date().toISOString(),
      }));

      // Update assignment state with submission data
      setAssignment(prev => ({
        ...prev,
        status: 'submitted',
        submittedDate: new Date().toISOString(),
        submission: {
          files: [...prev.submission.files, ...submissionFiles], // Append new files
          notes: submissionText || prev.submission.notes
        }
      }));
      
      alert('Assignment submitted successfully!');
      
      // Reset form but keep the submission text
      setUploadedFiles([]);
      
    } catch (error) {
      alert('Failed to submit assignment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete a submitted file
  const deleteSubmittedFile = (fileId: string) => {
    setAssignment(prev => ({
      ...prev,
      submission: {
        ...prev.submission,
        files: prev.submission.files.filter(f => f.id !== fileId)
      }
    }));
    // Also remove from memory
    delete uploadedFilesMemory[fileId];
  };

  // Download a submitted file
  const downloadFile = (file: SubmissionFile) => {
    const fileObject = uploadedFilesMemory[file.id];
    if (fileObject) {
      // Create a download link for the actual file
      const url = URL.createObjectURL(fileObject);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // For files that don't exist in memory (page reloaded)
      alert('File download not available. The file content is only available during the current browser session. Please re-upload the file to enable download.');
    }
  };

  // Ask a question
  const handleAskQuestion = async () => {
    if (!newQuestion.trim()) {
      alert('Please enter a question.');
      return;
    }

    setIsAskingQuestion(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const question: Question = {
        id: Math.random().toString(36).substr(2, 9),
        text: newQuestion,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      setQuestions(prev => [question, ...prev]);
      setNewQuestion('');
      
      alert('Question submitted successfully!');
      
    } catch (error) {
      alert('Failed to submit question. Please try again.');
    } finally {
      setIsAskingQuestion(false);
    }
  };

  // Delete a question
  const deleteQuestion = (questionId: string) => {
    setQuestions(prev => prev.filter(q => q.id !== questionId));
  };

  const getFileType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'pdf';
      case 'py': case 'js': case 'ts': case 'java': case 'cpp': case 'c': return 'code';
      case 'md': case 'txt': return 'document';
      case 'zip': case 'rar': case '7z': return 'archive';
      default: return 'file';
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'py':
      case 'js':
      case 'ts':
      case 'java':
      case 'cpp':
      case 'c':
        return <Code className="h-4 w-4 text-blue-500" />;
      case 'md':
      case 'txt':
        return <FileText className="h-4 w-4 text-gray-500" />;
      case 'zip':
      case 'rar':
      case '7z':
        return <File className="h-4 w-4 text-purple-500" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
                  {/* Only show score if graded */}
                  {assignment.status === 'graded' && assignment.score > 0 && (
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

            {/* Submission Area - Show if submitted but allow adding more files */}
            {(assignment.status === 'submitted' || assignment.status === 'pending' || isOverdue) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {assignment.status === 'submitted' ? 'Add More Files' : 'Submit Your Work'}
                    {assignment.status === 'submitted' && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        Already Submitted
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Submission Notes</label>
                    <Textarea
                      placeholder="Describe your submission, any challenges you faced, or additional notes for the instructor..."
                      value={submissionText}
                      onChange={(e) => setSubmissionText(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Upload Files</label>
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Drag and drop your files here, or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Supports: .py, .js, .ts, .java, .cpp, .pdf, .zip, .md, .txt (Max: 50MB per file)
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".py,.js,.ts,.java,.cpp,.c,.pdf,.zip,.rar,.7z,.md,.txt,.doc,.docx"
                      />
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Choose Files
                      </Button>
                    </div>

                    {/* Uploaded Files List */}
                    {uploadedFiles.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <h4 className="text-sm font-medium">New Files to Add ({uploadedFiles.length})</h4>
                        {uploadedFiles.map((uploadedFile) => (
                          <div key={uploadedFile.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3 flex-1">
                              {getFileIcon(uploadedFile.file.name)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{uploadedFile.file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(uploadedFile.file.size)}
                                  {uploadedFile.status === 'uploading' && ` • Uploading... ${Math.round(uploadedFile.uploadProgress)}%`}
                                  {uploadedFile.status === 'completed' && ' • Ready to submit'}
                                </p>
                                {uploadedFile.status === 'uploading' && (
                                  <Progress 
                                    value={uploadedFile.uploadProgress} 
                                    className="h-1 mt-1"
                                  />
                                )}
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeFile(uploadedFile.id)}
                              disabled={uploadedFile.status === 'uploading'}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={handleSubmit} 
                    className="w-full" 
                    size="lg"
                    disabled={isSubmitting || uploadedFiles.length === 0 || uploadedFiles.some(f => f.status === 'uploading')}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {assignment.status === 'submitted' ? 'Adding Files...' : 'Submitting...'}
                      </>
                    ) : (
                      assignment.status === 'submitted' ? 'Add More Files' : 'Submit Assignment'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Submission Details - Show if submitted */}
            {assignment.status === 'submitted' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Your Submission</span>
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                      {assignment.submission.files.length} file(s) submitted
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Submission Notes</label>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm">{assignment.submission.notes || "No submission notes provided."}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Submitted Files</label>
                      <div className="space-y-2">
                        {assignment.submission.files.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                {getFileIcon(file.name)}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-sm">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {file.size} • Submitted {formatDateTime(file.uploadedAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => downloadFile(file)}
                                title="Download file"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => deleteSubmittedFile(file.id)}
                                title="Delete file"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {assignment.submission.files.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No files submitted yet.
                          </p>
                        )}
                      </div>
                    </div>

                    {assignment.submittedDate && (
                      <div className="text-sm text-muted-foreground">
                        Submitted on {formatDateTime(assignment.submittedDate)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Questions Section */}
            <Card id="questions-section">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Ask a Question</span>
                  {questions.length > 0 && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {questions.length} question(s)
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Textarea
                    placeholder="Type your question here... (e.g., 'I need help with the linked list implementation', 'Can you clarify the requirements for the hash table?')"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    rows={3}
                  />
                  <Button 
                    onClick={handleAskQuestion}
                    disabled={isAskingQuestion || !newQuestion.trim()}
                    className="w-full"
                  >
                    {isAskingQuestion ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Posting Question...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Post Question
                      </>
                    )}
                  </Button>
                </div>

                {/* Questions List */}
                {questions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Your Questions</h4>
                    {questions.map((question) => (
                      <div key={question.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium mb-2">{question.text}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Asked {formatDateTime(question.createdAt)}</span>
                              <Badge 
                                variant={question.status === 'answered' ? 'default' : 'outline'}
                                className={question.status === 'answered' ? 'bg-green-100 text-green-800' : ''}
                              >
                                {question.status === 'answered' ? 'Answered' : 'Pending'}
                              </Badge>
                            </div>
                            {question.answer && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <Users className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-sm font-medium text-blue-900 mb-1">Instructor Response</p>
                                    <p className="text-sm text-blue-800">{question.answer}</p>
                                    {question.answeredAt && (
                                      <p className="text-xs text-blue-600 mt-1">
                                        Answered {formatDateTime(question.answeredAt)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteQuestion(question.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete question"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    document.getElementById('questions-section')?.scrollIntoView({ behavior: 'smooth' });
                    setTimeout(() => {
                      document.querySelector('textarea')?.focus();
                    }, 500);
                  }}
                >
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
                  {assignment.status === 'graded' && assignment.gradedDate && (
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