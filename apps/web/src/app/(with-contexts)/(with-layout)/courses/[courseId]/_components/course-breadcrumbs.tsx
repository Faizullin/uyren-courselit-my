"use client";

import { useCoursePublicDetail } from "@/components/course/detail/course-public-detail-context";
import { ScrollAnimation } from "@/components/public/scroll-animation";
import Link from "next/link";
import { useTranslation } from "react-i18next";

export default function CourseBreadcrumbs() {
    const { t } = useTranslation("frontend");
    const { initialCourse } = useCoursePublicDetail();

    return (
        <ScrollAnimation variant="fadeUp">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 m--breadcrumbs">
                <Link
                    href="/"
                    className="hover:text-brand-primary transition-colors"
                >
                    {t("course_detail.breadcrumb_home")}
                </Link>
                <span>/</span>
                <Link
                    href="/courses"
                    className="hover:text-brand-primary transition-colors"
                >
                    {t("course_detail.breadcrumb_courses")}
                </Link>
                <span>/</span>
                <Link
                    href={`/courses/${initialCourse._id}`}
                    className="hover:text-brand-primary transition-colors"
                >
                    {initialCourse.title}
                </Link>
            </div>
        </ScrollAnimation>
    );
} 