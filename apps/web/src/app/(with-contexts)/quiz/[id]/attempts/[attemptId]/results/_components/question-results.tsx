"use client";

import { saveTeacherFeedback } from "@/server/actions/quiz-attempt";
import { trpc } from "@/utils/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@workspace/components-library";

interface Question {
  _id: string;
  text: string;
  type: string;
  points: number;
  options?: Array<{
    uid: string;
    text: string;
    isCorrect?: boolean;
  }>;
  correctAnswers?: string[];
}

interface Answer {
  questionId: string;
  userAnswer: any;
  isCorrect?: boolean;
  score: number;
  feedback?: string;
}

interface QuestionResultsProps {
  questions: Question[];
  answers: Answer[];
  attemptId: string;
}

export default function QuestionResults({ questions, answers, attemptId }: QuestionResultsProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [savingFeedback, setSavingFeedback] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation(["quiz", "common"]);
  const { data: permissionData } = trpc.lmsModule.quizModule.quizAttempt.canLeaveFeedback.useQuery();
  const canLeaveFeedback = permissionData?.canLeaveFeedback ?? false;

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const getAnswerForQuestion = (questionId: string) => {
    return answers.find((a) => a.questionId === questionId);
  };

  const handleSaveFeedback = async (questionId: string) => {
    const feedback = feedbacks[questionId] || "";
    
    setSavingFeedback(questionId);
    try {
      const result = await saveTeacherFeedback(attemptId, questionId, feedback);
      
      if (result.success) {
        toast({
          title: t("common:success"),
          description: t("quiz:feedback_saved"),
        });
        const answerIndex = answers.findIndex(a => a.questionId === questionId);
        if (answerIndex >= 0) {
          answers[answerIndex]!.feedback = feedback;
        }
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
        description: error.message || t("quiz:feedback_save_failed"),
        variant: "destructive",
      });
    } finally {
      setSavingFeedback(null);
    }
  };

  const renderUserAnswer = (question: Question, answer: Answer) => {
    if (question.type === "multiple_choice") {
      const userAnswerIds = Array.isArray(answer.userAnswer) 
        ? answer.userAnswer 
        : [answer.userAnswer];
      
      return (
        <div className="space-y-2">
          {question.options?.map((option) => {
            const isUserAnswer = userAnswerIds.includes(option.uid);
            const isCorrect = option.isCorrect;
            
            return (
              <div
                key={option.uid}
                className={`p-3 rounded-lg border ${
                  isUserAnswer && isCorrect
                    ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                    : isUserAnswer && !isCorrect
                      ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                      : isCorrect
                        ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                        : "bg-muted/30 border-border"
                }`}
              >
                <div className="flex items-start gap-2">
                  {isUserAnswer && (
                    isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    )
                  )}
                  {!isUserAnswer && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm">{option.text}</p>
                    {isUserAnswer && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {t("quiz:your_answer")}
                      </Badge>
                    )}
                    {!isUserAnswer && isCorrect && (
                      <Badge variant="outline" className="mt-1 text-xs bg-green-50 text-green-700 dark:bg-green-950/30">
                        {t("quiz:correct_answer")}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (question.type === "short_answer") {
      const userAnswer = Array.isArray(answer.userAnswer) 
        ? answer.userAnswer[0] 
        : answer.userAnswer;

      return (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-sm font-medium text-muted-foreground mb-1">{t("quiz:your_answer")}:</p>
            <p className="text-sm">{userAnswer || t("common:no_data")}</p>
          </div>
          {question.correctAnswers && question.correctAnswers.length > 0 && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800">
              <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                {t("quiz:correct_answer")}(s):
              </p>
              <ul className="text-sm space-y-1">
                {question.correctAnswers.map((ans, idx) => (
                  <li key={idx}>• {ans}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-3">
      {questions.map((question, index) => {
        const answer = getAnswerForQuestion(question._id);
        const isExpanded = expandedQuestions.has(question._id);
        const isCorrect = answer?.isCorrect ?? false;
        const score = answer?.score ?? 0;
        const hasFeedback = answer?.feedback && answer.feedback.trim() !== "";

        return (
          <Card key={question._id} className="overflow-hidden">
            <CardContent className="p-0">
              <button
                onClick={() => toggleQuestion(question._id)}
                className="w-full p-4 text-left hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <span className="text-sm font-medium text-muted-foreground flex-shrink-0">
                          Q{index + 1}
                        </span>
                        <h3 className="text-sm font-medium flex-1">
                          {question.text}
                        </h3>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {isCorrect ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {t("quiz:correct")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400">
                            <XCircle className="w-3 h-3 mr-1" />
                            {t("quiz:incorrect")}
                          </Badge>
                        )}
                        
                        {hasFeedback && (
                          <Badge variant="outline" className="text-blue-700 dark:text-blue-400">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            {t("common:feedback")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <div className="text-lg font-semibold">
                      {score}
                      <span className="text-sm text-muted-foreground">
                        /{question.points}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {question.points === 1 ? t("quiz:point") : t("quiz:points_plural")}
                    </div>
                  </div>
                </div>
              </button>

              {isExpanded && answer && (
                <div className="border-t bg-muted/20 p-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-3">{t("quiz:your_answer")}:</h4>
                    {renderUserAnswer(question, answer)}
                  </div>

                  {hasFeedback && (
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                            {t("quiz:instructor_feedback")}
                          </p>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            {answer.feedback}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {canLeaveFeedback && (
                    <div className="pt-3 border-t space-y-2">
                      <Label htmlFor={`feedback-${question._id}`} className="text-sm font-medium">
                        {hasFeedback ? t("quiz:edit_instructor_feedback") : t("quiz:add_instructor_feedback")}
                      </Label>
                      <Textarea
                        id={`feedback-${question._id}`}
                        value={feedbacks[question._id] ?? answer.feedback ?? ""}
                        onChange={(e) => setFeedbacks(prev => ({ ...prev, [question._id]: e.target.value }))}
                        placeholder={t("quiz:add_feedback_placeholder")}
                        rows={3}
                        className="resize-none"
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleSaveFeedback(question._id)}
                          disabled={savingFeedback === question._id}
                        >
                          {savingFeedback === question._id ? t("common:saving") : t("quiz:save_feedback")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

