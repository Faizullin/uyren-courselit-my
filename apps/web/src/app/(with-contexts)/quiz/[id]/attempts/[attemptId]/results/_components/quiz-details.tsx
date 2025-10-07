"use client";

import { useProfile } from "@/components/contexts/profile-context";
import {
  getQuizAttemptDetails,
  saveTeacherFeedback,
} from "@/server/actions/quiz-attempt";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { checkPermission } from "@workspace/utils";
import {
  CheckCircle,
  ChevronUp,
  Eye,
  MessageSquare,
  XCircle,
  Star,
  Clock,
  Target,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";

interface QuizDetailsProps {
  attemptId: string;
}

interface Question {
  _id: string;
  text: string;
  type: string;
  points: number;
  options?: Array<{
    _id?: string;
    uid: string;
    text: string;
    isCorrect: boolean;
    order?: number;
  }>;
  correctAnswers?: string[];
}

interface Answer {
  questionId: string;
  userAnswer: any;
  isCorrect?: boolean;
  score: number;
  feedback: string;
  timeSpent: number;
}

interface QuizDetailsData {
  attemptId: string;
  quizTitle: string;
  totalPoints: number;
  passingScore: number;
  score: number;
  percentageScore: number;
  passed: boolean;
  status: string;
  startedAt: string;
  completedAt?: string;
  questions: Question[];
  answers: Answer[];
}

const feedbackSchema = z.object({
  feedback: z
    .string()
    .min(1, "Feedback is required")
    .max(500, "Feedback must be less than 500 characters"),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

export default function QuizDetails({ attemptId }: QuizDetailsProps) {
  const [details, setDetails] = useState<QuizDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState<string | null>(
    null,
  );
  const [savingFeedback, setSavingFeedback] = useState(false);
  const { profile } = useProfile();

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      feedback: "",
    },
  });

  const loadDetails = async () => {
    setIsLoading(true);
    try {
      const data = await getQuizAttemptDetails(attemptId);
      setDetails(data);
      setIsExpanded(true);
    } catch (error) {
      console.error("Failed to load quiz details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAnswer = (
    answer: any,
    type: string,
    options?: Array<{ _id?: string; uid: string; text: string }>,
  ) => {
    if (type === "multiple_choice" && Array.isArray(answer) && options) {
      const selectedOptions = answer.map((optionUid) => {
        const option = options.find((opt) => opt.uid === optionUid);
        return option?.text || `Option ${optionUid}`;
      });
      return selectedOptions.join(", ");
    }
    if (Array.isArray(answer)) {
      return answer.join(", ");
    }
    return String(answer || "");
  };

  const renderOptions = (question: Question, answer?: Answer) => {
    if (question.type !== "multiple_choice" || !question.options || !answer) {
      return null;
    }

    const userSelectedUids = Array.isArray(answer.userAnswer)
      ? answer.userAnswer
      : [answer.userAnswer];
    const correctUids = question.correctAnswers || [];

    return (
      <div className="mt-4 space-y-3">
        <div className="text-sm font-medium text-muted-foreground">
          All Options:
        </div>
        {question.options.map((option, index) => {
          const isSelected = userSelectedUids.includes(option.uid);
          const isCorrect = correctUids.includes(option.uid);

          let bgColor = "bg-muted/30";
          let borderColor = "border-border";
          let textColor = "text-foreground";
          let statusText = "";

          if (isSelected && isCorrect) {
            bgColor = "bg-green-50 dark:bg-green-950/20";
            borderColor = "border-green-300 dark:border-green-700";
            textColor = "text-green-800 dark:text-green-200";
            statusText = "✓ Correct choice";
          } else if (isSelected && !isCorrect) {
            bgColor = "bg-red-50 dark:bg-red-950/20";
            borderColor = "border-red-300 dark:border-red-700";
            textColor = "text-red-800 dark:text-red-200";
            statusText = "✗ Wrong choice";
          } else if (!isSelected && isCorrect) {
            bgColor = "bg-green-50 dark:bg-green-950/20";
            borderColor = "border-green-300 dark:border-green-700";
            textColor = "text-green-800 dark:text-green-200";
            statusText = "Correct answer";
          }

          return (
            <div
              key={option._id || option.uid}
              className={`p-4 rounded-lg border ${bgColor} ${borderColor} ${textColor} transition-colors duration-200`}
            >
              <div className="flex items-center gap-3">
                {isSelected && isCorrect && (
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                )}
                {isSelected && !isCorrect && (
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                )}
                {!isSelected && isCorrect && (
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                )}
                <span className="font-medium text-sm">
                  {String.fromCharCode(65 + index)}.
                </span>
                <span className="flex-1">{option.text}</span>
                <Badge
                  variant={isSelected ? "secondary" : "outline"}
                  className={`text-xs ${
                    isSelected && isCorrect
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                      : isSelected && !isCorrect
                        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                        : !isSelected && isCorrect
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                          : "bg-muted text-muted-foreground"
                  }`}
                >
                  {statusText}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const canLeaveFeedback =
    profile?.permissions &&
    (checkPermission(profile.permissions, [
      UIConstants.permissions.manageCourse,
    ]) ||
      checkPermission(profile.permissions, [
        UIConstants.permissions.manageAnyCourse,
      ]));

  const handleSaveFeedback = async (
    questionId: string,
    data: FeedbackFormData,
  ) => {
    setSavingFeedback(true);
    try {
      const result = await saveTeacherFeedback(
        attemptId,
        questionId,
        data.feedback,
      );
      if (result.success) {
        if (details) {
          const updatedDetails = {
            ...details,
            answers: details.answers.map((answer) =>
              answer.questionId === questionId
                ? { ...answer, feedback: data.feedback }
                : answer,
            ),
          };
          setDetails(updatedDetails);
        }
        form.reset();
        setFeedbackDialogOpen(null);
      } else {
        console.error("Failed to save feedback:", result.message);
      }
    } catch (error) {
      console.error("Error saving feedback:", error);
    } finally {
      setSavingFeedback(false);
    }
  };

  const openFeedbackDialog = (
    questionId: string,
    existingFeedback?: string,
  ) => {
    form.reset({ feedback: existingFeedback || "" });
    setFeedbackDialogOpen(questionId);
  };

  if (!isExpanded) {
    return (
      <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <Button
            onClick={loadDetails}
            disabled={isLoading}
            className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white px-8 py-4 text-lg font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Eye className="w-5 h-5 mr-2" />
            {isLoading ? "Loading..." : "View Question Details"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!details) {
    return (
      <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Failed to load details
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center justify-between text-2xl font-bold text-foreground">
          <span>Question Details</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white"
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {details.questions.map((question, index) => {
          const answer = details.answers.find(
            (a) => a.questionId === question._id,
          );
          const hasAnswer = !!answer;

          return (
            <div
              key={question._id}
              className="border border-border/50 rounded-xl p-6 bg-muted/20 hover:bg-muted/30 transition-colors duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-semibold text-lg text-foreground">
                      Question {index + 1}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {question.type.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-foreground leading-relaxed">
                    {question.text}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-6">
                  {hasAnswer ? (
                    <>
                      <div className="text-right">
                        <div className="text-lg font-bold text-foreground">
                          {answer.score}/{question.points}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {answer.isCorrect ? "Full points" : "Zero points"}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-right">
                        <div className="text-lg font-bold text-foreground">
                          0/{question.points}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Not answered
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {hasAnswer ? (
                  <>
                    <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                      <div className="text-sm">
                        <span className="font-medium text-muted-foreground">
                          Your Answer:
                        </span>
                        <span className="ml-2 text-foreground font-medium">
                          {formatAnswer(
                            answer.userAnswer,
                            question.type,
                            question.options,
                          )}
                        </span>
                      </div>
                    </div>

                    {renderOptions(question, answer)}

                    {answer.feedback && (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                          <span className="font-medium text-yellow-800 dark:text-yellow-200">
                            Teacher Feedback:
                          </span>
                        </div>
                        <p className="text-yellow-700 dark:text-yellow-300 leading-relaxed">
                          {answer.feedback}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 bg-muted/30 border border-border/50 rounded-lg">
                    <div className="text-sm">
                      <span className="font-medium text-muted-foreground">
                        Status:
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        Not answered
                      </span>
                    </div>
                  </div>
                )}

                {canLeaveFeedback && hasAnswer && (
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-muted-foreground">
                        Teacher Feedback:
                      </span>
                      <Dialog
                        open={feedbackDialogOpen === question._id}
                        onOpenChange={(open) =>
                          !open && setFeedbackDialogOpen(null)
                        }
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openFeedbackDialog(question._id, answer?.feedback)
                            }
                            className="border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            {answer?.feedback
                              ? "Edit Feedback"
                              : "Add Feedback"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Add Teacher Feedback</DialogTitle>
                          </DialogHeader>
                          <Form {...form}>
                            <form
                              onSubmit={form.handleSubmit((data) =>
                                handleSaveFeedback(question._id, data),
                              )}
                              className="space-y-4"
                            >
                              <FormField
                                control={form.control}
                                name="feedback"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Feedback</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        placeholder="Enter feedback for this answer..."
                                        className="min-h-[120px] resize-none"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="flex gap-3 pt-4">
                                <Button
                                  type="submit"
                                  disabled={savingFeedback}
                                  className="bg-brand-primary hover:bg-brand-primary-hover text-white"
                                >
                                  {savingFeedback
                                    ? "Saving..."
                                    : "Save Feedback"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setFeedbackDialogOpen(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
