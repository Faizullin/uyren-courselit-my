
import { getSymbolFromCurrency } from "@workspace/components-library";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { BookOpen, CheckCircle, CircleDashed } from "lucide-react";
import Image from "next/image";
import { useSiteInfo } from "../contexts/site-info-context";
import { GeneralRouterOutputs } from "@/server/api/types";
import { useTranslation } from "react-i18next";

interface CourseCardBaseProps {
    className?: ReturnType<typeof cn>;
    children?: React.ReactNode;
}

type ICourseItem = GeneralRouterOutputs["lmsModule"]["courseModule"]["course"]["list"]["items"][number];

interface CourseCardProps extends CourseCardBaseProps {
    course: ICourseItem;
    viewMode?: "grid" | "list";
}

export function CourseCard({ course, className, viewMode = "grid" }: CourseCardProps) {
    const { siteInfo } = useSiteInfo();
    const { t } = useTranslation(["course"]);
    
    if (viewMode === "list") {
        return (
            <CourseCardContent.Card className={cn("py-0", className)}>
                <div className="flex flex-row">
                    <div className="w-48 flex-shrink-0">
                        <CourseCardContent.CardImage src={course.featuredImage?.url || "/courselit_backdrop_square.webp"} alt={course.title} />
                    </div>
                    <CourseCardContent.CardContent className="p-4 flex-1">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <CourseCardContent.CardHeader>
                                    {course.title}
                                </CourseCardContent.CardHeader>
                                {course.shortDescription && (
                                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                        {course.shortDescription}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            {course.published ? (
                                                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                                <CircleDashed className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {course.published ? t("status.published") : t("status.draft")}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm mt-2">
                            <Badge variant="outline">
                                <BookOpen className="h-3 w-3 mr-1" />
                                {course.level || "Beginner"}
                            </Badge>
                            <div className="flex items-center text-muted-foreground">
                                <span>
                                    <span className="text-base">
                                        {getSymbolFromCurrency(siteInfo.currencyISOCode || "USD")}{" "}
                                    </span>
                                    {course.statsEnrollmentCount.toLocaleString()} {t("card.sales")}
                                </span>
                            </div>
                        </div>
                    </CourseCardContent.CardContent>
                </div>
            </CourseCardContent.Card>
        );
    }
    
    return (
        <CourseCardContent.Card className={cn("py-0", className)}>
            <CourseCardContent.CardImage src={course.featuredImage?.url || "/courselit_backdrop_square.webp"} alt={course.title} />
            <CourseCardContent.CardContent className="p-4">
                <CourseCardContent.CardHeader >
                    {course.title}
                </CourseCardContent.CardHeader>
                <div className="flex items-center justify-between gap-2 mb-4">
                    <Badge variant="outline">
                        <BookOpen className="h-4 w-4 mr-1" />
                    </Badge>
                    <div className="flex items-center gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    {course.published ? (
                                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <CircleDashed className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </TooltipTrigger>
                                <TooltipContent>
                                    {course.published ? t("status.published") : t("status.draft")}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                        <span>
                            <span className="text-base">
                                {getSymbolFromCurrency(siteInfo.currencyISOCode || "USD")}{" "}
                            </span>
                            {course.statsEnrollmentCount.toLocaleString()} {t("card.sales")}
                        </span>
                    </div>
                </div>
            </CourseCardContent.CardContent>
        </CourseCardContent.Card>
    );
}

export function CourseSkeletonCard({
    className,
}: CourseCardBaseProps) {
    return (
        <CourseCardContent.Card className={cn("py-0", className)}>
            <div className="relative aspect-video">
                <Skeleton className="h-full w-full" />
            </div>
            <CourseCardContent.CardContent className="p-4">
                <Skeleton className="h-6 w-full mb-3" />
                <Skeleton className="h-6 w-full" />
            </CourseCardContent.CardContent>
        </CourseCardContent.Card>
    );
}


export const CourseCardContent = {
    Card: ({
        className,
        children,
    }: CourseCardBaseProps) => {
        return (
            <Card className={cn("overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1", className)}>
                {children}
            </Card>
        );
    },
    CardImage: ({
        className,
        src,
        alt,
    }: {
        src: string;
        alt: string;
    } & CourseCardBaseProps) => {
        return (
            <div className={cn("relative aspect-video", className)}>
                <Image src={src} alt={alt} loading="lazy" width={300} height={300} className="w-full h-full object-cover" />
            </div>
        );
    },
    CardContent: ({
        className,
        children,
    }: CourseCardBaseProps) => {
        return <CardContent className={cn("p-4", className)}>{children}</CardContent>;
    },
    CardHeader: ({
        children,
    }: CourseCardBaseProps) => {
        return <h3 className="text-xl font-semibold mb-3">{children}</h3>;
    },
}