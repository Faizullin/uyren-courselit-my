"use client";

import { createContext, useContext, ReactNode } from "react";
import { SerializedCourse } from "./types";

interface CourseContextValue {
  course: SerializedCourse | null;
  isLoading: boolean;
  refetch: () => void;
}

const CourseContext = createContext<CourseContextValue | undefined>(undefined);

export function CourseProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: CourseContextValue;
}) {
  return (
    <CourseContext.Provider value={value}>
      {children}
    </CourseContext.Provider>
  );
}

export function useCourseContext() {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error("useCourseContext must be used within a CourseProvider");
  }
  return context;
}

