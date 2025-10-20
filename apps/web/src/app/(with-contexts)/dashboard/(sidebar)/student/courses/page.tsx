"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { BookOpen, PlayCircle, CheckCircle2, User2, Users, Calendar } from "lucide-react";
import { trpc } from "@/utils/trpc";
import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTable } from "@/components/data-table/use-data-table";
import { cn } from "@workspace/ui/lib/utils";
import { EnrollmentStatusEnum } from "@workspace/common-logic/models/lms/enrollment.types";
import { CourseLevelEnum } from "@workspace/common-logic/models/lms/course.types";
import type { GeneralRouterOutputs } from "@/server/api/types";

type MyCoursesOutput = GeneralRouterOutputs["lmsModule"]["courseModule"]["course"]["getMyEnrolledCourses"];
type EnrolledCourse = MyCoursesOutput["items"][number];

type QueryParams = Parameters<typeof trpc.lmsModule.courseModule.course.getMyEnrolledCourses.useQuery>[0];

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const breadcrumbs = [{ label: t("common:dashboard.student.courses.title"), href: "#" }];

    const [search, setSearch] = useState("");
    const [levelFilter, setLevelFilter] = useState<CourseLevelEnum | "all">("all");
    const [parsedData, setParsedData] = useState<EnrolledCourse[]>([]);
    const [parsedPagination, setParsedPagination] = useState({ pageCount: 1 });

    const columns = useMemo(() => [
        { accessorKey: "_id", header: "ID" },
    ], []);

    const { table } = useDataTable({
        columns,
        data: parsedData,
        pageCount: parsedPagination.pageCount,
        initialState: {
            pagination: { pageIndex: 0, pageSize: 9 },
        },
    });

    const tableState = table.getState();
    const queryParams = useMemo<QueryParams>(() => ({
        pagination: {
            skip: tableState.pagination.pageIndex * tableState.pagination.pageSize,
            take: tableState.pagination.pageSize,
        },
        search: search ? { q: search } : undefined,
        filter: {
            status: EnrollmentStatusEnum.ACTIVE,
            level: levelFilter === "all" ? undefined : levelFilter,
        },
    }), [tableState.pagination, search, levelFilter]);

    const loadMyCoursesQuery = trpc.lmsModule.courseModule.course.getMyEnrolledCourses.useQuery(queryParams);

    useEffect(() => {
        if (!loadMyCoursesQuery.data) return;
        setParsedData(loadMyCoursesQuery.data.items || []);
        setParsedPagination({
            pageCount: Math.ceil((loadMyCoursesQuery.data.total || 0) / loadMyCoursesQuery.data.meta.take),
        });
    }, [loadMyCoursesQuery.data]);

    const courses = parsedData;

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <HeaderTopbar
                header={{
                    title: t("common:dashboard.student.courses.title"),
                    subtitle: "Track your enrolled courses and progress",
                }}
            />

            {/* Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                    <div className="flex-1 max-w-md">
                        <Input
                            placeholder="Search courses..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Level</Label>
                        <Select value={levelFilter} onValueChange={(value) => setLevelFilter(value as CourseLevelEnum | "all")}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Levels</SelectItem>
                                <SelectItem value={CourseLevelEnum.BEGINNER}>Beginner</SelectItem>
                                <SelectItem value={CourseLevelEnum.INTERMEDIATE}>Intermediate</SelectItem>
                                <SelectItem value={CourseLevelEnum.ADVANCED}>Advanced</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Course Grid */}
            {loadMyCoursesQuery.isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <CourseCardSkeleton key={i} />
                    ))}
                </div>
            ) : courses.length === 0 ? (
                <EmptyState search={search} />
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course) => (
                            <CourseCard
                                key={course._id}
                                course={course}
                            />
                        ))}
                    </div>

                    {!loadMyCoursesQuery.isLoading && (
                        <DataTablePagination table={table} pageSizeOptions={[9, 18, 27, 36]} />
                    )}
                </>
            )}
        </DashboardContent>
    );
}

interface CourseCardProps {
    course: EnrolledCourse;
}

function CourseCard({ course }: CourseCardProps) {
    const { progress, instructors, owner, cohort } = course;
    const { percentComplete = 0, completedLessons = 0, totalLessons = 0 } = progress || {};
    
    const instructor = instructors?.[0] || owner;

    return (
        <Link href={`/dashboard/student/courses/${course._id}`}>
            <Card className="p-0 h-full hover:shadow-lg transition-all duration-200 cursor-pointer group overflow-hidden border-2 hover:border-primary/20">
                {/* Image Section */}
                <div className="relative h-40 bg-gradient-to-br from-primary/10 to-primary/5">
                    {course.featuredImage?.file ? (
                        <img
                            src={course.featuredImage.file}
                            alt={course.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="h-12 w-12 text-primary/40" />
                        </div>
                    )}
                    
                    {/* Progress Badge */}
                    <div className="absolute top-3 right-3">
                        <Badge variant={percentComplete === 100 ? "default" : "secondary"} className="bg-white/95 backdrop-blur shadow-sm">
                            {percentComplete}%
                        </Badge>
                    </div>

                    {/* Cohort Badge */}
                    {cohort && (
                        <div className="absolute top-3 left-3">
                            <Badge variant="outline" className="bg-white/95 backdrop-blur shadow-sm">
                                <Users className="h-3 w-3 mr-1" />
                                {cohort.title}
                            </Badge>
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <CardContent className="p-0">
                    <div className="p-4 space-y-3">
                        {/* Course Title */}
                        <div>
                            <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                {course.title}
                            </h3>
                            <Badge variant="outline" className="mt-1 text-xs capitalize">
                                {course.level}
                            </Badge>
                        </div>

                        {/* Instructor */}
                        {instructor && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User2 className="h-4 w-4" />
                                <span className="truncate">{instructor.fullName}</span>
                            </div>
                        )}

                        {/* Cohort Info */}
                        {cohort && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span className="truncate">
                                    {cohort.beginDate && new Date(cohort.beginDate).toLocaleDateString()}
                                    {cohort.endDate && ` - ${new Date(cohort.endDate).toLocaleDateString()}`}
                                </span>
                            </div>
                        )}

                        {/* Progress Section */}
                        <div className="space-y-2 pt-2 border-t">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-medium">{completedLessons}/{totalLessons} lessons</span>
                            </div>
                            <ProgressBar value={percentComplete} />
                        </div>

                        {/* Action Button */}
                        <Button 
                            className="w-full mt-3" 
                            variant={percentComplete === 0 ? "default" : "outline"}
                            size="sm"
                        >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            {percentComplete === 0 ? "Start Learning" : "Continue"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

function ProgressBar({ value }: { value: number }) {
    return (
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
                className={cn(
                    "h-full transition-all duration-300 rounded-full",
                    value === 100 ? "bg-green-500" : "bg-primary"
                )}
                style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
        </div>
    );
}

function CourseCardSkeleton() {
    return (
        <Card>
            <Skeleton className="h-48 w-full rounded-t-lg" />
            <CardContent className="p-4 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
    );
}

interface EmptyStateProps {
    search: string;
}

function EmptyState({ search }: EmptyStateProps) {
    return (
        <div className="text-center py-16">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
                {search ? "No courses found" : "No courses enrolled yet"}
            </h3>
            <p className="text-muted-foreground mb-6">
                {search 
                    ? "Try adjusting your search criteria"
                    : "Start your learning journey by enrolling in courses"
                }
            </p>
            {!search && (
                <Link href="/courses">
                    <Button>
                        <BookOpen className="h-4 w-4 mr-2" />
                        Browse Courses
                    </Button>
                </Link>
            )}
        </div>
    );
}