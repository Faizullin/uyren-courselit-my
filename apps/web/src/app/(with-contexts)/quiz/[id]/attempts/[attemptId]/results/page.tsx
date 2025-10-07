import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { trpcCaller } from "@/server/api/caller";
import { getQuizAttempt } from "@/server/actions/quiz-attempt";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Trophy,
  Clock,
  Target,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import QuizDetails from "./_components/quiz-details";

interface QuizAttemptResultsPageProps {
  params: Promise<{ id: string; attemptId: string }>;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string; attemptId: string }> },
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { id, attemptId } = await params;
  return {
    title: `Quiz Results ${attemptId} | Quiz ${id} | Quizzes | ${(await parent)?.title?.absolute}`,
  };
}

export default async function QuizAttemptResultsPage({
  params,
}: QuizAttemptResultsPageProps) {
  const { id, attemptId } = await params;

  try {
    const quiz = await trpcCaller.lmsModule.quizModule.quiz.protectedGetById({
      id,
    });
    let attempt = null;

    try {
      attempt = await getQuizAttempt(attemptId);
    } catch (error) {
      console.warn("Failed to load attempt data:", error);
    }

    if (!attempt) {
      notFound();
    }

    if (attempt.quizId.toString() !== id) {
      notFound();
    }

    const isPassed =
      attempt.percentageScore &&
      attempt.percentageScore >= (quiz.passingScore || 60);

    const getScoreColor = () => {
      if (isPassed) return "text-green-600 dark:text-green-400";
      return "text-red-600 dark:text-red-400";
    };

    const getScoreBg = () => {
      if (isPassed) return "bg-green-50 dark:bg-green-950/20";
      return "bg-red-50 dark:bg-red-950/20";
    };

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Back Navigation */}
          <div className="mb-6">
            <Link
              href={`/quiz/${id}`}
              className="inline-flex items-center text-muted-foreground hover:text-brand-primary transition-colors duration-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Quiz
            </Link>
          </div>

          {/* Quiz Results Card */}
          <Card className="max-w-4xl mx-auto shadow-lg border-0 bg-card/50 backdrop-blur-sm mb-8">
            <CardHeader className="text-center pb-8">
              <div className="space-y-4">
                <Badge className="bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 text-sm font-semibold px-4 py-2">
                  Quiz Results
                </Badge>
                <CardTitle className="text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                  {quiz.title}
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="space-y-8 px-8 pb-8">
              {/* Score Display */}
              <div className="text-center">
                <div
                  className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${getScoreBg()} border-4 border-current ${getScoreColor()} mb-6`}
                >
                  <div className="text-center">
                    <div className="text-4xl font-bold">
                      {Math.round(attempt.percentageScore || 0)}%
                    </div>
                    <div className="text-sm font-medium mt-1">Score</div>
                  </div>
                </div>

                <div className="text-xl mb-6">
                  {isPassed ? (
                    <div className="flex items-center justify-center gap-3 text-green-600 dark:text-green-400">
                      <Trophy className="w-8 h-8" />
                      <span className="font-semibold">
                        Congratulations! You passed!
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3 text-red-600 dark:text-red-400">
                      <XCircle className="w-8 h-8" />
                      <span className="font-semibold">
                        You need to score higher to pass.
                      </span>
                    </div>
                  )}
                </div>

                {/* Score Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                  <div className="group bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 p-4 rounded-xl text-center border border-blue-200/50 dark:border-blue-800/50">
                    <div className="flex items-center justify-center mb-2">
                      <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {quiz.passingScore || 60}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Passing Score
                    </div>
                  </div>

                  {attempt.score !== undefined && (
                    <div className="group bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 p-4 rounded-xl text-center border border-purple-200/50 dark:border-purple-800/50">
                      <div className="flex items-center justify-center mb-2">
                        <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {attempt.score}/{quiz.totalPoints}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Raw Score
                      </div>
                    </div>
                  )}

                  {attempt.completedAt && (
                    <div className="group bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 p-4 rounded-xl text-center border border-green-200/50 dark:border-green-800/50">
                      <div className="flex items-center justify-center mb-2">
                        <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {new Date(attempt.completedAt).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Completed
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quiz Details Component */}
          <QuizDetails attemptId={attemptId} />
        </div>
      </div>
    );
  } catch (error) {
    notFound();
  }
}
