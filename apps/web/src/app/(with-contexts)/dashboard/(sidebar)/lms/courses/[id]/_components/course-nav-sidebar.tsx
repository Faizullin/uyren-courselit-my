"use client";

import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { LessonTypeEnum } from "@workspace/common-logic/models/lms/lesson.types";
import {
  DeleteConfirmNiceDialog,
  FormDialog,
  IUseDialogControl,
  NiceModal,
  useDialogControl,
  useToast,
} from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { BookOpen, ChevronDown, ChevronRight, Edit, File, FileText, GripVertical, HelpCircle, Plus, Trash2, Video } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { SerializedChapter, SerializedCourse } from "./types";
import { useCourseContext } from "./course-context";

type CourseType = SerializedCourse;
type ChapterType = SerializedChapter;
type ILessonItemType = GeneralRouterOutputs["lmsModule"]["courseModule"]["lesson"]["list"]["items"][number];

const ChapterSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
});
type ChapterFormData = z.infer<typeof ChapterSchema>;

const LessonCreateSchema = z.object({
  title: z.string().min(1).max(255),
  type: z.nativeEnum(LessonTypeEnum),
});
type LessonCreateFormData = z.infer<typeof LessonCreateSchema>;



function SortableLesson({
  lesson,
  chapterId,
  courseId,
  onDelete,
}: {
  lesson: ILessonItemType;
  chapterId: string;
  courseId: string;
  onDelete: (lessonId: string, lessonTitle: string) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const href = `/dashboard/lms/courses/${courseId}/content/section/${chapterId}/lessons/${lesson._id}`;
  const isActive = pathname === `/dashboard/lms/courses/${courseId}/content/section/${chapterId}/lessons/${lesson._id}`;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: lesson._id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getLessonIcon = () => {
    switch (lesson.type) {
      case LessonTypeEnum.VIDEO:
        return Video;
      case LessonTypeEnum.QUIZ:
        return HelpCircle;
      case LessonTypeEnum.FILE:
        return File;
      case LessonTypeEnum.TEXT:
      default:
        return FileText;
    }
  };

  const LessonIcon = getLessonIcon();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
        isDragging && "opacity-50",
        isActive ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50",
      )}
    >
      <button
        type="button"
        className={cn(
          "cursor-grab active:cursor-grabbing touch-none transition-colors flex-shrink-0",
          isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <LessonIcon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-foreground" : "text-muted-foreground")} />
      <button type="button" onClick={() => router.push(href)} className="flex-1 min-w-0 truncate text-left">
        {lesson.title}
      </button>
      <button
        type="button"
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(lesson._id, lesson.title);
        }}
        title="Delete lesson"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function SortableChapter({
  chapter,
  lessons,
  courseId,
  isExpanded,
  onToggle,
  onEdit,
  onAddLesson,
  onReorderLessons,
  onDeleteChapter,
  onDeleteLesson,
}: {
  chapter: ChapterType;
  lessons: ILessonItemType[];
  courseId: string;
  isExpanded: boolean;
  onToggle: (chapterId: string) => void;
  onEdit: (chapter: ChapterType) => void;
  onAddLesson: (chapterId: string) => void;
  onReorderLessons: (chapterId: string, lessons: ILessonItemType[]) => void;
  onDeleteChapter: (chapterId: string, chapterTitle: string) => void;
  onDeleteLesson: (lessonId: string, lessonTitle: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: chapter._id 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = lessons.findIndex((l) => l._id === active.id);
      const newIndex = lessons.findIndex((l) => l._id === over.id);
      const newLessons = arrayMove(lessons, oldIndex, newIndex);
      onReorderLessons(chapter._id, newLessons);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50")}>
      <div className="group/chapter flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent/50">
        <button
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground flex-shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 hover:bg-transparent flex-shrink-0"
          onClick={() => onToggle(chapter._id)}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
        <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="flex-1 min-w-0 truncate font-medium">{chapter.title}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 flex-shrink-0"
          onClick={() => onEdit(chapter)}
          title="Edit section"
        >
          <Edit className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 flex-shrink-0"
          onClick={() => onAddLesson(chapter._id)}
          title="Add lesson"
        >
          <Plus className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover/chapter:opacity-100 text-muted-foreground hover:text-destructive transition-opacity flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteChapter(chapter._id, chapter.title);
          }}
          title="Delete section"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {isExpanded && lessons.length > 0 && (
        <div className="ml-6 mt-1 space-y-1 border-l border-border pl-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={lessons.map((l) => l._id)} strategy={verticalListSortingStrategy}>
              {lessons.map((lesson) => (
                <SortableLesson 
                  key={lesson._id} 
                  lesson={lesson} 
                  chapterId={chapter._id} 
                  courseId={courseId}
                  onDelete={onDeleteLesson}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

export function CourseNavSidebar({ courseId, isOpen = true, onClose }: { courseId: string; isOpen?: boolean; onClose?: () => void }) {
  const { toast } = useToast();
  const trpcUtils = trpc.useUtils();
  const { course, isLoading: courseLoading } = useCourseContext();
  const loadLessonsQuery = trpc.lmsModule.courseModule.lesson.list.useQuery({ courseId: courseId }, { enabled: !!courseId });
  const pathname = usePathname();
  const chapterDialog = useDialogControl<{ args: { chapter?: ChapterType | null; course: CourseType } }>();
  const lessonDialog = useDialogControl<{ args: { chapterId: string; courseId: string } }>();
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [pendingChapterOrder, setPendingChapterOrder] = useState<string[] | null>(null);
  const [pendingLessonOrders, setPendingLessonOrders] = useState<Map<string, string[]>>(new Map());

  const lessons = useMemo(() => loadLessonsQuery.data?.items || [], [loadLessonsQuery.data?.items]);
  
  const hasChanges = pendingChapterOrder !== null || pendingLessonOrders.size > 0;

  const reorderStructureMutation = trpc.lmsModule.courseModule.course.reorderStructure.useMutation({
    onSuccess: () => {
      setPendingChapterOrder(null);
      setPendingLessonOrders(new Map());
      trpcUtils.lmsModule.courseModule.course.getById.invalidate({ id: courseId });
      trpcUtils.lmsModule.courseModule.lesson.list.invalidate({ courseId });
      toast({ title: "Success", description: "Order saved successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteChapterMutation = trpc.lmsModule.courseModule.course.removeCourseChapter.useMutation({
    onSuccess: () => {
      trpcUtils.lmsModule.courseModule.course.getById.invalidate({ id: courseId });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteLessonMutation = trpc.lmsModule.courseModule.lesson.delete.useMutation({
    onSuccess: () => {
      trpcUtils.lmsModule.courseModule.course.getById.invalidate({ id: courseId });
      trpcUtils.lmsModule.courseModule.lesson.list.invalidate({ courseId });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });


  useEffect(() => {
    if (course?.chapters) {
      const allChapterIds = new Set(course.chapters.map((ch) => ch._id));
      setExpandedChapters(allChapterIds);
    }
  }, [course?.chapters]);

  useEffect(() => {
    if (!reorderStructureMutation.isPending && course) {
      if (pendingChapterOrder) {
        const currentOrder = [...(course.chapters || [])].sort((a, b) => a.order - b.order).map(ch => ch._id);
        const pendingMatches = JSON.stringify(currentOrder) === JSON.stringify(pendingChapterOrder);
        if (pendingMatches) {
          setPendingChapterOrder(null);
        }
      }

      if (pendingLessonOrders.size > 0) {
        const updatedLessonOrders = new Map(pendingLessonOrders);
        let hasChanges = false;

        pendingLessonOrders.forEach((pendingLessons, chapterId) => {
          const chapter = course.chapters?.find(ch => ch._id === chapterId);
          if (chapter) {
            const currentLessonIds = chapter.lessonOrderIds || [];
            const pendingMatches = JSON.stringify(currentLessonIds) === JSON.stringify(pendingLessons);
            if (pendingMatches) {
              updatedLessonOrders.delete(chapterId);
              hasChanges = true;
            }
          }
        });

        if (hasChanges) {
          setPendingLessonOrders(updatedLessonOrders);
        }
      }
    }
  }, [course, reorderStructureMutation.isPending, pendingChapterOrder, pendingLessonOrders]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleToggleChapter = useCallback((chapterId: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  }, []);

  const handleReorderChapters = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!course?.chapters) return;

    if (over && active.id !== over.id) {
      const chapters = [...course.chapters].sort((a, b) => a.order - b.order);
      const oldIndex = chapters.findIndex((item) => item._id === active.id);
      const newIndex = chapters.findIndex((item) => item._id === over.id);
      const reorderedChapters = arrayMove(chapters, oldIndex, newIndex);
      setPendingChapterOrder(reorderedChapters.map(ch => ch._id));
    }
  }, [course?.chapters]);

  const handleReorderLessons = useCallback((chapterId: string, newLessons: ILessonItemType[]) => {
    const newLessonIds = newLessons.map(l => l._id);
    setPendingLessonOrders(prev => {
      const next = new Map(prev);
      next.set(chapterId, newLessonIds);
      return next;
    });
  }, []);

  const handleDeleteChapter = useCallback(async (chapterId: string, chapterTitle: string) => {
    const result = await NiceModal.show(DeleteConfirmNiceDialog, {
      title: "Delete Section",
      message: `Are you sure you want to delete "${chapterTitle}"? This will also delete all lessons in this section.`,
    });

    if (result) {
      deleteChapterMutation.mutate({
        courseId,
        chapterId,
      });
    }
  }, [courseId, deleteChapterMutation]);

  const handleDeleteLesson = useCallback(async (lessonId: string, lessonTitle: string) => {
    const result = await NiceModal.show(DeleteConfirmNiceDialog, {
      title: "Delete Lesson",
      message: `Are you sure you want to delete "${lessonTitle}"? This action cannot be undone.`,
    });

    if (result) {
      deleteLessonMutation.mutate({
        id: lessonId,
      });
    }
  }, [deleteLessonMutation]);

  const handleSaveOrder = useCallback(async () => {
    if (!course) return;
    
    try {
      const chapterOrder = pendingChapterOrder || 
        [...course.chapters].sort((a, b) => a.order - b.order).map(ch => ch._id);
      
      const chapters = chapterOrder.map((chapterId, index) => {
        const chapter = course.chapters.find(ch => ch._id === chapterId);
        const lessonOrderIds = pendingLessonOrders.get(chapterId) || chapter?.lessonOrderIds;
        
        return {
          chapterId,
          order: index,
          lessonOrderIds,
        };
      });

      await reorderStructureMutation.mutateAsync({
        courseId,
        chapters,
      });
    } catch (error) {
      console.error("Failed to save order:", error);
    }
  }, [
    pendingChapterOrder,
    pendingLessonOrders,
    course,
    courseId,
    reorderStructureMutation,
  ]);

  const getChapterLessons = useCallback((chapter: ChapterType): ILessonItemType[] => {
    const lessonOrderIds = pendingLessonOrders.get(chapter._id) || chapter.lessonOrderIds || [];
    const lessonMap = new Map(lessons.map(lesson => [lesson._id, lesson]));
    return lessonOrderIds
      .map(id => lessonMap.get(id))
      .filter((lesson): lesson is ILessonItemType => lesson !== undefined);
  }, [lessons, pendingLessonOrders]);

  const sortedChapters = useMemo(() => {
    if (!course?.chapters) return [];
    const chapters = [...course.chapters].sort((a, b) => a.order - b.order);
    if (pendingChapterOrder) {
      return pendingChapterOrder.map(id => chapters.find(ch => ch._id === id)).filter(Boolean) as ChapterType[];
    }
    return chapters;
  }, [course?.chapters, pendingChapterOrder]);

  const isOnCoursePage = pathname?.startsWith(`/dashboard/lms/courses/${courseId}`);

  if (courseLoading) {
    return (
      <aside className="w-full lg:w-80 xl:w-96 space-y-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </aside>
    );
  }

  if (!course) {
    return <aside className="w-full lg:w-80 xl:w-96 text-sm text-muted-foreground">No course found.</aside>;
  }

  return (
    <>
      {isOpen && onClose && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "w-full lg:w-80 xl:w-96 border-l bg-card",
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-border p-4">
            <Link
              href={`/dashboard/lms/courses/${courseId}`}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isOnCoursePage ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
              )}
            >
              <BookOpen className="h-5 w-5" />
              <span className="flex-1">Course Overview</span>
            </Link>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">COURSE STRUCTURE</h3>
                <div className="flex items-center gap-1">
                  {hasChanges && (
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="h-7 px-3 text-xs" 
                      onClick={handleSaveOrder}
                      disabled={reorderStructureMutation.isPending}
                      title="Save order changes"
                    >
                      {reorderStructureMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2" 
                    onClick={() => chapterDialog.show({ args: { chapter: null, course } })} 
                    title="Add section"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReorderChapters}>
                <SortableContext items={sortedChapters.map((c) => c._id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {sortedChapters.map((chapter) => (
                      <SortableChapter
                        key={chapter._id}
                        chapter={chapter}
                        lessons={getChapterLessons(chapter)}
                        courseId={courseId}
                        isExpanded={expandedChapters.has(chapter._id)}
                        onToggle={handleToggleChapter}
                        onEdit={(ch) => chapterDialog.show({ args: { chapter: ch, course } })}
                        onAddLesson={(chId) => lessonDialog.show({ args: { chapterId: chId, courseId } })}
                        onReorderLessons={handleReorderLessons}
                        onDeleteChapter={handleDeleteChapter}
                        onDeleteLesson={handleDeleteLesson}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </ScrollArea>
        </div>
      </aside>

      {/* Dialogs */}
      <ChapterDialog control={chapterDialog} />
      <LessonCreateDialog control={lessonDialog} />
    </>
  );
}

function ChapterDialog({
  control,
}: {
  control: IUseDialogControl<{ args: { chapter?: ChapterType | null; course: CourseType } }>;
}) {
  const { toast } = useToast();
  const trpcUtils = trpc.useUtils();

  const editingChapter = control.data?.args.chapter ?? null;
  const course = control.data?.args.course;

  const form = useForm<ChapterFormData>({
    resolver: zodResolver(ChapterSchema),
    defaultValues: {
      title: editingChapter?.title || "",
      description: editingChapter?.description || "",
    },
  });

  useEffect(() => {
    form.reset({
      title: editingChapter?.title || "",
      description: editingChapter?.description || "",
    });
  }, [editingChapter, form]);

  const createMutation = trpc.lmsModule.courseModule.course.addCourseChapter.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Chapter created" });
      trpcUtils.lmsModule.courseModule.course.getById.invalidate();
      control.hide();
    },
  });

  const updateMutation = trpc.lmsModule.courseModule.course.updateCourseChapter.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Chapter updated" });
      trpcUtils.lmsModule.courseModule.course.getById.invalidate();
      control.hide();
    },
  });

  const handleSubmit = useCallback(
    (data: ChapterFormData) => {
      if (!course) return;
      if (editingChapter) {
        updateMutation.mutate({
          courseId: course._id,
          chapterId: editingChapter._id,
          data,
        });
      } else {
        createMutation.mutate({ courseId: course._id, data });
      }
    },
    [course, editingChapter, createMutation, updateMutation]
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <FormDialog
      open={control.isVisible}
      onOpenChange={(open) => {
        if (!open) control.hide();
      }}
      title={editingChapter ? "Edit Section" : "New Section"}
      onSubmit={form.handleSubmit(handleSubmit)}
      onCancel={control.hide}
      isLoading={isSaving}
      submitText={editingChapter ? "Save" : "Create"}
      cancelText="Cancel"
    >
      <FieldGroup>
        <Controller
          control={form.control}
          name="title"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Section Title</FieldLabel>
              <Input {...field} placeholder="Enter section title" />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
    </FormDialog>
  );
}

function LessonCreateDialog({
  control,
}: {
  control: IUseDialogControl<{ args: { chapterId: string; courseId: string } }>;
}) {
  const { toast } = useToast();
  const trpcUtils = trpc.useUtils();

  const form = useForm<LessonCreateFormData>({
    resolver: zodResolver(LessonCreateSchema),
    defaultValues: { title: "", type: LessonTypeEnum.TEXT },
  });

  useEffect(() => {
    if (control.isVisible) {
      form.reset({ title: "", type: LessonTypeEnum.TEXT });
    }
  }, [control.isVisible, form]);

  const createLessonMutation = trpc.lmsModule.courseModule.lesson.create.useMutation({
    onSuccess: (created) => {
      trpcUtils.lmsModule.courseModule.course.getById.invalidate();
      trpcUtils.lmsModule.courseModule.lesson.list.invalidate();
      control.hide();
    },
  });

  const handleSubmit = useCallback(
    (data: LessonCreateFormData) => {
      const args = control.data?.args;
      if (!args) return;

      createLessonMutation.mutate({
        data: {
          courseId: args.courseId,
          chapterId: args.chapterId,
          title: data.title,
          type: data.type,
          content: { type: "doc", content: "", assets: [], widgets: [], config: { editorType: "tiptap" } },
          requiresEnrollment: true,
          downloadable: false,
        },
      });
    },
    [control.data?.args, createLessonMutation]
  );

  return (
    <FormDialog
      open={control.isVisible}
      onOpenChange={(open) => {
        if (!open) control.hide();
      }}
      title="New Lesson"
      onSubmit={form.handleSubmit(handleSubmit)}
      onCancel={control.hide}
      submitText="Create & Edit"
      cancelText="Cancel"
    >
      <FieldGroup>
        <Controller
          control={form.control}
          name="title"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Lesson Title</FieldLabel>
              <Input {...field} placeholder="Enter lesson title" />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
    </FormDialog>
  );
}