"use client";

import { useCoursePublicDetail } from "@/components/course/detail/course-public-detail-context";
import { trpc } from "@/utils/trpc";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import dynamic from "next/dynamic";
import { ITextEditorContent } from "@workspace/common-logic/lib/text-editor-content";

const LessonContentEditor = dynamic(
    () => import("@/components/editors/tiptap/templates/lesson-content/lesson-content-editor").then((mod) => ({ default: mod.LessonContentEditor })),
    { ssr: false },
);

export default function LessonPage() {
    const { t } = useTranslation(["dashboard", "common"]);
    const params = useParams<{ id: string; lessonId: string }>();
    const { initialCourse } = useCoursePublicDetail();
    const router = useRouter();
    
    const loadLessonQuery = trpc.lmsModule.courseModule.lesson.publicGetById.useQuery({
        courseId: initialCourse._id,
        lessonId: params.lessonId,
    }, { enabled: !!params.lessonId && !!initialCourse._id });

    const isLessonLoading = loadLessonQuery.isLoading;
    const lesson = loadLessonQuery.data;

    const nav = useMemo(() => ({
        prev: loadLessonQuery.data?.meta.prevLesson?._id,
        next: loadLessonQuery.data?.meta.nextLesson?._id,
    }), [loadLessonQuery.data])

    if (isLessonLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!initialCourse || !lesson) {
        return (
            <div className="text-center py-12 px-4">
                <h3 className="text-lg font-semibold mb-2">{t("dashboard:lesson.not_found")}</h3>
                <p className="text-muted-foreground mb-6">
                    {t("dashboard:lesson.not_found_desc")}
                </p>
                <Link href={`/dashboard/student/courses/${params.id}`}>
                    <Button>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {t("dashboard:lesson.back_to_course")}
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="p-4 lg:p-6">
                    <LessonContentEditor
                        lesson={lesson}
                        editable={false}
                        toolbar={false}
                        onEditor={(editor, meta) => {
                            if (meta.reason === "create") {
                                editor!.commands.setMyContent(lesson.content as unknown as ITextEditorContent);
                            }
                        }}
                    />
                </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t">
                <Button 
                    variant="outline" 
                    className="w-full sm:w-auto"
                    onClick={() => router.push(`/dashboard/student/courses/${params.id}/lessons/${nav.prev}`)}
                    disabled={!nav.prev}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("common:previous")}
                </Button>
                
                <Button 
                    className="w-full sm:w-auto"
                    onClick={() => router.push(`/dashboard/student/courses/${params.id}/lessons/${nav.next}`)}
                    disabled={!nav.next}
                >
                    {t("common:next")}
                    <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
            </div>
        </div>
    );
}