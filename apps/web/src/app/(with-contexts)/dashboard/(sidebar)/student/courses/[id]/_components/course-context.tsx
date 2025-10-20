"use client";

import React, { createContext, useContext } from "react";
import type { GeneralRouterOutputs } from "@/server/api/types";

type CourseData = GeneralRouterOutputs["lmsModule"]["courseModule"]["course"]["publicGetById"];
type EnrollmentData = GeneralRouterOutputs["lmsModule"]["enrollment"]["getMembership"]["enrollment"];

interface CourseContextValue {
  course: CourseData | null;
  enrollment: EnrollmentData | null;
  isLoading: boolean;
  refetch: () => void;
}

const CourseContext = createContext<CourseContextValue | undefined>(undefined);

export function CourseProvider({
  children,
  value,
}: {
  children: React.ReactNode;
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
