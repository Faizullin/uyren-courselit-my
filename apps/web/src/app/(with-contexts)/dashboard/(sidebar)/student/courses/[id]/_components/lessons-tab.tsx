"use client";

import { useCoursePublicDetail } from "@/components/course/detail/course-public-detail-context";
import { GeneralRouterOutputs } from "@/server/api/types";
import { LessonTypeEnum } from "@workspace/common-logic/models/lms/lesson.types";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { BookOpen, ChevronDown, File, FileText, HelpCircle, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type CourseType = GeneralRouterOutputs["lmsModule"]["courseModule"]["course"]["publicGetByIdDetailed"];
type ChapterType = CourseType["chapters"][number];
type ILessonItemType = GeneralRouterOutputs["lmsModule"]["courseModule"]["lesson"]["list"]["items"][number];

function SortableLesson({
  lesson,
  chapterId,
  courseId,
}: {
  lesson: ILessonItemType;
  chapterId: string;
  courseId: string;
}) {
  const router = useRouter();
  const href = `/dashboard/student/courses/${courseId}/lessons/${lesson._id}`;

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
      className={cn(
        "group/lesson flex items-center gap-3 w-full py-2 px-3 rounded-md text-sm transition-colors cursor-pointer hover:bg-accent/50 text-muted-foreground"
      )}
      onClick={() => router.push(href)}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <LessonIcon className="h-4 w-4 shrink-0" />
        <span className="truncate">{lesson.title}</span>
      </div>  
    </div>
  );
}

function SortableChapter({ 
  chapter, 
  lessons, 
  courseId, 
  isExpanded, 
  onToggle
}: {
    chapter: ChapterType;
    lessons: ILessonItemType[];
    courseId: string;
    isExpanded: boolean;
    onToggle: (chapter: ChapterType) => void;
  }) {
    return (
      <div className="group/chapter">
        <div className="flex items-center justify-between w-full py-2 px-3 hover:bg-accent/50 rounded-md transition-colors group">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-foreground truncate">{chapter.title}</span>
          </div>
          
          <div className="flex items-center gap-1">              
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0"
              onClick={() => onToggle(chapter)}
            >
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
            </Button>
          </div>
        </div>
  
        {isExpanded && (
          <div className="mt-1 space-y-1 pl-3">
            {lessons.length > 0 ? 
                lessons.map((lesson) => (
                  <SortableLesson 
                    key={lesson._id} 
                    lesson={lesson} 
                    chapterId={chapter._id} 
                    courseId={courseId}
                  />
                )) : (
                  <div className="text-xs text-muted-foreground px-3 py-2">No lessons</div>
                )
              }
          </div>
        )}
      </div>
    );
  }

export function LessonsTab() {
  const { t } = useTranslation(["dashboard"]);
  const { initialCourse, loadCoursePublicDetailedQuery } = useCoursePublicDetail();
  const [expandedChapters, setExpandedChapters] = useState(new Set());

  const currentChapters = loadCoursePublicDetailedQuery.data?.chapters || [];

  const handleToggleChapter = useCallback((chapter: ChapterType) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapter._id)) {
        next.delete(chapter._id);
      } else {
        next.add(chapter._id);
      }
      return next;
    });
  }, []);

  const sortedChapters = useMemo(() => {
    if (!currentChapters) return [];
    return [...currentChapters].sort((a, b) => a.order - b.order);
  }, [currentChapters]);

  useEffect(() => {
    if (currentChapters) {
      setExpandedChapters(new Set(currentChapters.map((chapter) => chapter._id)));
    }
  }, [currentChapters]);

  return (
    <div className="space-y-1">
      {sortedChapters.map((chapter) => (
        <SortableChapter
          key={chapter._id}
          chapter={chapter}
          lessons={chapter.lessons as ILessonItemType[]}
          courseId={initialCourse._id}
          isExpanded={expandedChapters.has(chapter._id)}
          onToggle={handleToggleChapter}
        />
      ))}
      {sortedChapters.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          {t("dashboard:student.no_lessons")}
        </div>
      )}
    </div>
  );
}

