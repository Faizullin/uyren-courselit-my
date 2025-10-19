"use client";

import { trpc } from "@/utils/trpc";
import { useParams, usePathname } from "next/navigation";
import CourseLessonsSidebar from "../../_components/course-lessons-sidebar";
import CourseEnrollmentCard from "./course-enrollment-card";

interface CourseLayoutContentProps {
  courseData: {
    _id: string;
    title: string;
  };
  showEnrollmentCard?: boolean;
}

export default function CourseLayoutContent({ 
  courseData, 
  showEnrollmentCard = true 
}: CourseLayoutContentProps) {
  const params = useParams();
  const pathname = usePathname();
  const loadCourseDetailedQuery = trpc.lmsModule.courseModule.course.publicGetByIdDetailed.useQuery(
    {
      id: courseData._id,
    },
    {
      enabled: !!courseData._id,
    },
  );

  const isLessonPage = pathname.includes('/lessons/');

  return (
    <div className="space-y-6 m--course-sidebar">
      {/* Enrollment Card - shown on course overview page, hidden on mobile (shown inline) */}
      {showEnrollmentCard && !isLessonPage && loadCourseDetailedQuery.data && (
        <div className="hidden md:block">
          <CourseEnrollmentCard 
            course={loadCourseDetailedQuery.data}
          />
        </div>
      )}

      {/* Course Lessons Sidebar - always shown */}
      <CourseLessonsSidebar courseId={courseData._id} />
    </div>
  );
} 