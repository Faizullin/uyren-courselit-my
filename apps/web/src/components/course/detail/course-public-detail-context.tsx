"use client";

import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
import { createContext, ReactNode, useContext, useState } from "react";


type SerializedCourse = GeneralRouterOutputs["lmsModule"]["courseModule"]["course"]["publicGetByIdDetailed"];

const useLoadCoursePublicDetailedQuery = ({
    courseId,
  }: {
    courseId: string;
  }) => {
    return trpc.lmsModule.courseModule.course.publicGetByIdDetailed.useQuery(
        { id: courseId },
        { enabled: !!courseId }
    );
  }

type CoursePublicDetailContextType = { 
    isLoading: boolean
    setIsLoading: (loading: boolean) => void;
    loadCoursePublicDetailedQuery: ReturnType<typeof useLoadCoursePublicDetailedQuery>;
    initialCourse: SerializedCourse;
}
const CoursePublicDetailContext = createContext<CoursePublicDetailContextType | undefined>(undefined)

export function CoursePublicDetailProvider({ children, initialCourse }: {
    children: ReactNode;
    initialCourse: SerializedCourse;
}) {
    const [isLoading, setIsLoading] = useState(false);
    const loadCoursePublicDetailedQuery = useLoadCoursePublicDetailedQuery({ courseId: initialCourse._id })

    return (
        <CoursePublicDetailContext.Provider value={{ 
            isLoading,
            setIsLoading,
            loadCoursePublicDetailedQuery,
            initialCourse,
        }}>
            {children}
        </CoursePublicDetailContext.Provider>
    );
}

export function useCoursePublicDetail() {
    const context = useContext(CoursePublicDetailContext);
    if (!context) {
        throw new Error("useCoursePublicDetail must be used within a CoursePublicDetailProvider");
    }
    return context;
}