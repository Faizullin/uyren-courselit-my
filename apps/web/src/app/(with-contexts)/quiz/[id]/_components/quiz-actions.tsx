"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { startQuizAttempt } from "@/server/actions/quiz-attempt";
import { Button } from "@workspace/ui/components/button";
import { Play, RotateCcw } from "lucide-react";
import { useToast } from "@workspace/components-library";

interface QuizActionsProps {
  quizId: string;
  currentAttempt: any;
  remainingAttempts: number;
}

export default function QuizActions({
  quizId,
  currentAttempt,
  remainingAttempts,
}: QuizActionsProps) {
  const [isStarting, setIsStarting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation(["quiz", "common"]);

  const handleStartQuiz = async () => {
    if (remainingAttempts === 0) return;

    setIsStarting(true);
    try {
      const result = await startQuizAttempt(quizId);
      if (result.success) {
        router.push(`/quiz/${quizId}/attempts/${result.attemptId}`);
      } else {
        toast({
          title: t("common:error"),
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: t("common:error"),
        description: error.message || t("common:error_occurred"),
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleContinueAttempt = () => {
    router.push(`/quiz/${quizId}/attempts/${currentAttempt._id}`);
  };

  if (currentAttempt) {
    return (
      <Button
        onClick={handleContinueAttempt}
        size="lg"
      >
        <RotateCcw className="w-5 h-5 mr-2" />
        {t("quiz:continue_attempt")}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleStartQuiz}
      disabled={isStarting || remainingAttempts === 0}
      size="lg"
    >
      <Play className="w-5 h-5 mr-2" />
      {isStarting ? t("quiz:starting") : t("quiz:start_quiz")}
    </Button>
  );
}
