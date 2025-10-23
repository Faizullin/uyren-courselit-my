import { getQuizAttemptDetails } from "@/server/actions/quiz-attempt";
import { getT } from "@/app/i18n/server";
import { getActionContext } from "@/server/api/core/actions";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { checkPermission } from "@workspace/utils";
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QuestionResults from "./_components/question-results";

interface QuizResultsPageProps {
  params: Promise<{ id: string; attemptId: string }>;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string; attemptId: string }> },
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { attemptId } = await params;
  
  try {
    const result = await getQuizAttemptDetails(attemptId);
    return {
      title: `${result.quizTitle} - Results | ${(await parent)?.title?.absolute}`,
      description: `Quiz results for ${result.quizTitle}`,
    };
  } catch (error) {
    return {
      title: `Quiz Results | ${(await parent)?.title?.absolute}`,
    };
  }
}

export default async function QuizResultsPage({ params }: QuizResultsPageProps) {
  const { id, attemptId } = await params;
  const { t } = await getT(["quiz", "common"]);

  try {
    const result = await getQuizAttemptDetails(attemptId);

    const passed = result.passed;
    const percentageScore = Math.round(result.percentageScore);

    let canLeaveFeedback = false;
    try {
      const ctx = await getActionContext();
      canLeaveFeedback = checkPermission(ctx.user.permissions, [
        UIConstants.permissions.manageCourse,
        UIConstants.permissions.manageAnyCourse,
      ]);
    } catch (error) {
      canLeaveFeedback = false;
    }

    return (
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href={`/quiz/${id}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("quiz:back_to_quiz")}
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-semibold mb-2">{result.quizTitle}</h1>
          <p className="text-lg text-muted-foreground">{t("quiz:view_results")}</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t("quiz:your_score")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2">
                    {percentageScore}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {result.score} / {result.totalPoints} {t("common:points")}
                  </div>
                </div>
                
                <Separator orientation="vertical" className="h-16 hidden md:block" />
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {passed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive" />
                    )}
                    <span className="font-semibold">
                      {passed ? t("quiz:passed") : t("quiz:not_passed")}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("quiz:passing_score")}: {result.passingScore}%
                  </div>
                  {result.completedAt && (
                    <div className="text-sm text-muted-foreground">
                      {t("quiz:completed")}: {new Date(result.completedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/quiz/${id}`}>
                    {t("quiz:retake_quiz")}
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-4">
          <h2 className="text-2xl font-semibold">{t("quiz:questions_and_answers")}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("quiz:review_answers")}
          </p>
        </div>

        <QuestionResults 
          questions={result.questions}
          answers={result.answers}
          attemptId={attemptId}
          canLeaveFeedback={canLeaveFeedback}
        />
      </div>
    );
  } catch (error) {
    console.error("Error loading quiz results:", error);
    notFound();
  }
}

