"use client";

import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@workspace/components-library";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Edit,
  FileQuestion,
  MoreHorizontal,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import z from "zod";
import { useQuizContext } from "./quiz-context";
import { GeneralRouterOutputs } from "@/server/api/types";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

// Base schema for common fields
const BaseQuestionSchema = z.object({
  text: z
    .string()
    .min(1, "Question text is required")
    .max(2000, "Question text must be less than 2000 characters"),
  type: z.enum(["multiple_choice", "short_answer"]),
  points: z
    .number()
    .min(1, "Points must be at least 1")
    .max(100, "Points cannot exceed 100"),
  explanation: z.string().optional(),
});

// Schema for create mode (no type-specific validation)
const CreateQuestionSchema = BaseQuestionSchema;

// Schema for edit mode (with type-specific validation)
const EditQuestionSchema = BaseQuestionSchema.extend({
  options: z
    .array(
      z.object({
        text: z.string().min(1, "Option text is required"),
        isCorrect: z.boolean(),
      }),
    )
    .optional(),
  correctAnswers: z.array(z.string()).optional(),
});

// Union type for both schemas
const QuestionSchema = z.union([CreateQuestionSchema, EditQuestionSchema]);
type QuestionType =
  GeneralRouterOutputs["lmsModule"]["quizModule"]["quizQuestions"]["listQuestions"]["items"][number];
type QuestionFormDataType = z.infer<typeof QuestionSchema>;

export default function QuizQuestions() {
  const { toast } = useToast();
  const { quiz, mode } = useQuizContext();

  const loadQuestionsQuery =
    trpc.lmsModule.quizModule.quizQuestions.listQuestions.useQuery(
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

  const createQuestionMutation =
    trpc.lmsModule.quizModule.quizQuestions.createQuestion.useMutation({
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Question created successfully",
        });
        loadQuestionsQuery.refetch();
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
    trpc.lmsModule.quizModule.quizQuestions.updateQuestion.useMutation({
      onSuccess: (response) => {
        toast({
          title: "Success",
          description: "Question updated successfully",
        });
        loadQuestionsQuery.refetch();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const deleteQuestionMutation =
    trpc.lmsModule.quizModule.quizQuestions.deleteQuestion.useMutation({
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Question deleted successfully",
        });
        loadQuestionsQuery.refetch();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const [editingQuestion, setEditingQuestion] = useState<QuestionType | null>(
    null,
  );
  const [editingDialogOpen, setEditingDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleEditQuestion = useCallback((obj: QuestionType) => {
    setEditingQuestion(obj);
    setEditingDialogOpen(true);
  }, []);

  const handleCreateQuestion = useCallback(() => {
    setEditingQuestion(null);
    setCreateDialogOpen(true);
  }, []);

  const handleDeleteQuestion = useCallback(
    async (obj: QuestionType) => {
      if (!confirm("Are you sure you want to delete this question?")) return;
      try {
        await deleteQuestionMutation.mutateAsync({
          id: `${obj._id}`,
          quizId: `${quiz!._id!}`,
        });
      } catch (error) {}
    },
    [deleteQuestionMutation.mutateAsync],
  );

  const isLoading =
    createQuestionMutation.isPending ||
    updateQuestionMutation.isPending ||
    deleteQuestionMutation.isPending;

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{questions.length} Questions</span>
          </div>
          <Badge variant="outline">
            Total Points: {questions.reduce((sum, q) => sum + q.points, 0)}
          </Badge>
        </div>
        <Button onClick={handleCreateQuestion}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>
      <Card className="p-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Points</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadQuestionsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Loading questions...
                  </TableCell>
                </TableRow>
              ) : questions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No questions yet. Add your first question using the form on
                    the left.
                  </TableCell>
                </TableRow>
              ) : (
                questions.map((question, index) => (
                  <TableRow key={question._id || question._id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {question.text?.substring(0, 50)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {question.type === "multiple_choice"
                          ? "Multiple Choice"
                          : question.type === "short_answer"
                            ? "Short Answer"
                            : "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>{question.points || 0}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditQuestion(question)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Question
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteQuestion(question)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Question
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Question Dialog */}
      <EditQuestionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false);
          loadQuestionsQuery.refetch();
        }}
      />

      {/* Edit Question Dialog */}
      <EditQuestionDialog
        question={editingQuestion}
        isEdit={true}
        open={editingDialogOpen}
        onOpenChange={setEditingDialogOpen}
        onSuccess={() => {
          setEditingDialogOpen(false);
          setEditingQuestion(null);
          loadQuestionsQuery.refetch();
        }}
      />
    </>
  );
}

function EditQuestionDialog({
  question,
  isEdit = false,
  open,
  onOpenChange,
  onSuccess,
}: {
  question?: any;
  isEdit?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { quiz } = useQuizContext();

  const createQuestionMutation =
    trpc.lmsModule.quizModule.quizQuestions.createQuestion.useMutation({
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
    trpc.lmsModule.quizModule.quizQuestions.updateQuestion.useMutation({
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

  const form = useForm<QuestionFormDataType>({
    resolver: zodResolver(isEdit ? EditQuestionSchema : CreateQuestionSchema),
    defaultValues: {
      text: "",
      type: "multiple_choice",
      points: 5,
      explanation: "",
      // Type-specific fields only for edit mode
      ...(isEdit && {
        options: [
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
        ],
        correctAnswers: [""],
      }),
    },
  });

  const {
    fields: options,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const {
    fields: correctAnswers,
    append: appendCorrectAnswer,
    remove: removeCorrectAnswer,
  } = useFieldArray({
    control: form.control,
    // name: "correctAnswers"
    name: "correctAnswers" as any,
  });

  // Watch for question type changes to reset type-specific fields
  const questionType = form.watch("type");
  useEffect(() => {
    if (open && isEdit) {
      if (questionType === "multiple_choice") {
        // Reset to multiple choice defaults
        form.setValue("options", [
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
        ]);
        form.setValue("correctAnswers", [""]);
      } else if (questionType === "short_answer") {
        // Reset to short answer defaults
        form.setValue("options", []);
        form.setValue("correctAnswers", [""]);
      }
    }
  }, [questionType, open, isEdit, form]);

  // Reset form when dialog opens/closes or question changes
  useEffect(() => {
    if (open && isEdit && question) {
      // Edit mode: populate with existing question data
      form.reset({
        text: question.text || "",
        type: question.type || "multiple_choice",
        points: question.points || 5,
        explanation: question.explanation || "",
        // Type-specific fields for edit mode
        options:
          question.options && question.options.length > 0
            ? question.options.map((opt: any) => ({
                text: typeof opt === "string" ? opt : opt?.text || "",
                isCorrect:
                  typeof opt === "object" ? opt?.isCorrect || false : false,
              }))
            : [],
        correctAnswers:
          question.correctAnswers && question.correctAnswers.length > 0
            ? question.correctAnswers
            : [""],
      });
    } else if (open && !isEdit) {
      // Create mode: reset to defaults (no type-specific fields)
      form.reset({
        text: "",
        type: "multiple_choice",
        points: 5,
        explanation: "",
        correctAnswers: [""],
      });
    }
  }, [open, isEdit, question, form]);

  const addOption = () => {
    append({ text: "", isCorrect: false });
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      remove(index);
    }
  };

  const handleSubmit = async (data: QuestionFormDataType) => {
    let questionData: any = {
      text: data.text,
      type: data.type,
      points: data.points,
      explanation: data.explanation,
      courseId: quiz!.courseId,
      options: [],
      correctAnswers: [],
    };

    // Only process type-specific fields in edit mode
    if (isEdit) {
      const typedData = data as z.infer<typeof EditQuestionSchema>;
      console.log("typedData", typedData);
      if (typedData.type === "multiple_choice" && typedData.options) {
        questionData.options = typedData.options.filter(
          (opt) => opt.text.trim() !== "",
        );
        questionData.correctAnswers = typedData.options
          .filter((opt) => opt.isCorrect)
          .map((opt: any) => opt.text);
      } else if (
        typedData.type === "short_answer" &&
        typedData.correctAnswers
      ) {
        questionData.correctAnswers = typedData.correctAnswers.filter(
          (answer) => answer.trim() !== "",
        );
      }
    }

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
    } catch (error) {
      // Error handling is done in mutation callbacks
    }
  };

  // Render functions for type-specific fields
  const renderMultipleChoiceFields = () => (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <FormLabel>Answer Options</FormLabel>
        <Button type="button" variant="outline" size="sm" onClick={addOption}>
          <Plus className="h-3 w-3 mr-1" />
          Add Option
        </Button>
      </div>
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={option.id} className="flex items-center gap-2">
            <FormField
              control={form.control}
              name={`options.${index}.text`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input {...field} placeholder={`Option ${index + 1}`} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`options.${index}.isCorrect`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
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
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Select the checkbox next to the correct answer
      </p>
    </div>
  );

  const renderShortAnswerFields = () => (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <FormLabel>Correct Answers</FormLabel>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => appendCorrectAnswer("")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Answer
        </Button>
      </div>
      <div className="space-y-2">
        {correctAnswers.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2">
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
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={correctAnswers.length <= 1}
              onClick={() => removeCorrectAnswer(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Add multiple correct answers if the question accepts variations
      </p>
    </div>
  );

  const renderTypeSpecificFields = () => {
    // In create mode, don't show any type-specific fields
    if (!isEdit) {
      return null;
    }

    // Only show type-specific fields in edit mode
    const currentType = form.watch("type");
    switch (currentType) {
      case "multiple_choice":
        return renderMultipleChoiceFields();
      case "short_answer":
        return renderShortAnswerFields();
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col">
        <ScrollArea className="w-full h-full px-3">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {isEdit ? "Edit Question" : "Add New Question"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the question details below."
                : "Create a new question for this quiz. Type-specific options can be configured after creation."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="flex flex-col flex-1"
            >
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 border-t border-b border-border/50">
                <FormField
                  control={form.control}
                  name="text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question Text</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Enter your question"
                          rows={3}
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
                        <FormLabel>Question Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isEdit} // Readonly on edit
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="multiple_choice">
                              Multiple Choice
                            </SelectItem>
                            <SelectItem value="short_answer">
                              Short Answer
                            </SelectItem>
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
                        <FormLabel>Points</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder="5"
                            min="1"
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

                {/* Type-specific fields - only show in edit mode or when type is selected */}
                {renderTypeSpecificFields()}
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createQuestionMutation.isPending ||
                    updateQuestionMutation.isPending
                  }
                >
                  {isEdit ? "Update Question" : "Add Question"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
