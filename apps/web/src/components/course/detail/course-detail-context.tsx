"use client"

import { GeneralRouterOutputs } from "@/server/api/types"
import { trpc } from "@/utils/trpc"
import { useParams } from "next/navigation"
import { createContext, useContext, useState, type ReactNode } from "react"

type SerializedCourse = GeneralRouterOutputs["lmsModule"]["courseModule"]["course"]["getById"];

const useLoadCourseDetailQuery = ({
  courseId,
}: {
  courseId: string;
}) => {
  return trpc.lmsModule.courseModule.course.getById.useQuery({
    id: courseId,
  });
}

const useLoadLessonDetailQuery = ({
  lessonId,
}: {
  lessonId?: string;
}) => {
  return trpc.lmsModule.courseModule.lesson.getById.useQuery({
    id: lessonId!,
  }, {
    enabled: !!lessonId,
  });
}

type CourseDetailContextType = {
  isLoading: boolean
  setIsLoading: (loading: boolean) => void;
  loadCourseDetailQuery: ReturnType<typeof useLoadCourseDetailQuery>;
  loadLessonDetailQuery: ReturnType<typeof useLoadLessonDetailQuery>;
  initialCourse: SerializedCourse;
  currentLessonId?: string;
}

const CourseDetailContext = createContext<CourseDetailContextType | undefined>(undefined)

export function CourseDetailProvider({
  children,
  initialCourse,
}: { 
  children: ReactNode; 
  initialCourse: SerializedCourse;
 }) {
  const [isLoading, setIsLoading] = useState(false);
  const params = useParams<{ id: string; lessonId: string }>();
  const loadCourseDetailQuery = useLoadCourseDetailQuery({ courseId: initialCourse._id })
  const loadLessonDetailQuery = useLoadLessonDetailQuery({ lessonId: params.lessonId });

  return (
    <CourseDetailContext.Provider
      value={{
          isLoading,
          setIsLoading,
          loadCourseDetailQuery,
          loadLessonDetailQuery,
          initialCourse,
          currentLessonId: params.lessonId,
      }}
    >
      {children}
    </CourseDetailContext.Provider>
  )
}

export function useCourseDetail() {
  const context = useContext(CourseDetailContext)
  if (context === undefined) {
    throw new Error("useCourseDetail must be used within a CourseDetailProvider")
  }
  return context
}
