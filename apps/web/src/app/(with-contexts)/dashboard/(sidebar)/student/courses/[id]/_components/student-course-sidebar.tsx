"use client";

import { useCoursePublicDetail } from "@/components/course/detail/course-public-detail-context";
import { trpc } from "@/utils/trpc";
import { Progress } from "@workspace/ui/components/progress";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";
import { BookOpen, Bot, Users, Calendar } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LessonsTab } from "./lessons-tab";
import { AiTutorTab } from "./ai-tutor-tab";

export function StudentCourseSidebar() {
  const pathname = usePathname();
  const { t } = useTranslation(["common", "dashboard"]);
  const { initialCourse, loadCoursePublicDetailedQuery } = useCoursePublicDetail();
  const [activeTab, setActiveTab] = useState("lessons");
  const [aiTutorKey, setAiTutorKey] = useState(0);

  const handleTabChange = (value: string) => {
    if (value === "ai-tutor" && activeTab !== "ai-tutor") {
      setAiTutorKey((prev) => prev + 1);
    }
    setActiveTab(value);
  };

  const loadMembershipQuery = trpc.lmsModule.enrollment.getMembership.useQuery({
    courseId: initialCourse._id,
  }, { enabled: !!initialCourse._id });

  const enrollment = loadMembershipQuery.data?.enrollment;
  const cohort = enrollment?.cohort;
  const progress = enrollment?.progress || 0;

  const isOnCoursePage = pathname === `/dashboard/student/courses/${initialCourse._id}`;

  if (loadCoursePublicDetailedQuery.isLoading || loadMembershipQuery.isLoading) {
    return (
      <aside className="w-full space-y-3 p-4 lg:border lg:rounded-lg lg:bg-card">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-full" />
      </aside>
    );
  }

  return (
    <aside className="w-full lg:border lg:rounded-lg lg:bg-card lg:shadow-sm">
      <div className="flex flex-col">
        <div className="p-4">
            <Link
              href={`/dashboard/student/courses/${initialCourse._id}`}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors mb-4",
                isOnCoursePage ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
              )}
            >
              <BookOpen className="h-5 w-5 shrink-0" />
              <span className="flex-1 truncate">{initialCourse.title}</span>
            </Link>

            {enrollment && (
              <>
                {cohort && (
                  <div className="mb-4 p-3 bg-accent/50 rounded-md border">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {t("dashboard:cohort")}
                        </span>
                        <span className="text-xs font-semibold">{cohort.title}</span>
                      </div>
                      {cohort.beginDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {t("dashboard:student.started")}
                          </span>
                          <span className="text-xs">
                            {new Date(cohort.beginDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mb-4 p-3 bg-accent/30 rounded-md">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t("dashboard:progress")}</span>
                      <span className="font-semibold">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                    {enrollment.completedLessons !== undefined && enrollment.totalLessons !== undefined && (
                      <div className="text-xs text-muted-foreground text-center">
                        {enrollment.completedLessons}/{enrollment.totalLessons} {t("common:lessons")}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="lessons" className="flex-1">
                  <BookOpen className="h-4 w-4" />
                  {t("dashboard:student.tabs.lessons")}
                </TabsTrigger>
                <TabsTrigger value="ai-tutor" className="flex-1">
                  <Bot className="h-4 w-4" />
                  {t("dashboard:student.tabs.ai_tutor")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="lessons" className="mt-3">
                <LessonsTab />
              </TabsContent>

              <TabsContent value="ai-tutor" className="mt-3">
                <AiTutorTab key={aiTutorKey} />
              </TabsContent>
            </Tabs>
          </div>
      </div>
    </aside>
  );
}
