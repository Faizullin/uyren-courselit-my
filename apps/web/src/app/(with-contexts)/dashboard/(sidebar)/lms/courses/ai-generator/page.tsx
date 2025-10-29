"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import { CourseGeneratorChatMessage } from "@/lib/ai/course-generator/types";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Progress } from "@workspace/ui/components/progress";
import { Badge } from "@workspace/ui/components/badge";
import { Switch } from "@workspace/ui/components/switch";
import { ArrowLeft, ArrowRight, Check, CheckCircle, GripVertical, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useCallback, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { DataUIPart } from "ai";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CourseLevelEnum } from "@workspace/common-logic/models/lms/course.types";

type Lesson = {
  title: string;
  description?: string;
  order: number;
  tempId: string;
};

type Chapter = {
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
  tempId: string;
};

type CourseStructure = {
  title: string;
  description: string;
  shortDescription: string;
  level: CourseLevelEnum;
  durationInWeeks: number;
  chapters: Chapter[];
};

enum GenerationStep {
  INPUT = 1,
  STRUCTURE = 2,
  APPROVE = 3,
  CONTENT = 4,
  COMPLETE = 5,
}

export default function AICourseGeneratorPage() {
  const { t } = useTranslation(["dashboard", "common"]);
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<GenerationStep>(GenerationStep.INPUT);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [progressStep, setProgressStep] = useState("");
  const [structure, setStructure] = useState<CourseStructure | null>(null);
  const [editingStructure, setEditingStructure] = useState<CourseStructure | null>(null);
  const [generatedCourseId, setGeneratedCourseId] = useState<string | null>(null);
  const [contentMetrics, setContentMetrics] = useState<any>(null);
  
  const [useWebSearch, setUseWebSearch] = useState(true);
  const [includeObjectives, setIncludeObjectives] = useState(true);
  const [additionalPrompt, setAdditionalPrompt] = useState("");

  const currentStepDataRef = useRef<{
    step: string;
    data: any;
  }>({ step: "", data: {} });

  const breadcrumbs = [
    { label: t("dashboard:lms.courses.breadcrumb"), href: "/dashboard/lms/courses" },
    { label: "AI Course Generator", href: "#" },
  ];

  const { messages, sendMessage, status } = useChat<CourseGeneratorChatMessage>({
    id: "course-generator",
    transport: new DefaultChatTransport({
      api: "/api/services/ai/chat/course/generator",
      prepareSendMessagesRequest(request) {
        return {
          body: {
            step: currentStepDataRef.current.step,
            ...currentStepDataRef.current.data,
          },
        };
      },
    }),
    onData: (dataPart) => {
      if (dataPart.type === "data-error") {
        toast.error(dataPart.data.data.error);
      } else if (dataPart.type === "data-progress") {
        setProgressStep(dataPart.data.data.step);
        setProgress(dataPart.data.data.progress);
        setProgressLabel(dataPart.data.data.label);
      } else if (dataPart.type === "data-structure-progress") {
        setStructure(dataPart.data.data.structure);
      } else if (dataPart.type === "data-structure-complete") {
        setStructure(dataPart.data.data.structure);
        setEditingStructure(JSON.parse(JSON.stringify(dataPart.data.data.structure)));
        setProgressStep(dataPart.data.data.step);
        setProgress(dataPart.data.data.progress);
        setProgressLabel(dataPart.data.data.label);
        setCurrentStep(GenerationStep.APPROVE);
        toast.success("Course structure generated successfully!");
      } else if (dataPart.type === "data-course-created") {
        setGeneratedCourseId(dataPart.data.data.courseId);
        handleGenerateContent(dataPart.data.data.courseId, dataPart.data.data.structure);
      } else if (dataPart.type === "data-complete") {
        setProgressStep(dataPart.data.data.step);
        setProgress(dataPart.data.data.progress);
        setProgressLabel(dataPart.data.data.label);
        setContentMetrics(dataPart.data.data.metrics);
        setCurrentStep(GenerationStep.COMPLETE);
        toast.success(`Course generated successfully! Created ${dataPart.data.data.metrics.succeeded} lessons.`);
      }
    },
    onError: (error: Error) => {
      console.error("[GENERATOR] Error:", error);
      toast.error(error.message || "An error occurred");
    },
  });

  const handleGenerateStructure = useCallback(() => {
    if (!title.trim() || !description.trim()) {
      toast.error("Please provide both title and description");
      return;
    }

    setProgress(0);
    setProgressLabel("");
    setProgressStep("");

    currentStepDataRef.current = {
      step: "generate_structure",
      data: { title, description, useWebSearch, includeObjectives, additionalPrompt },
    };

    sendMessage({
      role: "user",
      parts: [{ type: "text", text: `Generate course structure for: ${title}` }],
    });
  }, [title, description, useWebSearch, includeObjectives, additionalPrompt, sendMessage]);

  const handleApproveStructure = useCallback(() => {
    if (!editingStructure) return;

    setProgress(0);
    setCurrentStep(GenerationStep.CONTENT);

    currentStepDataRef.current = {
      step: "approve_structure",
      data: { structure: editingStructure },
    };

    sendMessage({
      role: "user",
      parts: [{ type: "text", text: "Approve and create course structure" }],
    });
  }, [editingStructure, sendMessage]);

  const handleGenerateContent = useCallback((courseId: string, passedStructure?: CourseStructure) => {
    const structure = passedStructure || editingStructure;
    if (!structure) {
      toast.error("No structure available");
      return;
    }

    currentStepDataRef.current = {
      step: "generate_content",
      data: { courseId, structure, useWebSearch, additionalPrompt },
    };

    sendMessage({
      role: "user",
      parts: [{ type: "text", text: `Generate content for course ${courseId}` }],
    });
  }, [useWebSearch, additionalPrompt, editingStructure, sendMessage]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleChapterReorder = (event: DragEndEvent) => {
    if (!editingStructure) return;
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const items = Array.from(editingStructure.chapters);
      const oldIndex = items.findIndex((ch) => (ch.tempId || ch.order.toString()) === active.id);
      const newIndex = items.findIndex((ch) => (ch.tempId || ch.order.toString()) === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        reorderedItems.forEach((item, index) => {
          item.order = index;
        });
        setEditingStructure({ ...editingStructure, chapters: reorderedItems });
      }
    }
  };

  const handleLessonReorder = useCallback((chapterIndex: number, event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setEditingStructure(prev => {
        if (!prev) return prev;
        const chapters = [...prev.chapters];
        const chapter = chapters[chapterIndex];
        if (!chapter) return prev;
        
        const lessons = Array.from(chapter.lessons);
        const oldIndex = lessons.findIndex((l) => (l.tempId || l.order.toString()) === active.id);
        const newIndex = lessons.findIndex((l) => (l.tempId || l.order.toString()) === over.id);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const reorderedLessons = arrayMove(lessons, oldIndex, newIndex);
          reorderedLessons.forEach((lesson, index) => {
            lesson.order = index;
          });
          chapter.lessons = reorderedLessons;
        }
        return { ...prev, chapters };
      });
    }
  }, []);

  const handleDeleteChapter = useCallback((chapterIndex: number) => {
    setEditingStructure(prev => {
      if (!prev) return prev;
      const chapters = prev.chapters.filter((_, i) => i !== chapterIndex);
      chapters.forEach((ch, i) => ch.order = i);
      return { ...prev, chapters };
    });
  }, []);

  const handleDeleteLesson = useCallback((chapterIndex: number, lessonIndex: number) => {
    setEditingStructure(prev => {
      if (!prev) return prev;
      const chapters = [...prev.chapters];
      const chapter = chapters[chapterIndex];
      if (!chapter) return prev;
      chapter.lessons = chapter.lessons.filter((_, i) => i !== lessonIndex);
      chapter.lessons.forEach((l, i) => l.order = i);
      return { ...prev, chapters };
    });
  }, []);

  const handleAddChapter = useCallback(() => {
    setEditingStructure(prev => {
      if (!prev) return prev;
      const newChapter: Chapter = {
        title: `New Chapter ${prev.chapters.length + 1}`,
        description: "",
        order: prev.chapters.length,
        lessons: [],
        tempId: `temp-chapter-${Date.now()}`,
      };
      return { ...prev, chapters: [...prev.chapters, newChapter] };
    });
  }, []);

  const handleAddLesson = useCallback((chapterIndex: number) => {
    setEditingStructure(prev => {
      if (!prev) return prev;
      const chapters = [...prev.chapters];
      const chapter = chapters[chapterIndex];
      if (!chapter) return prev;
      const newLesson: Lesson = {
        title: `New Lesson ${chapter.lessons.length + 1}`,
        description: "",
        order: chapter.lessons.length,
        tempId: `temp-lesson-${Date.now()}`,
      };
      chapter.lessons.push(newLesson);
      return { ...prev, chapters };
    });
  }, []);

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8 space-x-2">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              currentStep >= step
                ? "bg-brand-primary border-brand-primary text-white"
                : "border-muted-foreground text-muted-foreground"
            }`}
          >
            {currentStep > step ? <Check className="h-5 w-5" /> : step}
          </div>
          {step < 4 && (
            <div
              className={`w-16 h-1 ${
                currentStep > step ? "bg-brand-primary" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderInputStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-primary" />
          Step 1: Describe Your Course
        </CardTitle>
        <CardDescription>
          Provide a title and description, and our AI will generate a complete course structure
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Course Title</Label>
            <Input
              id="title"
              placeholder="e.g., Introduction to Machine Learning"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={status === "streaming"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Course Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what the course will cover, who it's for, and what students will learn..."
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={status === "streaming"}
            />
          </div>
        </div>

        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">AI Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="web-search" className="text-sm font-normal">Web Search</Label>
              <Switch
                id="web-search"
                checked={useWebSearch}
                onCheckedChange={setUseWebSearch}
                disabled={status === "streaming"}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="objectives" className="text-sm font-normal">Learning Objectives</Label>
              <Switch
                id="objectives"
                checked={includeObjectives}
                onCheckedChange={setIncludeObjectives}
                disabled={status === "streaming"}
              />
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="additional-prompt" className="text-sm">Additional Instructions (Optional)</Label>
              <Textarea
                id="additional-prompt"
                placeholder="e.g., Focus on practical examples, include case studies..."
                rows={3}
                value={additionalPrompt}
                onChange={(e) => setAdditionalPrompt(e.target.value)}
                disabled={status === "streaming"}
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {status === "streaming" && (
          <div className="mt-6 p-4 rounded-lg border bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
                <span className="font-medium">{progressLabel}</span>
              </div>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground">{progressStep}</p>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button
            onClick={handleGenerateStructure}
            disabled={status === "streaming" || !title.trim() || !description.trim()}
          >
            {status === "streaming" ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Course Structure
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const SortableChapter = useCallback(({ chapter, chapterIndex }: { chapter: Chapter; chapterIndex: number }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
      id: chapter.tempId || `chapter-${chapterIndex}`,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditingStructure(prev => {
        if (!prev) return prev;
        const chapters = [...prev.chapters];
        const ch = chapters[chapterIndex];
        if (ch) ch.title = e.target.value;
        return { ...prev, chapters };
      });
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setEditingStructure(prev => {
        if (!prev) return prev;
        const chapters = [...prev.chapters];
        const ch = chapters[chapterIndex];
        if (ch) ch.description = e.target.value;
        return { ...prev, chapters };
      });
    };

    return (
      <div ref={setNodeRef} style={style} className="border rounded-lg p-4 bg-card space-y-3">
        <div className="flex items-start gap-3">
          <div {...listeners} {...attributes} className="mt-2 cursor-grab active:cursor-grabbing">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-2">
            <Input
              value={chapter.title}
              onChange={handleTitleChange}
              placeholder="Chapter title"
            />
            <Textarea
              value={chapter.description || ""}
              onChange={handleDescriptionChange}
              placeholder="Chapter description"
              rows={2}
            />
          </div>
          <Button variant="ghost" size="icon" onClick={() => handleDeleteChapter(chapterIndex)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        <div className="ml-8 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Lessons</Label>
            <Button size="sm" variant="outline" onClick={() => handleAddLesson(chapterIndex)}>
              <Plus className="h-3 w-3 mr-1" />
              Add Lesson
            </Button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleLessonReorder(chapterIndex, e)}>
            <SortableContext items={chapter.lessons.map((l) => l.tempId || `lesson-${chapterIndex}-${l.order}`)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {chapter.lessons.map((lesson, lessonIndex) => (
                  <SortableLesson key={lesson.tempId || `lesson-${chapterIndex}-${lessonIndex}`} lesson={lesson} chapterIndex={chapterIndex} lessonIndex={lessonIndex} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    );
  }, [sensors, handleAddLesson, handleDeleteChapter, handleLessonReorder]);

  const SortableLesson = useCallback(({ lesson, chapterIndex, lessonIndex }: { lesson: Lesson; chapterIndex: number; lessonIndex: number }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
      id: lesson.tempId || `lesson-${chapterIndex}-${lessonIndex}`,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditingStructure(prev => {
        if (!prev) return prev;
        const chapters = [...prev.chapters];
        const chapter = chapters[chapterIndex];
        const lesson = chapter?.lessons[lessonIndex];
        if (lesson) {
          lesson.title = e.target.value;
        }
        return { ...prev, chapters };
      });
    };

    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 bg-muted/50 rounded border">
        <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input
          value={lesson.title}
          onChange={handleTitleChange}
          placeholder="Lesson title"
          className="flex-1 h-8"
        />
        <Button variant="ghost" size="icon" onClick={() => handleDeleteLesson(chapterIndex, lessonIndex)} className="h-8 w-8">
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }, [handleDeleteLesson]);

  const renderApprovalStep = () => {
    if (!editingStructure) return null;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Review & Edit Course Structure</CardTitle>
            <CardDescription>
              Review the generated structure. You can edit, reorder, add, or remove chapters and lessons.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Course Title</Label>
                <Input
                  value={editingStructure.title}
                  onChange={(e) => setEditingStructure({ ...editingStructure, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Short Description</Label>
                <Input
                  value={editingStructure.shortDescription}
                  onChange={(e) => setEditingStructure({ ...editingStructure, shortDescription: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Level</Label>
                  <Badge variant="outline">{editingStructure.level}</Badge>
                </div>
                <div className="space-y-2">
                  <Label>Duration (weeks)</Label>
                  <Input
                    type="number"
                    value={editingStructure.durationInWeeks}
                    onChange={(e) => setEditingStructure({ ...editingStructure, durationInWeeks: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Chapters & Lessons</h3>
                <Button size="sm" onClick={handleAddChapter}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Chapter
                </Button>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleChapterReorder}>
                <SortableContext items={editingStructure.chapters.map((ch) => ch.tempId || `chapter-${ch.order}`)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {editingStructure.chapters.map((chapter, chapterIndex) => (
                      <SortableChapter key={chapter.tempId || `chapter-${chapterIndex}`} chapter={chapter} chapterIndex={chapterIndex} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setCurrentStep(GenerationStep.INPUT)} disabled={status === "streaming"}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleApproveStructure} disabled={status === "streaming"}>
                {status === "streaming" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Approve & Generate Content
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderContentGenerationStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Step 3: Generating Content</CardTitle>
        <CardDescription>
          AI is now creating detailed content for each lesson{useWebSearch ? ' with web-researched examples and current information' : ''}. This may take several minutes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                {progress === 100 ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
                )}
                <span className="font-medium">{progressLabel}</span>
              </div>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground">{progressStep}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderCompleteStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-6 w-6 text-green-500" />
          Course Generated Successfully!
        </CardTitle>
        <CardDescription>
          Your AI-generated course is ready{useWebSearch ? ' with web-researched, current content' : ''}. You can now review and publish it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {contentMetrics && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/20">
                <div className="text-sm text-muted-foreground mb-1">Lessons Created</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{contentMetrics.succeeded}</div>
              </div>
              <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
                <div className="text-sm text-muted-foreground mb-1">Duration</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{(contentMetrics.duration / 1000).toFixed(1)}s</div>
              </div>
              {contentMetrics.failed > 0 && (
                <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950/20">
                  <div className="text-sm text-muted-foreground mb-1">Failed</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{contentMetrics.failed}</div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex gap-4">
          <Button onClick={() => router.push(`/dashboard/lms/courses/${generatedCourseId}`)} className="flex-1">
            View Course
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()} className="flex-1">
            Generate Another Course
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardContent breadcrumbs={breadcrumbs}>
      <div className="max-w-4xl mx-auto space-y-6">
        {renderStepIndicator()}
        
        {currentStep === GenerationStep.INPUT && renderInputStep()}
        {currentStep === GenerationStep.APPROVE && renderApprovalStep()}
        {currentStep === GenerationStep.CONTENT && renderContentGenerationStep()}
        {currentStep === GenerationStep.COMPLETE && renderCompleteStep()}

        {messages.length > 0 && (
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Messages State</CardTitle>
              <CardDescription className="text-xs">Current chat messages and data parts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {messages.map((message, idx) => (
                  <div key={message.id} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={message.role === "user" ? "default" : "secondary"} className="text-xs">
                        {message.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Message {idx + 1}</span>
                    </div>
                    
                    {message.parts.map((part, partIdx) => (
                      <div key={partIdx} className="text-xs space-y-1">
                        <div className="font-mono text-muted-foreground">Type: {part.type}</div>
                        {part.type === "text" && (
                          <div className="text-sm">{part.text}</div>
                        )}
                        {part.type.startsWith("data-") && (
                          <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                            {JSON.stringify((part as any).data, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardContent>
  );
}

