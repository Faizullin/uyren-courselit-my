"use client";

import { FormMode } from "@/components/dashboard/layout/types";
import { useProfile } from "@/components/contexts/profile-context";
import { CommentEditorField } from "@/components/editors/tiptap/templates/comment/comment-editor";
import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import {
  ComboBox2,
  FormDialog,
  NiceModal,
  NiceModalHocProps,
  useDialogControl,
  useToast,
} from "@workspace/components-library";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { checkPermission } from "@workspace/utils";
import { useCallback, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const reviewSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.object({
    type: z.literal("doc"),
    content: z.string(),
    assets: z.array(z.object({
      url: z.string(),
      caption: z.string().optional(),
    })),
    widgets: z.array(z.object({
      type: z.string(),
      objectId: z.string(),
      title: z.string(),
      data: z.record(z.unknown()),
    })),
    config: z.object({
      editorType: z.union([z.literal("tiptap"), z.literal("text")]),
    }),
  }),
  rating: z.number().min(1).max(10),
  targetType: z.string().min(1),
  targetId: z.string().optional(),
  published: z.boolean(),
  featured: z.boolean(),
  authorId: z.string().optional(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormDialogProps extends NiceModalHocProps {
  mode: FormMode;
  reviewId?: string;
}

type UserItem = {
  _id: string;
  fullName: string;
  email: string;
};

export const ReviewFormDialog = NiceModal.create<
  ReviewFormDialogProps,
  { reason: "cancel" | "submit" }
>(({ mode, reviewId }) => {
  const { visible, hide, resolve } = NiceModal.useModal();
  const { toast } = useToast();
  const { profile } = useProfile();
  const trpcUtils = trpc.useUtils();

  const canManageSite = checkPermission(profile.permissions!, [
    UIConstants.permissions.manageSite,
  ]);

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      title: "",
      content: {
        type: "doc",
        content: "",
        assets: [],
        widgets: [],
        config: { editorType: "tiptap" },
      },
      rating: 5,
      targetType: "website",
      targetId: "",
      published: false,
      featured: false,
      authorId: "",
    },
  });

  const createMutation = trpc.lmsModule.reviewModule.review.create.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Review created successfully" });
      resolve({ reason: "submit" });
      hide();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = trpc.lmsModule.reviewModule.review.update.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Review updated successfully" });
      resolve({ reason: "submit" });
      hide();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const loadQuery = trpc.lmsModule.reviewModule.review.getByReviewId.useQuery(
    { reviewId: reviewId! },
    { enabled: mode === "edit" && !!reviewId },
  );

  useEffect(() => {
    const review = loadQuery.data;
    if (review && mode === "edit") {
      const content = review.content;
      const contentValue: ReviewFormData["content"] = {
        type: "doc",
        content: content?.content || "",
        assets: content?.assets?.map(a => ({
          url: a.url,
          caption: a.caption,
        })) || [],
        widgets: content?.widgets?.map(w => ({
          type: w.type,
          objectId: w.objectId,
          title: w.title,
          data: w.data,
        })) || [],
        config: { editorType: content?.config?.editorType || "tiptap" },
      };

      form.reset({
        title: review.title,
        content: contentValue,
        rating: review.rating,
        targetType: review.target?.entityType || "website",
        targetId: review.target?.entityId || "",
        published: review.published,
        featured: review.featured,
        authorId: review.authorId || "",
      });
    }
  }, [form, mode, loadQuery.data]);

  const handleSubmit = useCallback(async (data: ReviewFormData) => {
    const submitData = {
      title: data.title,
      rating: data.rating,
      content: data.content,
      targetType: data.targetType,
      targetId: data.targetId || undefined,
      featured: data.featured,
      published: data.published,
      tags: [],
      authorId: data.authorId && data.authorId.trim() !== "" ? data.authorId : undefined,
    };

    if (mode === "create") {
      await createMutation.mutateAsync({ data: submitData });
    } else if (mode === "edit" && reviewId) {
      await updateMutation.mutateAsync({
        data: submitData,
        id: reviewId,
      });
    }
  }, [mode, reviewId, createMutation, updateMutation]);

  const searchUsers = useCallback(async (search: string, offset: number, size: number): Promise<UserItem[]> => {
    const result = await trpcUtils.userModule.user.list.fetch({
      pagination: { skip: offset, take: size },
      search: search ? { q: search } : undefined,
    });
    return result.items.map(user => ({
      _id: user._id,
      fullName: user.fullName || user.email,
      email: user.email,
    }));
  }, [trpcUtils]);

  return (
    <FormDialog
      open={visible}
      onOpenChange={(open) => {
        if (!open) {
          hide();
          form.reset();
        }
      }}
      title={mode === "create" ? "Create Review" : "Edit Review"}
      onSubmit={form.handleSubmit(handleSubmit)}
      onCancel={() => {
        resolve({ reason: "cancel" });
        hide();
      }}
      isLoading={createMutation.isPending || updateMutation.isPending || form.formState.isSubmitting}
      submitText={mode === "create" ? "Create" : "Save"}
      cancelText="Cancel"
      maxWidth="xl"
    >
      <FieldGroup>
        <Controller
          control={form.control}
          name="title"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Title</FieldLabel>
              <Input
                {...field}
                placeholder="Enter review title"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <Controller
            control={form.control}
            name="rating"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="review-rating">Rating</FieldLabel>
                <div>
                  <Select
                    name={field.name}
                    value={field.value.toString()}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <SelectTrigger id="review-rating" aria-invalid={fieldState.invalid}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="item-aligned">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rating => (
                        <SelectItem key={rating} value={rating.toString()}>
                          ⭐ {rating}/10
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="targetType"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="target-type">Target Type</FieldLabel>
                <div>
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="target-type" aria-invalid={fieldState.invalid}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="item-aligned">
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="course">Course</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="blog">Blog</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>

        {canManageSite && (
          <Controller
            control={form.control}
            name="authorId"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Link to User (Optional)</FieldLabel>
                <ComboBox2<UserItem>
                  title="Select user"
                  valueKey="_id"
                  value={field.value ? { _id: field.value, fullName: "", email: "" } : undefined}
                  searchFn={searchUsers}
                  renderLabel={(item) => `${item.fullName} (${item.email})`}
                  onChange={(item) => field.onChange(item?._id || "")}
                  multiple={false}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        )}

        <Controller
          control={form.control}
          name="content"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Review Content</FieldLabel>
              <CommentEditorField
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                placeholder="Enter review content..."
                className="min-h-[120px]"
              />
              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <div className="flex items-center gap-6">
          <Controller
            control={form.control}
            name="published"
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Switch
                  id="published"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <FieldLabel htmlFor="published" className="cursor-pointer">Published</FieldLabel>
              </div>
            )}
          />

          <Controller
            control={form.control}
            name="featured"
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Switch
                  id="featured"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <FieldLabel htmlFor="featured" className="cursor-pointer">Featured</FieldLabel>
              </div>
            )}
          />
        </div>
      </FieldGroup>
    </FormDialog>
  );
});
