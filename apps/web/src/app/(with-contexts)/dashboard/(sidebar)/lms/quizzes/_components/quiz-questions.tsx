"use client";

import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { QuestionTypeEnum } from "@workspace/common-logic/models/lms/quiz.types";
import { useToast } from "@workspace/components-library";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  CheckSquare,
  Edit,
  FileQuestion,
  LayoutDashboard,
  List,
  MoreHorizontal,
  Plus,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Controller, UseFormReturn, useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import z from "zod";
import { useQuizContext } from "./quiz-context";

// Base schema for common fields
const BaseQuestionSchema = z.object({
  text: z.string().min(1, "Question text is required").max(2000),
  type: z.nativeEnum(QuestionTypeEnum),
  points: z.number().min(1).max(100),
  explanation: z.string().optional(),
});

// Individual schemas for each question type
const MultipleChoiceSchema = BaseQuestionSchema.extend({
  type: z.literal(QuestionTypeEnum.MULTIPLE_CHOICE),
  options: z
    .array(
      z.object({
        uid: z.string(),
        text: z.string().min(1, "Option text is required"),
        isCorrect: z.boolean(),
      })
    )
    .min(2, "At least 2 options are required"),
  correctAnswers: z.array(z.string()).optional(),
});

const ShortAnswerSchema = BaseQuestionSchema.extend({
  type: z.literal(QuestionTypeEnum.SHORT_ANSWER),
  correctAnswers: z
    .array(z.string().min(1, "Answer cannot be empty"))
    .min(1, "At least one correct answer is required"),
});

// Union schema for all question types
const QuestionSchema = z.discriminatedUnion("type", [
  MultipleChoiceSchema,
  ShortAnswerSchema,
]);

type QuestionType =
  GeneralRouterOutputs["lmsModule"]["quizModule"]["quizQuestions"]["list"]["items"][number];
type QuestionFormDataType = z.infer<typeof QuestionSchema>;

type OptionType = { uid: string; text: string; isCorrect: boolean };

const generateUid = (index: number) => `uid-${Date.now()}-${index}`;

const getDefaultValues = (
  type: QuestionTypeEnum
): QuestionFormDataType => {
  const baseValues = {
    text: "",
    type: type,
    points: 5,
    explanation: "",
  };

  switch (type) {
    case QuestionTypeEnum.MULTIPLE_CHOICE:
      return {
        ...baseValues,
        type: QuestionTypeEnum.MULTIPLE_CHOICE,
        options: [
          { uid: generateUid(0), text: "", isCorrect: false },
          { uid: generateUid(1), text: "", isCorrect: false },
        ],
        correctAnswers: [],
      };
    case QuestionTypeEnum.SHORT_ANSWER:
      return {
        ...baseValues,
        type: QuestionTypeEnum.SHORT_ANSWER,
        correctAnswers: [""],
      };
  }
};

export default function QuizQuestions() {
  const { toast } = useToast();
  const { quiz, mode } = useQuizContext();
  const { t } = useTranslation(["dashboard", "common"]);
  const trpcUtils = trpc.useUtils();
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionType | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);

  const loadQuestionsQuery =
    trpc.lmsModule.quizModule.quizQuestions.list.useQuery(
      {
        filter: {
          quizId: `${quiz?._id!}`,
        },
        pagination: { skip: 0, take: 100 },
      },
      {
        enabled: !!quiz?._id && mode === "edit",
      }
    );

  const questions = loadQuestionsQuery.data?.items || [];

  const deleteQuestionMutation =
    trpc.lmsModule.quizModule.quizQuestions.delete.useMutation({
      onSuccess: async () => {
        toast({
          title: t("common:success"),
          description: t("dashboard:lms.quiz.toast.question_deleted"),
        });
        await trpcUtils.lmsModule.quizModule.quizQuestions.list.invalidate();
        setSelectedQuestion(null);
      },
      onError: (error) => {
        toast({
          title: t("common:error"),
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const handleCreateQuestion = useCallback(() => {
    setSelectedQuestion(null);
    setIsEditing(true);
  }, []);

  const handleEditQuestion = useCallback((question: QuestionType) => {
    setSelectedQuestion(question);
    setIsEditing(true);
  }, []);

  const handleDeleteQuestion = useCallback(
    async (question: QuestionType) => {
      if (!confirm(t("dashboard:lms.quiz.delete_question_confirm"))) return;
      await deleteQuestionMutation.mutateAsync({
        id: question._id,
        quizId: quiz!._id!,
      });
      if (selectedQuestion?._id === question._id) {
        setSelectedQuestion(null);
      }
    },
    [deleteQuestionMutation, quiz, selectedQuestion, t]
  );

  const handleQuestionSelect = useCallback((question: QuestionType) => {
    setSelectedQuestion(question);
    setIsEditing(false);
  }, []);

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  const getQuestionTypeIcon = (type: QuestionTypeEnum) => {
    switch (type) {
      case QuestionTypeEnum.MULTIPLE_CHOICE:
        return <CheckSquare className="h-4 w-4" />;
      case QuestionTypeEnum.SHORT_ANSWER:
        return <Type className="h-4 w-4" />;
      default:
        return <FileQuestion className="h-4 w-4" />;
    }
  };

  const getQuestionTypeLabel = (type: QuestionTypeEnum) => {
    switch (type) {
      case QuestionTypeEnum.MULTIPLE_CHOICE:
        return t("dashboard:lms.quiz.questions.types.multiple_choice");
      case QuestionTypeEnum.SHORT_ANSWER:
        return t("dashboard:lms.quiz.questions.types.short_answer");
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <FileQuestion className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">{questions.length} {t("dashboard:lms.quiz.questions.title")}</span>
        </div>
        <Badge variant="outline">{t("dashboard:lms.quiz.settings.total_points")}: {totalPoints}</Badge>
      </div>

      {/* Single Card Wrapper */}
      <Card className="p-0">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[600px]">
            {/* Questions Sidebar */}
            <div className="lg:col-span-1 border-r">
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    <span className="font-medium">{t("dashboard:lms.quiz.questions.title")}</span>
                  </div>
                  <Button onClick={handleCreateQuestion} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    {t("common:add")}
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[calc(600px-57px)]">
                {questions.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <FileQuestion className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t("dashboard:lms.quiz.questions.no_questions")}</p>
                    <p className="text-sm">{t("dashboard:lms.quiz.questions.no_questions_desc")}</p>
                  </div>
                ) : (
                  <div className="p-2">
                    {questions.map((question, index) => (
                      <div
                        key={question._id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                          selectedQuestion?._id === question._id
                            ? "bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent"
                        }`}
                        onClick={() => handleQuestionSelect(question)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                Q{index + 1}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {question.points} {t("dashboard:lms.assignment.grading.pts")}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {getQuestionTypeLabel(question.type)}
                              </Badge>
                            </div>
                            <p className="text-sm line-clamp-2">
                              {question.text}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEditQuestion(question)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                {t("common:edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteQuestion(question)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t("common:delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Question Editor/Viewer */}
            <div className="lg:col-span-2 bg-muted/10">
              {isEditing ? (
                <QuestionEditor
                  question={selectedQuestion}
                  isEdit={!!selectedQuestion}
                  onCancel={() => {
                    setIsEditing(false);
                    if (!selectedQuestion) {
                      setSelectedQuestion(null);
                    }
                  }}
                  onSuccess={() => {
                    setIsEditing(false);
                    if (!selectedQuestion && questions.length > 0) {
                      const lastQuestion = questions[questions.length - 1];
                      if (lastQuestion) {
                        setSelectedQuestion(lastQuestion);
                      }
                    }
                  }}
                  getQuestionTypeIcon={getQuestionTypeIcon}
                  getQuestionTypeLabel={getQuestionTypeLabel}
                />
              ) : selectedQuestion ? (
                <QuestionViewer
                  question={selectedQuestion}
                  questionNumber={
                    questions.findIndex((q) => q._id === selectedQuestion._id) +
                    1
                  }
                  onEdit={() => handleEditQuestion(selectedQuestion)}
                  getQuestionTypeLabel={getQuestionTypeLabel}
                  getQuestionTypeIcon={getQuestionTypeIcon}
                />
              ) : (
                <div className="p-8 text-center h-full flex flex-col items-center justify-center">
                  <LayoutDashboard className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">{t("dashboard:lms.quiz.questions.no_questions")}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t("dashboard:lms.quiz.questions.no_questions_desc")}
                  </p>
                  <Button onClick={handleCreateQuestion}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("dashboard:lms.quiz.questions.add_question")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Type guards
const isMultipleChoice = (
  question: QuestionType
): question is QuestionType & { options: OptionType[] } =>
  question.type === QuestionTypeEnum.MULTIPLE_CHOICE &&
  Array.isArray(question.options);

const isShortAnswer = (
  question: QuestionType
): question is QuestionType & { correctAnswers: string[] } =>
  question.type === QuestionTypeEnum.SHORT_ANSWER &&
  Array.isArray(question.correctAnswers);

function QuestionViewer({
  question,
  questionNumber,
  onEdit,
  getQuestionTypeLabel,
  getQuestionTypeIcon,
}: {
  question: QuestionType;
  questionNumber: number;
  onEdit: () => void;
  getQuestionTypeLabel: (type: QuestionTypeEnum) => string;
  getQuestionTypeIcon: (type: QuestionTypeEnum) => React.ReactNode;
}) {
  const renderQuestionContent = () => {
    if (isMultipleChoice(question)) {
      return (
        <div>
          <h4 className="font-medium mb-3">Answer Options</h4>
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <div
                key={option.uid || index}
                className={`p-3 rounded-lg border ${
                  option.isCorrect
                    ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs ${
                      option.isCorrect
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-gray-400 dark:border-gray-600"
                    }`}
                  >
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span
                    className={
                      option.isCorrect
                        ? "font-medium text-green-700 dark:text-green-300"
                        : ""
                    }
                  >
                    {option.text}
                  </span>
                  {option.isCorrect && (
                    <Badge variant="default" className="ml-auto">
                      Correct
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (isShortAnswer(question)) {
      return (
        <div>
          <h4 className="font-medium mb-3">Correct Answers</h4>
          <div className="space-y-2">
            {question.correctAnswers?.map((answer, index) => (
              <div
                key={index}
                className="p-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full border border-green-500 bg-green-500 flex items-center justify-center text-xs text-white">
                    {index + 1}
                  </div>
                  <span className="font-medium text-green-700 dark:text-green-300">
                    {answer}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {questionNumber}
            </span>
          </div>
          <div>
            <h3 className="font-semibold">Question {questionNumber}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{question.points} points</Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                {getQuestionTypeIcon(question.type)}
                {getQuestionTypeLabel(question.type)}
              </Badge>
            </div>
          </div>
        </div>
        <Button onClick={onEdit} variant="outline">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="font-medium mb-2">Question Text</h4>
          <p className="text-gray-700 dark:text-gray-300">{question.text}</p>
        </div>

        {question.explanation && (
          <div>
            <h4 className="font-medium mb-2">Explanation</h4>
            <p className="text-gray-600 dark:text-gray-400">
              {question.explanation}
            </p>
          </div>
        )}

        {renderQuestionContent()}
      </div>
    </div>
  );
}

interface QuestionEditorProps {
  question?: QuestionType | null;
  isEdit?: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  getQuestionTypeIcon: (type: QuestionTypeEnum) => React.ReactNode;
  getQuestionTypeLabel: (type: QuestionTypeEnum) => string;
}

function QuestionEditor({
  question,
  isEdit,
  onCancel,
  onSuccess,
  getQuestionTypeIcon,
  getQuestionTypeLabel,
}: QuestionEditorProps) {
  const { toast } = useToast();
  const { quiz } = useQuizContext();
  const { t } = useTranslation(["dashboard", "common"]);
  const trpcUtils = trpc.useUtils();
  const [currentType, setCurrentType] = useState<QuestionTypeEnum>(
    question?.type || QuestionTypeEnum.MULTIPLE_CHOICE
  );

  const createQuestionMutation =
    trpc.lmsModule.quizModule.quizQuestions.create.useMutation({
      onSuccess: async () => {
        toast({
          title: t("common:success"),
          description: t("dashboard:lms.quiz.toast.question_created"),
        });
        await trpcUtils.lmsModule.quizModule.quizQuestions.list.invalidate();
        onSuccess();
      },
      onError: (error) => {
        toast({
          title: t("common:error"),
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const updateQuestionMutation =
    trpc.lmsModule.quizModule.quizQuestions.update.useMutation({
      onSuccess: async () => {
        toast({
          title: t("common:success"),
          description: t("dashboard:lms.quiz.toast.question_updated"),
        });
        await trpcUtils.lmsModule.quizModule.quizQuestions.list.invalidate();
        onSuccess();
      },
      onError: (error) => {
        toast({
          title: t("common:error"),
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const form = useForm<QuestionFormDataType>({
    resolver: zodResolver(QuestionSchema),
    defaultValues: getDefaultValues(currentType),
  });

  const { fields: options, append: addOption, remove: removeOption } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const {
    fields: correctAnswersFields,
    append: appendCorrectAnswer,
    remove: removeCorrectAnswer,
  } = useFieldArray({
    control: form.control,
    name: "correctAnswers" as never,
  });

  useEffect(() => {
    if (question && isEdit) {
      const formData: QuestionFormDataType =
        question.type === QuestionTypeEnum.MULTIPLE_CHOICE
          ? {
              text: question.text,
              type: QuestionTypeEnum.MULTIPLE_CHOICE,
              points: question.points,
              explanation: question.explanation || "",
              options: question.options || [],
              correctAnswers: question.correctAnswers || [],
            }
          : {
              text: question.text,
              type: QuestionTypeEnum.SHORT_ANSWER,
              points: question.points,
              explanation: question.explanation || "",
              correctAnswers: question.correctAnswers || [""],
            };

      form.reset(formData);
      setCurrentType(question.type);
    }
  }, [question, isEdit, form]);

  const handleTypeChange = (newType: QuestionTypeEnum) => {
    setCurrentType(newType);
    form.reset(getDefaultValues(newType));
  };

  const handleSubmit = useCallback(
    async (data: QuestionFormDataType) => {
      const baseData = {
        text: data.text,
        type: data.type,
        points: data.points,
        explanation: data.explanation,
      };

      const transformedData = data.type === QuestionTypeEnum.MULTIPLE_CHOICE
        ? {
            ...baseData,
            options: data.options,
            correctAnswers: data.options
              ?.filter((opt) => opt.isCorrect)
              .map((opt) => opt.uid),
          }
        : {
            ...baseData,
            correctAnswers: data.correctAnswers,
          };

      if (isEdit && question) {
        await updateQuestionMutation.mutateAsync({
          id: question._id,
          quizId: quiz!._id!,
          data: transformedData,
        });
      } else {
        await createQuestionMutation.mutateAsync({
          quizId: quiz!._id!,
          data: transformedData,
        });
      }
    },
    [
      isEdit,
      question,
      quiz,
      createQuestionMutation,
      updateQuestionMutation,
    ]
  );

  const isSaving =
    createQuestionMutation.isPending || updateQuestionMutation.isPending;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">
          {isEdit ? t("common:edit") : t("common:create")} {t("dashboard:lms.quiz.questions.title")}
        </h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FieldGroup>
          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="type"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="question-type">{t("dashboard:lms.quiz.questions.question_type")} *</FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => handleTypeChange(value as QuestionTypeEnum)}
                    disabled={isEdit}
                  >
                    <SelectTrigger id="question-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={QuestionTypeEnum.MULTIPLE_CHOICE}>
                        <div className="flex items-center gap-2">
                          {getQuestionTypeIcon(QuestionTypeEnum.MULTIPLE_CHOICE)}
                          {getQuestionTypeLabel(QuestionTypeEnum.MULTIPLE_CHOICE)}
                        </div>
                      </SelectItem>
                      <SelectItem value={QuestionTypeEnum.SHORT_ANSWER}>
                        <div className="flex items-center gap-2">
                          {getQuestionTypeIcon(QuestionTypeEnum.SHORT_ANSWER)}
                          {getQuestionTypeLabel(QuestionTypeEnum.SHORT_ANSWER)}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="points"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="question-points">{t("common:points")} *</FieldLabel>
                  <Input
                    {...field}
                    id="question-points"
                    type="number"
                    placeholder="5"
                    min="1"
                    max="100"
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value) || 0)
                    }
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="text"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="question-text">{t("dashboard:lms.quiz.questions.question_text")} *</FieldLabel>
                <Textarea
                  {...field}
                  id="question-text"
                  placeholder={t("dashboard:lms.quiz.questions.question_text_placeholder")}
                  rows={3}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="explanation"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="question-explanation">{t("dashboard:lms.quiz.questions.explanation")}</FieldLabel>
                <Textarea
                  {...field}
                  id="question-explanation"
                  placeholder={t("dashboard:lms.quiz.questions.explanation_placeholder")}
                  rows={2}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* Type-specific fields */}
          {currentType === QuestionTypeEnum.MULTIPLE_CHOICE && (
            <MultipleChoiceFields
              options={options}
              addOption={() => addOption({ uid: generateUid(options.length), text: "", isCorrect: false })}
              removeOption={removeOption}
              form={form}
            />
          )}

          {currentType === QuestionTypeEnum.SHORT_ANSWER && (
            <ShortAnswerFields
              form={form}
              appendCorrectAnswer={() => appendCorrectAnswer("")}
              removeCorrectAnswer={removeCorrectAnswer}
            />
          )}
        </FieldGroup>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("common:cancel")}
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? t("common:saving") : t("common:save")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function MultipleChoiceFields({
  options,
  addOption,
  removeOption,
  form,
}: {
  options: OptionType[];
  addOption: () => void;
  removeOption: (index: number) => void;
  form: UseFormReturn<QuestionFormDataType>;
}) {
  const { t } = useTranslation(["dashboard", "common"]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FieldLabel className="text-base">{t("dashboard:lms.quiz.questions.options")} *</FieldLabel>
        <Button type="button" variant="outline" size="sm" onClick={addOption}>
          <Plus className="h-3 w-3 mr-1" />
          {t("dashboard:lms.quiz.questions.add_option")}
        </Button>
      </div>
      <div className="space-y-3">
        {options.map((option, index) => (
          <div
            key={option.uid}
            className="flex items-start gap-3 p-3 border rounded-lg"
          >
            <div className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-2">
              {String.fromCharCode(65 + index)}
            </div>
            <div className="flex-1 space-y-2">
              <Controller
                control={form.control}
                name={`options.${index}.text`}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <Input
                      {...field}
                      id={`option-${index}-text`}
                      placeholder={t("dashboard:lms.quiz.questions.option_placeholder", { number: index + 1 })}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name={`options.${index}.isCorrect`}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <input
                      id={`option-${index}-correct`}
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <FieldLabel htmlFor={`option-${index}-correct`} className="text-sm font-normal cursor-pointer">
                      {t("dashboard:lms.quiz.questions.mark_correct")}
                    </FieldLabel>
                  </div>
                )}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={options.length <= 2}
              onClick={() => removeOption(index)}
              className="h-8 w-8 flex-shrink-0 mt-2"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Select the checkbox next to the correct answer(s). Multiple correct
        answers are allowed.
      </p>
    </div>
  );
}

function ShortAnswerFields({
  form,
  appendCorrectAnswer,
  removeCorrectAnswer,
}: {
  form: UseFormReturn<QuestionFormDataType>;
  appendCorrectAnswer: () => void;
  removeCorrectAnswer: (index: number) => void;
}) {
  const { t } = useTranslation(["dashboard", "common"]);
  const correctAnswers = form.watch("correctAnswers") || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FieldLabel className="text-base">{t("dashboard:lms.quiz.questions.correct_answers")} *</FieldLabel>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={appendCorrectAnswer}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("dashboard:lms.quiz.questions.add_answer")}
        </Button>
      </div>
      <div className="space-y-3">
        {correctAnswers.map((_answer, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 border rounded-lg"
          >
            <div className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs font-medium">
              {index + 1}
            </div>
            <Controller
              control={form.control}
              name={`correctAnswers.${index}`}
              render={({ field, fieldState }) => (
                <Field className="flex-1" data-invalid={fieldState.invalid}>
                  <Input
                    {...field}
                    id={`correct-answer-${index}`}
                    placeholder={t("dashboard:lms.quiz.questions.answer_placeholder", { number: index + 1 })}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={correctAnswers.length <= 1}
              onClick={() => removeCorrectAnswer(index)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Add multiple correct answers if the question accepts variations
        (case-insensitive matching).
      </p>
    </div>
  );
}
