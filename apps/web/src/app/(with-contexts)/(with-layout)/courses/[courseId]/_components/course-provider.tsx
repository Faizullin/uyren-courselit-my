"use client";

import { createContext, ReactNode, useContext } from "react";

type CourseData = {
  _id: string;
  title: string;
  shortDescription?: string;
  statsAverageRating: number;
  statsEnrollmentCount: number;
  statsLessonCount: number;
  statsCompletionRate: number;
};

interface CourseContextType {
  courseData: CourseData;
}

const CourseContext = createContext<CourseContextType | null>(null);

interface CourseProviderProps {
  children: ReactNode;
  courseData: CourseData;
}

export function CourseProvider({ children, courseData }: CourseProviderProps) {
  return (
    <CourseContext.Provider value={{ courseData }}>
      {children}
    </CourseContext.Provider>
  );
}

export function useCourseData() {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error("useCourseData must be used within a CourseProvider");
  }
  return context.courseData;
}
