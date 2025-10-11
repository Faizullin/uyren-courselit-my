// app/dashboard/student/courses/[id]/lessons/[lessonId]/page.tsx
"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";
import { 
  ArrowLeft, 
  ArrowRight, 
  PlayCircle, 
  Video, 
  FileText, 
  Code, 
  Download, 
  CheckCircle, 
  Clock, 
  BookOpen,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Share
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useState } from "react";

export default function Page() {
  const { t } = useTranslation(["dashboard", "common"]);
  const params = useParams();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;

  // Dummy lesson data
  const lesson = {
    id: lessonId,
    title: "Python Functions - Parameters and Return Values",
    description: "Learn how to define functions with parameters and return values to create reusable code blocks in Python.",
    type: "video",
    duration: "25 minutes",
    completed: false,
    videoUrl: "https://example.com/video.mp4",
    resources: [
      { id: 1, name: "Function Cheat Sheet.pdf", type: "pdf", size: "2.4 MB" },
      { id: 2, name: "Practice Exercises.py", type: "code", size: "1.2 KB" },
      { id: 3, name: "Lesson Slides.pptx", type: "slides", size: "5.7 MB" }
    ],
    objectives: [
      "Understand function parameters and arguments",
      "Learn how to return values from functions",
      "Practice with multiple return values",
      "Master default parameter values"
    ],
    nextLesson: "15",
    prevLesson: "13"
  };

  // Dummy course data for context
  const course = {
    id: courseId,
    title: "Python Programming Fundamentals",
    progress: 65
  };

  const [isCompleted, setIsCompleted] = useState(lesson.completed);

  const breadcrumbs = [
    { label: t("common:dashboard.student.courses.title"), href: "/dashboard/student/courses" },
    { label: course.title, href: `/dashboard/student/courses/${courseId}` },
    { label: "Lesson " + lessonId, href: "#" }
  ];

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'code': return <Code className="h-4 w-4" />;
      case 'slides': return <BookOpen className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const markAsComplete = () => {
    setIsCompleted(true);
    // In real app, this would call an API to update progress
  };

  return (
    <DashboardContent breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        {/* Header with Navigation */}
        <div className="flex items-center justify-between">
          <Link href={`/dashboard/student/courses/${courseId}`}>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Course
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            {lesson.prevLesson && (
              <Link href={`/dashboard/student/courses/${courseId}/lessons/${lesson.prevLesson}`}>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>
              </Link>
            )}
            {lesson.nextLesson && (
              <Link href={`/dashboard/student/courses/${courseId}/lessons/${lesson.nextLesson}`}>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Lesson Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    {lesson.type}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {lesson.duration}
                  </Badge>
                  {isCompleted && (
                    <Badge variant="default" className="bg-green-100 text-green-800 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Completed
                    </Badge>
                  )}
                </div>
                
                <h1 className="text-3xl font-bold mb-4">{lesson.title}</h1>
                <p className="text-lg text-muted-foreground mb-6">{lesson.description}</p>

                {/* Learning Objectives */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">What you'll learn:</h3>
                  <ul className="space-y-2">
                    {lesson.objectives.map((objective, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  {!isCompleted ? (
                    <Button onClick={markAsComplete} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Mark as Complete
                    </Button>
                  ) : (
                    <Button variant="outline" className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Lesson Completed
                    </Button>
                  )}
                  <Button variant="outline" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Ask Question
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Share className="h-4 w-4" />
                    Share
                  </Button>
                </div>
              </div>

              {/* Video Player Placeholder */}
              <div className="lg:w-96">
                <div className="bg-black rounded-lg aspect-video flex items-center justify-center relative">
                  <div className="text-white text-center">
                    <PlayCircle className="h-16 w-16 mx-auto mb-2 opacity-80" />
                    <p className="text-sm">Video Player</p>
                    <p className="text-xs text-gray-400">Click to play lesson video</p>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <Progress value={45} className="h-1" />
                  </div>
                </div>
                
                {/* Video Controls */}
                <div className="flex justify-between items-center mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      <span>Helpful</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1">
                      <ThumbsDown className="h-4 w-4" />
                      <span>Need Improvement</span>
                    </Button>
                  </div>
                  <Button variant="outline" size="sm">
                    Download Video
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lesson Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Code Example */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Code Example
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <pre>{`# Function with parameters and return value
def calculate_area(length, width):
    """Calculate the area of a rectangle"""
    area = length * width
    return area

# Using the function
result = calculate_area(5, 3)
print(f"The area is: {result}")  # Output: The area is: 15

# Function with default parameters
def greet(name, greeting="Hello"):
    """Greet someone with a custom message"""
    return f"{greeting}, {name}!"

print(greet("Alice"))           # Output: Hello, Alice!
print(greet("Bob", "Hi"))       # Output: Hi, Bob!`}</pre>
                </div>
              </CardContent>
            </Card>

            {/* Lesson Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Lesson Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <p>
                    <strong>Key Points:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Parameters are defined in the function definition</li>
                    <li>Arguments are passed when calling the function</li>
                    <li>The <code>return</code> statement sends data back to the caller</li>
                    <li>Functions can return multiple values as a tuple</li>
                    <li>Default parameters provide fallback values</li>
                  </ul>
                  
                  <p>
                    <strong>Best Practices:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Use descriptive parameter names</li>
                    <li>Keep functions focused on a single task</li>
                    <li>Document your functions with docstrings</li>
                    <li>Use type hints for better code clarity</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Quick Exercise */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Exercise</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Create a function called <code>is_even</code> that takes a number as a parameter 
                    and returns <code>True</code> if the number is even, <code>False</code> otherwise.
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm">{`# Your code here
def is_even(number):
    # Complete this function
    pass

# Test your function
print(is_even(4))   # Should print: True
print(is_even(7))   # Should print: False`}</pre>
                  </div>
                  <Button variant="outline" size="sm">
                    Show Solution
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Resources */}
            <Card>
              <CardHeader>
                <CardTitle>Lesson Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lesson.resources.map((resource) => (
                    <div key={resource.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                          {getResourceIcon(resource.type)}
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

            {/* Course Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Course Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Overall Progress</span>
                      <span className="font-semibold">{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} className="h-2" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Completed: 14/24 lessons</p>
                    <p>Estimated time remaining: 8 hours</p>
                  </div>
                  <Link href={`/dashboard/student/courses/${courseId}`}>
                    <Button variant="outline" className="w-full">
                      View All Lessons
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Next Up */}
            <Card>
              <CardHeader>
                <CardTitle>Next Lesson</CardTitle>
              </CardHeader>
              <CardContent>
                {lesson.nextLesson ? (
                  <Link href={`/dashboard/student/courses/${courseId}/lessons/${lesson.nextLesson}`}>
                    <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                          <Video className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Lambda Functions</p>
                          <p className="text-xs text-muted-foreground">15 minutes</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="text-center p-4 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Congratulations! You've completed the course.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardContent>
  );
}