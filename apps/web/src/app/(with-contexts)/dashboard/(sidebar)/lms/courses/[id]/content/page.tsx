"use client";

import { useCourseDetail } from "@/components/course/detail/course-detail-context";
import { ApiSyncCard } from "@/components/edu_ai/api-sync-card";
import { trpc } from "@/utils/trpc";

export default function Page() {
  const { initialCourse } = useCourseDetail();

  const loadStatsQuery = trpc.lmsModule.courseModule.course.getStats.useQuery({
    id: initialCourse._id,
  }, {
    enabled: !!initialCourse._id,
  });

  const stats = loadStatsQuery.data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
      <ApiSyncCard courseId={initialCourse._id} />
    </div>
  );
}