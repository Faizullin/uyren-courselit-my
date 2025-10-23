import {
  getAttemptStatistics,
  getUserQuizAttempts,
} from "@/server/actions/quiz-attempt";
import { getT } from "@/app/i18n/server";
import { trpcCaller } from "@/server/api/caller";
import { NotFoundException } from "@/server/api/core/exceptions";
import { QuizAttemptStatusEnum } from "@workspace/common-logic/models/lms/quiz-attempt.types";
import { IQuizAttemptHydratedDocument } from "@workspace/common-logic/models/lms/quiz-attempt.model";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { BarChart3, Clock, Eye, Target } from "lucide-react";
import { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import QuizActions from "./_components/quiz-actions";

interface QuizPageProps {
  params: Promise<{ id: string }>;
}

const getCachedData = cache(async (id: string) => {
  return await trpcCaller.lmsModule.quizModule.quiz.protectedGetById({
    id,
  });
});

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { id } = await params;
  const quiz = await getCachedData(id);

  if (!quiz) {
    return {
      title: `Quiz Not Found | ${(await parent)?.title?.absolute}`,
    };
  }
  return {
    title: `${quiz.title} | ${(await parent)?.title?.absolute}`,
    description: quiz.description || `Take the ${quiz.title} quiz`,
  };
}

export default async function QuizPage({ params }: QuizPageProps) {
  const { id } = await params;
  const { t } = await getT(["quiz", "common"]);

  try {
    const quiz = await getCachedData(id);

    let attemptStats = null;
    let userAttempts: IQuizAttemptHydratedDocument[] = [];

    try {
      [attemptStats, userAttempts] = await Promise.all([
        getAttemptStatistics(id),
        getUserQuizAttempts(id),
      ]);
    } catch (error) {
      console.warn("Failed to load attempt data:", error);
    }

    const currentAttempt = userAttempts.find(
      (attempt) => attempt.status === QuizAttemptStatusEnum.IN_PROGRESS,
    );

    const getRemainingAttempts = () => {
      if (!quiz.maxAttempts) return Infinity;
      return Math.max(0, quiz.maxAttempts - (attemptStats?.totalAttempts || 0));
    };

    const getStatusLabel = (status: QuizAttemptStatusEnum) => {
      switch (status) {
        case QuizAttemptStatusEnum.COMPLETED:
          return t("quiz:completed");
        case QuizAttemptStatusEnum.IN_PROGRESS:
          return t("quiz:in_progress");
        case QuizAttemptStatusEnum.ABANDONED:
          return t("quiz:abandoned");
        case QuizAttemptStatusEnum.GRADED:
          return t("quiz:graded");
        default:
          return status.replace("_", " ");
      }
    };

    return (
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">{t("quiz:quiz_assessment")}</Badge>
          </div>
          <h1 className="text-4xl font-semibold mb-2">{quiz.title}</h1>
          {quiz.description && (
            <p className="text-lg text-muted-foreground">{quiz.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <Target className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-2xl font-semibold mb-1">
                {quiz.passingScore}%
              </div>
              <div className="text-sm text-muted-foreground">
                {t("quiz:passing_score")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-2xl font-semibold mb-1">
                {quiz.timeLimit ? `${quiz.timeLimit} min` : t("quiz:no_limit")}
              </div>
              <div className="text-sm text-muted-foreground">{t("quiz:time_limit")}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <BarChart3 className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-2xl font-semibold mb-1">
                {quiz.totalPoints}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("quiz:total_points")}
              </div>
            </CardContent>
          </Card>
        </div>

        {attemptStats && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{t("quiz:your_progress")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">
                    {t("quiz:attempts_used")}
                  </div>
                  <div className="text-2xl font-semibold">
                    {attemptStats.totalAttempts}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">
                    {t("quiz:remaining")}
                  </div>
                  <div className="text-2xl font-semibold">
                    {getRemainingAttempts()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <QuizActions
            quizId={id}
            currentAttempt={currentAttempt}
            remainingAttempts={getRemainingAttempts()}
          />
        </div>

        {getRemainingAttempts() === 0 && (
          <div className="mb-8 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive font-medium">
              {t("quiz:max_attempts_reached")}
            </p>
          </div>
        )}

        {userAttempts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("quiz:recent_attempts")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userAttempts.slice(0, 3).map((attempt) => (
                  <div
                    key={`${attempt._id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          attempt.status === QuizAttemptStatusEnum.COMPLETED
                            ? "bg-green-500"
                            : attempt.status === QuizAttemptStatusEnum.IN_PROGRESS
                              ? "bg-blue-500"
                              : "bg-muted-foreground"
                        }`}
                      />
                      <span className="text-sm font-medium">
                        {new Date(attempt.startedAt).toLocaleDateString()}
                      </span>
                      <Badge
                        variant={
                          attempt.status === QuizAttemptStatusEnum.COMPLETED
                            ? "default"
                            : "secondary"
                        }
                      >
                        {getStatusLabel(attempt.status)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3">
                      {attempt.percentageScore !== undefined && (
                        <span className="text-sm font-semibold">
                          {Math.round(attempt.percentageScore)}%
                        </span>
                      )}
                      {attempt.status === QuizAttemptStatusEnum.IN_PROGRESS ? (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/quiz/${id}/attempts/${attempt._id}`}>
                            {t("common:continue")}
                          </Link>
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/quiz/${id}/attempts/${attempt._id}/results`}
                          >
                            {t("quiz:view_results")}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {userAttempts.length > 3 && (
                <>
                  <Separator className="my-4" />
                  <Button variant="outline" className="w-full" asChild>
                    <Link
                      href={`/quiz/${id}/attempts/${userAttempts[0]!._id}/results`}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {t("quiz:view_all_results")}
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  } catch (error) {
    if (error instanceof NotFoundException) {
      notFound();
    }
    throw error;
  }
}
