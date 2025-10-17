"use client";

import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { trpc } from "@/utils/trpc";
import { Button } from "@workspace/ui/components/button";
import {
  Eye
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCourseContext } from "../_components/course-context";

export default function ContentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const courseId = params.id;
  const { course } = useCourseContext();

  const loadStatsQuery = trpc.lmsModule.courseModule.course.getStats.useQuery({
    id: courseId,
  }, {
    enabled: !!courseId,
  });

  const stats = loadStatsQuery.data;

  return (
    <>
      <HeaderTopbar
        header={{ title: "Content" }}
        rightAction={
            <Button variant="outline" onClick={() => router.push(`/dashboard/lms/courses/${courseId}`)}>
              <Eye className="mr-2 h-4 w-4" />
              Preview Course
            </Button>
        }
        backLink={true}
        className="mb-6"
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 border rounded-lg bg-card">
          <div className="text-sm text-muted-foreground mb-1">Total Chapters</div>
          <div className="text-2xl font-bold">{course?.chapters?.length || 0}</div>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <div className="text-sm text-muted-foreground mb-1">Total Lessons</div>
          <div className="text-2xl font-bold">{stats?.totalLessons || 0}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats?.publishedLessons || 0} published · {stats?.draftLessons || 0} draft
          </div>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <div className="text-sm text-muted-foreground mb-1">Total Duration</div>
          <div className="text-2xl font-bold">
            {stats?.totalDuration ? `${Math.floor(stats.totalDuration / 60)}h ${stats.totalDuration % 60}m` : '0h'}
          </div>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <div className="text-sm text-muted-foreground mb-1">Completion</div>
          <div className="text-2xl font-bold">{stats?.completionRate || 0}%</div>
        </div>
      </div>
    </>
  );
}