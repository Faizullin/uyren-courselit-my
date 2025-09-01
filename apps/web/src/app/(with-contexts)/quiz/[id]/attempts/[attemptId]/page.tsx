import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { trpcCaller } from "@/server/api/caller";
import { getQuizAttempt } from "@/server/actions/quiz-attempt";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import QuizInterface from "../../_components/quiz-interface";

interface QuizAttemptPageProps {
  params: Promise<{ id: string; attemptId: string }>;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string; attemptId: string }> },
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { id, attemptId } = await params;

  try {
    const quiz = await trpcCaller.lmsModule.quizModule.quiz.publicGetByQuizId({
      quizId: id,
    });
    if (!quiz) {
      return {
        title: `Quiz Not Found | Quizzes | LMS | ${(await parent)?.title?.absolute}`,
      };
    }

    return {
      title: `${quiz.title} - Attempt ${attemptId} | Quizzes | LMS | ${(await parent)?.title?.absolute}`,
      description: `Take the ${quiz.title} quiz`,
    };
  } catch (error) {
    return {
      title: `Quiz Attempt | Quizzes | LMS | ${(await parent)?.title?.absolute}`,
    };
  }
}

export default async function QuizAttemptPage({
  params,
}: QuizAttemptPageProps) {
  const { id, attemptId } = await params;

  try {
    // Fetch quiz data
    const quiz =
      await trpcCaller.lmsModule.quizModule.quiz.publicGetByQuizIdWithQuestions(
        { quizId: id },
      );
    if (!quiz) {
      notFound();
    }

    // Fetch attempt data
    const attempt = await getQuizAttempt(attemptId);
    if (!attempt) {
      notFound();
    }

    // Verify attempt belongs to this quiz
    if (attempt.quizId?.toString() !== id) {
      notFound();
    }

    // Serialize only the minimal data needed for the quiz interface
    // Remove sensitive data like scores, correct answers, and grading info
    const serializedQuiz = {
      _id: quiz._id?.toString(),
      title: quiz.title,
      description: quiz.description,
      maxAttempts: quiz.maxAttempts,
      timeLimit: quiz.timeLimit,
      totalPoints: quiz.totalPoints,
      questions: quiz.questions.map((question) => ({
        _id: question._id?.toString(),
        title: question.title,
        text: question.text,
        description: question.description,
        type: question.type,
        points: question.points,
        options: question.options.map((option: any) => ({
          _id: option._id?.toString(),
          text: option.text,
          uid: option.uid,
          // isCorrect: option.isCorrect,
        })),
      })),
    };

    const serializedAttempt = {
      _id: attempt._id?.toString() || attemptId,
      quizId: attempt.quizId?.toString() || id,
      userId: attempt.userId?.toString() || "",
      status: attempt.status,
      startedAt: attempt.startedAt?.toISOString(),
      expiresAt: attempt.expiresAt?.toISOString(),
      answers:
        attempt.answers?.map((answer) => ({
          questionId: answer.questionId?.toString(),
          answer: answer.answer,
        })) || [],
      timeSpent: attempt.timeSpent,
    };

    if (
      serializedAttempt.status === "completed" ||
      serializedAttempt.status === "graded"
    ) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">
                Quiz Already Completed
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-4">
                This quiz attempt has already been completed.
              </p>
              <Link
                href={`/quiz/${serializedQuiz._id}/attempts/${serializedAttempt._id}/results`}
              >
                View Results
              </Link>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (serializedAttempt.status === "abandoned") {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center text-red-600">
                Attempt Abandoned
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-4">
                This quiz attempt has been abandoned and cannot be continued.
              </p>
              <Link href={`/quiz/${serializedQuiz._id}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Quiz
              </Link>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <QuizInterface
        initialQuiz={serializedQuiz}
        initialAttemptData={serializedAttempt}
        attemptId={attemptId}
      />
    );
  } catch (error) {
    console.error("Error loading quiz attempt:", error);
    // If there's a serialization error, it's likely due to ObjectId issues
    if (error instanceof Error && error.message.includes("toJSON")) {
      console.error("Serialization error - ObjectId conversion failed");
    }
    notFound();
  }
}
