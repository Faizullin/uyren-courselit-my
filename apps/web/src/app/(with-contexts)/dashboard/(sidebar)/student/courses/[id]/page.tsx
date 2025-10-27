"use client";

import { useCoursePublicDetail } from "@/components/course/detail/course-public-detail-context";
import { ScrollAnimation } from "@/components/public/scroll-animation";
import { trpc } from "@/utils/trpc";
import { ITextEditorContent } from "@workspace/common-logic/lib/text-editor-content";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Star, Users } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useTranslation } from "react-i18next";

const DescriptionEditor = dynamic(
    () =>
      import(
        "@/components/editors/tiptap/templates/description/description-editor"
      ).then((mod) => ({ default: mod.DescriptionEditor })),
    {
      ssr: false,
    },
  );

export default function Page() {
    const { t } = useTranslation(["dashboard", "common", "course"]);
    const { initialCourse, loadCoursePublicDetailedQuery } = useCoursePublicDetail();
    
    const loadMembershipQuery = trpc.lmsModule.enrollment.getMembership.useQuery({ 
        courseId: initialCourse._id,
     }, {
        enabled: !!initialCourse._id,
     });

    if (loadCoursePublicDetailedQuery.isLoading || loadMembershipQuery.isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    return (
        <div className="w-full space-y-4 lg:space-y-6">
        <ScrollAnimation variant="fadeUp">
                <div className="space-y-3">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold">
                        {initialCourse.title} 
                    </h1>
                    
                    {initialCourse.shortDescription && (
                        <p className="text-base lg:text-lg leading-relaxed text-muted-foreground">
                            {initialCourse.shortDescription}
                        </p>
                    )}
        
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-transparent fill-yellow-500" />
                            <span>{initialCourse.statsAverageRating || 0}</span>
                        </div>
        
                        {initialCourse.statsEnrollmentCount && (
                            <>
                                <span className="text-muted-foreground">•</span>
                                <div className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    <span>{initialCourse.statsEnrollmentCount || 0} {t("common:students")}</span>
                                </div>
                            </>
                        )}
        
                        <span className="text-muted-foreground">•</span>
                        <Badge variant="secondary" className="bg-brand-primary/10 text-brand-primary border-brand-primary/20">
                            {initialCourse.level}
                        </Badge>
                    </div>
        
                    {initialCourse.tags && initialCourse.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            {initialCourse.tags.map((tag, index) => (
                                <Badge key={index} variant="outline">
                                    {tag.name}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollAnimation>
    
            <ScrollAnimation variant="fadeUp">
                <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                    {initialCourse.featuredImage && (
                        <div className="relative w-full h-48 sm:h-64 lg:h-80">
                            <Image
                                src={initialCourse.featuredImage.url || "/placeholder-course.jpg"}
                                alt={initialCourse.featuredImage.caption || initialCourse.title}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                        </div>
                    )}
    
                    {loadCoursePublicDetailedQuery.data?.description && (
                        <div className="p-4 lg:p-6">
                            <DescriptionEditor
                                editable={false}
                                toolbar={false}
                                onEditor={(editor, meta) => {
                                    if (meta.reason === "create") {
                                        editor!.commands.setMyContent(loadCoursePublicDetailedQuery.data?.description! as unknown as ITextEditorContent);
                                    }
                                }}
                            />
                        </div>
                    )}
                </div>
            </ScrollAnimation>
        </div>
    );
}
