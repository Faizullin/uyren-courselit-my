"use client";

import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import {
  ScrollAnimation,
  ScrollGroup,
} from "@/components/public/scroll-animation";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { useDebounce } from "@workspace/ui/hooks/use-debounce";
import {
  AlertCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { trpc } from "@/utils/trpc";

type Level = "Beginner" | "Intermediate" | "Advanced";
type LevelFilter = "all" | Level;

const COURSES_PER_PAGE = 9;

function getRussianCourseText(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} курс доступен`;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14))
    return `${count} курса доступны`;
  return `${count} курсов доступны`;
}

function CoursesContent() {
  const { t, i18n } = useTranslation("common");
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Load courses using tRPC
  const {
    data: coursesData,
    isLoading,
    error,
  } = trpc.lmsModule.product.publicList.useQuery(
    {
      pagination: {
        take: COURSES_PER_PAGE,
        skip: (currentPage - 1) * COURSES_PER_PAGE,
        includePaginationCount: true,
      },
      filter: {
        type: ["course"], // Only get actual courses, not downloads or blogs
      },
      search: debouncedSearchTerm ? { q: debouncedSearchTerm } : undefined,
    },
    {
      enabled: true,
    },
  );

  const courses = coursesData?.items || [];
  const totalCourses = coursesData?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCourses / COURSES_PER_PAGE));

  useEffect(() => setCurrentPage(1), [debouncedSearchTerm, levelFilter]);
  useEffect(
    () => setCurrentPage((p) => Math.min(Math.max(1, p), totalPages)),
    [totalPages],
  );

  const clearFilters = () => {
    setSearchTerm("");
    setLevelFilter("all");
    setCurrentPage(1);
  };

  if (error) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-600 mb-2">
                {t("error_heading")}
              </h3>
              <p className="text-gray-600 mb-4">{error.message}</p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                {t("try_again")}
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* Header */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black"></div>
        <div className="container mx-auto px-4 relative z-10">
          <ScrollAnimation
            variant="fadeUp"
            className="max-w-4xl mx-auto text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              <Trans
                i18nKey="courses_page.header_title"
                t={t}
                components={{
                  "primary-label": <span className="text-brand-primary" />,
                }}
              />
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8">
              {t("courses_page.header_desc")}
            </p>
          </ScrollAnimation>
        </div>
      </section>

      {/* Filters */}
      <section className="py-8 bg-gray-50 border-b">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t("search_placeholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-4 items-center">
              <Select
                value={levelFilter}
                onValueChange={(v) => setLevelFilter(v as LevelFilter)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t("all_levels")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("all_levels")}</SelectItem>
                  <SelectItem value="Beginner">
                    {t("level_beginner")}
                  </SelectItem>
                  <SelectItem value="Intermediate">
                    {t("level_intermediate")}
                  </SelectItem>
                  <SelectItem value="Advanced">
                    {t("level_advanced")}
                  </SelectItem>
                </SelectContent>
              </Select>
              {(searchTerm || levelFilter !== "all") && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="whitespace-nowrap bg-transparent"
                >
                  {t("clear_filters")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Courses grid */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          {!isLoading && (
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto text-center mb-8">
              {i18n.language === "ru"
                ? getRussianCourseText(courses.length)
                : `${courses.length} ${courses.length === 1 ? t("course") : t("courses_available_plural")}`}
              {(searchTerm || levelFilter !== "all") &&
                ` ${t("matching_criteria")}`}
            </p>
          )}

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {[...Array(6)].map((_, index) => (
                <Card
                  key={index}
                  className="pt-0 h-full animate-pulse overflow-hidden"
                >
                  <CardContent className="p-0">
                    <div className="h-48 bg-gray-200"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {t("no_courses")}
              </h3>
              <p className="text-gray-500 mb-4">{t("no_courses_desc")}</p>
              <Button onClick={clearFilters} variant="outline">
                {t("clear_filters")}
              </Button>
            </div>
          ) : (
            <>
              <ScrollGroup
                variant="fadeUp"
                staggerDelay={0.1}
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
              >
                {courses.map((course) => {
                  const tags = course.tags || [];
                  const extraCount = Math.max(0, tags.length - 3);
                  return (
                    <Link
                      key={course.courseId}
                      href={`/courses/${course.courseId}`}
                    >
                      <Card className="pt-0 h-full hover:shadow-xl transition-all duration-300 group cursor-pointer overflow-hidden">
                        <CardContent className="p-0">
                          <div className="relative h-48 w-full overflow-hidden">
                            <Image
                              src={
                                course.featuredImage?.thumbnail ||
                                "/courselit_backdrop.webp"
                              }
                              alt={course.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                            <Badge className="absolute top-3 right-3 bg-brand-primary text-white">
                              {t(
                                `level_${course.level?.toLowerCase() || "beginner"}`,
                              )}
                            </Badge>
                          </div>
                          <div className="p-4 space-y-3">
                            <div className="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-brand-primary/20 transition-colors">
                              <BookOpen className="h-5 w-5 text-brand-primary" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-brand-primary transition-colors">
                              {course.title}
                            </h3>
                            <p className="text-gray-600 mb-3 text-sm line-clamp-2">
                              {course.shortDescription}
                            </p>
                            <div className="flex items-center text-sm text-gray-500 mb-3">
                              <BookOpen className="h-4 w-4 mr-2" />
                              <span>
                                {course.lessonsCount} {t("lessons")} •{" "}
                                {t(
                                  `level_${course.level?.toLowerCase() || "beginner"}`,
                                )}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {tags.slice(0, 3).map((tag, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {extraCount > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{extraCount}
                                </Badge>
                              )}
                            </div>
                            <Button className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white">
                              {t("view_course")}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </ScrollGroup>

              {totalPages > 1 && (
                <div className="flex justify-center items-center mt-12 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t("previous")}
                  </Button>
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 h-10 ${currentPage === page ? "bg-brand-primary hover:bg-brand-primary-hover" : ""}`}
                        >
                          {page}
                        </Button>
                      ),
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-2"
                  >
                    {t("next")}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default function CoursesPage() {
  const { t } = useTranslation("common");
  return (
    <Suspense fallback={<div>{t("loading")}</div>}>
      <CoursesContent />
    </Suspense>
  );
}
