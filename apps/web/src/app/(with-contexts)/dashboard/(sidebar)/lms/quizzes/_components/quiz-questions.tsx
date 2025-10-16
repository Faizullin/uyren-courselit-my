"use client";

import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
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
  Edit,
  FileQuestion,
  MoreHorizontal,
  Plus,
  Trash2,
  X,
  List,
  LayoutDashboard,
  CheckSquare,
  Type,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import z from "zod";
import { useQuizContext } from "./quiz-context";

// Question types
const QUESTION_TYPES = {
  MULTIPLE_CHOICE: "multiple_choice",
  SHORT_ANSWER: "short_answer",
} as const;

type QuestionTypeEnum = typeof QUESTION_TYPES[keyof typeof QUESTION_TYPES];

// Base schema for common fields
const BaseQuestionSchema = z.object({
  text: z.string().min(1, "Question text is required").max(2000),
  type: z.enum([
    "multiple_choice", 
    "short_answer", 
  ]),
  points: z.number().min(1).max(100),
  explanation: z.string().optional(),
});

// Individual schemas for each question type
const MultipleChoiceSchema = BaseQuestionSchema.extend({
  type: z.literal("multiple_choice"),
  options: z.array(
    z.object({
      uid: z.string(),
      text: z.string().min(1, "Option text is required"),
      isCorrect: z.boolean(),
    })
  ).min(2, "At least 2 options are required"),
  correctAnswers: z.array(z.string()).optional(),
});
const ShortAnswerSchema = BaseQuestionSchema.extend({
  type: z.literal("short_answer"),
  correctAnswers: z.array(z.string().min(1, "Answer cannot be empty")).min(1, "At least one correct answer is required"),
  options: z.array(z.any()).optional(),
});

// Union schema for all question types
const QuestionSchema = z.discriminatedUnion("type", [
  MultipleChoiceSchema,
  ShortAnswerSchema,
]);

type QuestionType =
  GeneralRouterOutputs["lmsModule"]["quizModule"]["quizQuestions"]["list"]["items"][number];
type QuestionFormDataType = z.infer<typeof QuestionSchema>;

// Helper function to get default values based on question type
const getDefaultValues = (type: QuestionTypeEnum) => {
  const baseValues = {
    text: "",
    type: type,
    points: 5,
    explanation: "",
  };

  switch (type) {
    case "multiple_choice":
      return {
        ...baseValues,
        options: [
          { uid: generateUid(0), text: "", isCorrect: false },
          { uid: generateUid(1), text: "", isCorrect: false }
        ],
        correctAnswers: [],
      };
    case "short_answer":
      return {
        ...baseValues,
        correctAnswers: [""],
      };
    default:
      return baseValues;
  }
};

export default function QuizQuestions() {
  const { toast } = useToast();
  const { quiz, mode } = useQuizContext();
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionType | null>(null);
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
      },
    );
  const questions = loadQuestionsQuery.data?.items || [];



  const deleteQuestionMutation =
    trpc.lmsModule.quizModule.quizQuestions.delete.useMutation({
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Question deleted successfully",
        });
        loadQuestionsQuery.refetch();
        setSelectedQuestion(null);
      },
      onError: (error) => {
        toast({
          title: "Error",
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
      if (!confirm("Are you sure you want to delete this question?")) return;
      try {
        await deleteQuestionMutation.mutateAsync({
          id: question._id,
          quizId: quiz!._id!,
        });
        if (selectedQuestion?._id === question._id) {
          setSelectedQuestion(null);
        }
      } catch (error) {}
    },
    [deleteQuestionMutation, quiz, selectedQuestion],
  );

  const handleQuestionSelect = useCallback((question: QuestionType) => {
    setSelectedQuestion(question);
    setIsEditing(false);
  }, []);

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case "multiple_choice": return <CheckSquare className="h-4 w-4" />;
      case "short_answer": return <Type className="h-4 w-4" />;
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case "multiple_choice": return "Multiple Choice";
      case "short_answer": return "Short Answer";
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{questions.length} Questions</span>
          </div>
          <Badge variant="outline">
            Total Points: {totalPoints}
          </Badge>
        </div>
        <Button onClick={handleCreateQuestion}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Questions Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  <span className="font-medium">Questions</span>
                </div>
              </div>
              <ScrollArea className="h-[500px]">
                {questions.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <FileQuestion className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No questions yet</p>
                    <p className="text-sm">Add your first question to get started</p>
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
                                {question.points} pts
                              </Badge>
                              <Badge variant="secondary" className="text-xs capitalize">
                                {getQuestionTypeLabel(question.type)}
                              </Badge>
                            </div>
                            <p className="text-sm line-clamp-2">
                              {question.text}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditQuestion(question)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteQuestion(question)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Question Editor/Viewer */}
        <div className="lg:col-span-2">
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
            />
          ) : selectedQuestion ? (
            <QuestionViewer
              question={selectedQuestion}
              questionNumber={questions.findIndex(q => q._id === selectedQuestion._id) + 1}
              onEdit={() => handleEditQuestion(selectedQuestion)}
              getQuestionTypeLabel={getQuestionTypeLabel}
              getQuestionTypeIcon={getQuestionTypeIcon}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <LayoutDashboard className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Question Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Select a question from the sidebar or create a new one to get started
                </p>
                <Button onClick={handleCreateQuestion}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Question
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Safe type guards for question data
const isMultipleChoice = (question: any): question is { options: any[] } => 
  question.type === "multiple_choice" && Array.isArray(question.options);

const isShortAnswer = (question: any): question is { correctAnswers: string[] } => 
  question.type === "short_answer" && Array.isArray(question.correctAnswers);

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
  getQuestionTypeLabel: (type: string) => string;
  getQuestionTypeIcon: (type: string) => React.ReactNode;
}) {
  const renderQuestionContent = () => {
    if (isMultipleChoice(question)) {
      return (
        <div>
          <h4 className="font-medium mb-3">Answer Options</h4>
          <div className="space-y-2">
            {question.options?.map((option: any, index: number) => (
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
                  <span className={option.isCorrect ? "font-medium text-green-700 dark:text-green-300" : ""}>
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
            {question.correctAnswers?.map((answer: string, index: number) => (
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
    <Card>
      <CardContent className="p-6">
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
              <p className="text-gray-600 dark:text-gray-400">{question.explanation}</p>
            </div>
          )}

          {renderQuestionContent()}
        </div>
      </CardContent>
    </Card>
  );
}

// Fix the form type issues by using a more specific approach
interface QuestionEditorProps {
  question?: any;
  isEdit?: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

function QuestionEditor({ question, isEdit, onCancel, onSuccess }: QuestionEditorProps) {
  const { toast } = useToast();
  const { quiz } = useQuizContext();
  const [currentType, setCurrentType] = useState<QuestionTypeEnum>(
    question?.type || "multiple_choice"
  );

  const createQuestionMutation =
    trpc.lmsModule.quizModule.quizQuestions.create.useMutation({
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Question created successfully",
        });
        onSuccess();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const updateQuestionMutation =
    trpc.lmsModule.quizModule.quizQuestions.update.useMutation({
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Question updated successfully",
        });
        onSuccess();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  // Use dynamic default values based on question type
  const form = useForm<any>({
    resolver: zodResolver(QuestionSchema as any),
    defaultValues: getDefaultValues(currentType),
  });

  // Update form when question type changes
  useEffect(() => {
    if (!isEdit) {
      form.reset(getDefaultValues(currentType));
    }
  }, [currentType, form, isEdit]);

  const {
    fields: options,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({
    control: form.control,
    name: "options",
  });

  // Create a custom append function for correctAnswers
  const appendCorrectAnswer = useCallback(() => {
    const currentAnswers = form.getValues("correctAnswers") || [];
    form.setValue("correctAnswers", [...currentAnswers, ""]);
  }, [form]);

  const removeCorrectAnswer = useCallback((index: number) => {
    const currentAnswers = form.getValues("correctAnswers") || [];
    if (currentAnswers.length > 1) {
      const newAnswers = currentAnswers.filter((_: unknown, i: number) => i !== index);
      form.setValue("correctAnswers", newAnswers);
    }
  }, [form]);

  const {
    fields: blanks,
    append: appendBlank,
    remove: removeBlank,
  } = useFieldArray({
    control: form.control,
    name: "blanks",
  });

  const {
    fields: pairs,
    append: appendPair,
    remove: removePair,
  } = useFieldArray({
    control: form.control,
    name: "pairs",
  });

  const {
    fields: items,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    if (isEdit && question) {
      const formData: any = {
        text: question.text || "",
        type: question.type || "multiple_choice",
        points: question.points || 5,
        explanation: question.explanation || "",
      };

      // Set type-specific fields
      switch (question.type) {
        case "multiple_choice":
          formData.options = question.options?.map((opt: any, index: number) => ({
            uid: opt?.uid || generateUid(index),
            text: opt?.text || "",
            isCorrect: !!opt?.isCorrect,
          })) || [
            { uid: generateUid(0), text: "", isCorrect: false },
            { uid: generateUid(1), text: "", isCorrect: false }
          ];
          break;
        case "short_answer":
          formData.correctAnswers = question.correctAnswers || [""];
          break;
      }

      form.reset(formData);
      setCurrentType(question.type);
    }
  }, [isEdit, question, form]);
// In the handleSubmit function inside QuestionEditor component:

// In the handleSubmit function inside QuestionEditor component:

const handleSubmit = async (data: any) => {
  console.log("Form submitted with data:", data);
  
  // Try to get user ID from available sources
  const possibleUserIds = [
    quiz?.ownerId,
    // Add any other possible user ID properties that might exist
  ];
  
  const gradedById = possibleUserIds.find(id => id && id !== "") || "system";
  
  console.log("Using gradedById:", gradedById);
  
  // Transform data for API - include gradedById to fix validation error
  let questionData: any = {
    text: data.text,
    type: data.type,
    points: data.points,
    explanation: data.explanation,
    courseId: quiz!.courseId,
    gradedById: gradedById,
    options: [],
    correctAnswers: [],
  };

  // Add type-specific data
  switch (data.type) {
    case "multiple_choice":
      questionData.options = data.options
        ?.filter((opt: any) => opt.text.trim() !== "")
        .map((opt: any) => ({
          uid: opt.uid,
          text: opt.text,
          isCorrect: opt.isCorrect,
        })) || [];
      questionData.correctAnswers = data.options
        ?.filter((opt: any) => opt.isCorrect)
        .map((opt: any) => opt.uid) || [];
      break;
    case "short_answer":
      questionData.correctAnswers = data.correctAnswers?.filter(
        (answer: string) => answer.trim() !== "",
      ) || [];
      break;
  }

  console.log("Sending question data:", questionData);

  try {
    if (isEdit && question) {
      await updateQuestionMutation.mutateAsync({
        id: question._id,
        quizId: `${quiz!._id!}`,
        data: questionData,
      });
    } else {
      await createQuestionMutation.mutateAsync({
        quizId: `${quiz!._id!}`,
        data: questionData,
      });
    }
  } catch (error: any) {
    console.error("Error saving question:", error);
    toast({
      title: "Error",
      description: error.message || "Failed to save question",
      variant: "destructive",
    });
  }
};

  const handleTypeChange = (newType: QuestionTypeEnum) => {
    setCurrentType(newType);
    form.setValue("type", newType);
  };

  const addOption = () => {
    appendOption({ uid: generateUid(options.length), text: "", isCorrect: false });
  };

  const formState = form.watch();
  console.log("Current form state:", formState);

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {isEdit ? "Edit Question" : "Create New Question"}
              </h3>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createQuestionMutation.isPending || updateQuestionMutation.isPending}
                >
                  {createQuestionMutation.isPending || updateQuestionMutation.isPending 
                    ? "Saving..." 
                    : isEdit ? "Update Question" : "Create Question"}
                </Button>
              </div>
            </div>

            <div className="grid gap-6">
              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Text *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter your question"
                        rows={3}
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question Type *</FormLabel>
                      <Select
                        onValueChange={(value: QuestionTypeEnum) => {
                          field.onChange(value);
                          handleTypeChange(value);
                        }}
                        value={field.value}
                        disabled={isEdit} // Don't allow changing type when editing
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                          <SelectItem value="short_answer">Short Answer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="points"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="5"
                          min="1"
                          max="100"
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="explanation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Explanation (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Explain the correct answer..."
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Type-specific fields - Only show fields for the current question type */}
              {currentType === "multiple_choice" && (
                <MultipleChoiceFields
                  options={options}
                  addOption={addOption}
                  removeOption={removeOption}
                  form={form}
                />
              )}

              {currentType === "short_answer" && (
                <ShortAnswerFields
                  form={form}
                  appendCorrectAnswer={appendCorrectAnswer}
                  removeCorrectAnswer={removeCorrectAnswer}
                />
              )}
            </div>

          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// Multiple Choice Fields Component
function MultipleChoiceFields({
  options,
  addOption,
  removeOption,
  form,
}: {
  options: any[];
  addOption: () => void;
  removeOption: (index: number) => void;
  form: any;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FormLabel className="text-base">Answer Options *</FormLabel>
        <Button type="button" variant="outline" size="sm" onClick={addOption}>
          <Plus className="h-3 w-3 mr-1" />
          Add Option
        </Button>
      </div>
      <div className="space-y-3">
        {options.map((option, index) => (
          <div key={option.uid} className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs font-medium">
              {String.fromCharCode(65 + index)}
            </div>
            <FormField
              control={form.control}
              name={`options.${index}.text`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input {...field} placeholder={`Option ${index + 1}`} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`options.${index}.isCorrect`}
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormLabel className="text-sm font-normal">Correct</FormLabel>
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={options.length <= 2}
              onClick={() => removeOption(index)}
              className="h-8 w-8"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Select the checkbox next to the correct answer(s). Multiple correct answers are allowed.
      </p>
    </div>
  );
}


// Short Answer Fields Component
interface ShortAnswerFieldsProps {
  form: any;
  appendCorrectAnswer: () => void;
  removeCorrectAnswer: (index: number) => void;
}

function ShortAnswerFields({ form, appendCorrectAnswer, removeCorrectAnswer }: ShortAnswerFieldsProps) {
  const correctAnswers = form.watch("correctAnswers") || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FormLabel className="text-base">Correct Answers *</FormLabel>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={appendCorrectAnswer}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Answer
        </Button>
      </div>
      <div className="space-y-3">
        {correctAnswers.map((_: any, index: number) => (
          <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs font-medium">
              {index + 1}
            </div>
            <FormField
              control={form.control}
              name={`correctAnswers.${index}`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={`Correct answer ${index + 1}`}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
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
        Add multiple correct answers if the question accepts variations (case-insensitive matching).
      </p>
    </div>
  );
}

const generateUid = (index: number) => {
  return `uid-${Date.now()}-${index}`;
};