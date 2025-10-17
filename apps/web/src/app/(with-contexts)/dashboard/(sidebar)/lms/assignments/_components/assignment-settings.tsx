"use client";

import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { ComboBox2, useToast } from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
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
import { Textarea } from "@workspace/ui/components/textarea";
import { Switch } from "@workspace/ui/components/switch";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { useAssignmentContext } from "./assignment-context";

// Import the actual enum from your shared types
import { AssignmentTypeEnum } from "@workspace/common-logic/models/lms/assignment.types";

const AssignmentSettingsSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  course: z.object({
    _id: z.string(), // Use _id instead of key for MongoDB
    title: z.string(),
  }),
  instructions: z.string().optional(),
  totalPoints: z.number().min(1),
  dueDate: z.date().optional(),
  type: z.nativeEnum(AssignmentTypeEnum), // Use the imported enum
  beginDate: z.date().optional(), // Changed from availableFrom to beginDate
  allowLateSubmission: z.boolean(),
});

type AssignmentSettingsFormDataType = z.infer<typeof AssignmentSettingsSchema>;
type CourseSelectItemType = {
  _id: string; // Use _id instead of key
  title: string;
};

export default function AssignmentSettings() {
  const { assignment, mode } = useAssignmentContext();
  const router = useRouter();
  const { toast } = useToast();
  const trpcUtils = trpc.useUtils();

  const form = useForm<AssignmentSettingsFormDataType>({
    resolver: zodResolver(AssignmentSettingsSchema),
    defaultValues: {
      title: "",
      description: "",
      course: undefined as any,
      instructions: "",
      totalPoints: 100,
      beginDate: undefined,
      dueDate: undefined,
      type: AssignmentTypeEnum.PROJECT, // Use the actual enum value
      allowLateSubmission: false,
    },
  });

  const createMutation =
    trpc.lmsModule.assignmentModule.assignment.create.useMutation({
      onSuccess: (response) => {
        toast({
          title: "Success",
          description: "Assignment created successfully",
        });
        router.push(`/dashboard/lms/assignments/${response._id}`);
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const updateMutation =
    trpc.lmsModule.assignmentModule.assignment.update.useMutation({
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Assignment updated successfully",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const handleSubmit = useCallback(
    async (data: AssignmentSettingsFormDataType) => {
      console.log("Form data:", data);
      
      // Validate required fields
      if (!data.course?._id) {
        toast({
          title: "Error",
          description: "Please select a course",
          variant: "destructive",
        });
        return;
      }

      // Transform data to match API schema
      const apiData = {
        title: data.title,
        description: data.description,
        courseId: data.course._id, // Map to courseId
        type: data.type,
        instructions: data.instructions,
        totalPoints: data.totalPoints,
        beginDate: data.beginDate,
        dueDate: data.dueDate,
        allowLateSubmission: data.allowLateSubmission,
      };

      console.log("API data:", apiData);

      try {
        if (mode === "create") {
          await createMutation.mutateAsync({
            data: apiData,
          });
        } else if (mode === "edit" && assignment) {
          await updateMutation.mutateAsync({
            id: `${assignment._id}`,
            data: apiData,
          });
        }
      } catch (error) {
        console.error("Submission error:", error);
      }
    },
    [mode, assignment, createMutation, updateMutation, toast],
  );
  
  const fetchCourses = useCallback(
    async (search: string) => {
      try {
        const response = await trpcUtils.lmsModule.courseModule.course.list.fetch(
          {
            pagination: {
              take: 15,
              skip: 0,
            },
            search: {
              q: search,
            },
          },
        );
        // Check the actual structure of the course objects from your API
        return response.items.map((course) => ({
          _id: course._id, 
          title: course.title,
        }));
      } catch (error) {
        console.error("Error fetching courses:", error);
        return [];
      }
    },
    [trpcUtils],
  );

  useEffect(() => {
    if (assignment && mode === "edit") {
      // Check the actual structure of assignment.course
      const courseData = assignment.course ? {
        _id: (assignment.course as any)._id || assignment.courseId, // Fallback to courseId if _id doesn't exist
        title: assignment.course.title || "Unknown Course"
      } : undefined;

      form.reset({
        title: assignment.title || "",
        description: assignment.description || "",
        course: courseData,
        instructions: assignment.instructions || "",
        totalPoints: assignment.totalPoints || 100,
        beginDate: assignment.beginDate ? new Date(assignment.beginDate) : undefined,
        dueDate: assignment.dueDate ? new Date(assignment.dueDate) : undefined,
        type: assignment.type || AssignmentTypeEnum.PROJECT,
        allowLateSubmission: assignment.allowLateSubmission || false,
      });
    }
  }, [assignment, form, mode]);

  const handleCheckProject = useCallback(() => {
    const url = `${process.env.NEXT_PUBLIC_TUTOR_IDE_URL}/projects/init?externalAssignmentId=${assignment?._id}`;
    window.open(url, "_blank");
  }, [assignment?._id]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Helper function to get enum values for the select
  const getAssignmentTypeOptions = () => {
    return Object.values(AssignmentTypeEnum).map(value => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1).toLowerCase().replace('_', ' ')
    }));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Assignment Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter assignment title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter assignment description"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="course"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Associated Course</FormLabel>
                    <FormControl>
                      <ComboBox2<CourseSelectItemType>
                        title="Select a course"
                        valueKey="_id" // Use _id as the value key
                        value={field.value}
                        searchFn={fetchCourses}
                        renderLabel={(item: CourseSelectItemType) => item.title}
                        onChange={field.onChange}
                        multiple={false}
                        showCreateButton={true}
                        showEditButton={true}
                        onCreateClick={() => {
                          window.open(`/dashboard/products/new`, "_blank");
                        }}
                        onEditClick={(item: CourseSelectItemType) => {
                          window.open(
                            `/dashboard/products/${item._id}`,
                            "_blank",
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Instructions</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter detailed instructions for students"
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assignment Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="beginDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Available From</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? new Date(e.target.value)
                                : undefined,
                            )
                          }
                          value={
                            field.value
                              ? new Date(field.value).toISOString().slice(0, 16)
                              : ""
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="datetime-local"
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? new Date(e.target.value)
                                : undefined,
                            )
                          }
                          value={
                            field.value
                              ? new Date(field.value).toISOString().slice(0, 16)
                              : ""
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Assignment Type</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select assignment type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getAssignmentTypeOptions().map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex flex-col">
                  {
                    form.watch("type") === AssignmentTypeEnum.PROJECT && (
                      <Button variant="outline" className="w-full" size="sm" onClick={handleCheckProject}>
                        Check Project
                      </Button>
                    )
                  }
                </div>
              </div>
              <FormField
                control={form.control}
                name="allowLateSubmission"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Allow Late Submissions
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Students can submit after due date
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>
      </form>
    </Form>
  );
}