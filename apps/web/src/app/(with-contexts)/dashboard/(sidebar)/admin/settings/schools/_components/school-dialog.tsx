"use client";

import { FormMode } from "@/components/dashboard/layout/types";
import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Building2, Edit, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

// Validation schema
const schoolSchema = z
  .object({
    name: z
      .string()
      .min(1, "Subdomain is required")
      .max(50, "Subdomain too long"),
    customDomain: z.string().max(100, "Custom domain too long").optional(),
    email: z
      .string()
      .email("Invalid email address")
      .min(1, "Email is required"),
    title: z
      .string()
      .min(1, "School name is required")
      .max(100, "School name too long"),
    subtitle: z.string().max(200, "Description too long").optional(),
  })
  .refine(
    (data) => {
      // Either customDomain OR name must be set (or both)
      return data.customDomain || data.name;
    },
    {
      message: "Either subdomain or custom domain must be provided",
      path: ["customDomain"], // This will show the error on the customDomain field
    },
  );

type SchoolFormData = z.infer<typeof schoolSchema>;

interface SchoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  mode: FormMode;
  domain?: any; // Domain data for edit mode
}

export default function SchoolDialog({
  open,
  onOpenChange,
  onSuccess,
  mode,
  domain,
}: SchoolDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SchoolFormData>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: "",
      customDomain: "",
      email: "",
      title: "",
      subtitle: "",
    },
  });

  // Set form data when editing
  useEffect(() => {
    if (mode === "edit" && domain && open) {
      form.reset({
        name: domain.name || "",
        customDomain: domain.customDomain || "",
        email: domain.email || "",
        title: domain.settings?.title || "",
        subtitle: domain.settings?.subtitle || "",
      });
    } else if (mode === "create" && open) {
      form.reset({
        name: "",
        customDomain: "",
        email: "",
        title: "",
        subtitle: "",
      });
    }
  }, [mode, domain, open, form]);

  const createDomainMutation = trpc.siteModule.domain.create.useMutation({
    onSuccess: () => {
      toast({
        title: "School created",
        description: "The school has been successfully created.",
      });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create school",
        variant: "destructive",
      });
    },
  });

  const updateDomainMutation = trpc.siteModule.domain.update.useMutation({
    onSuccess: () => {
      toast({
        title: "School updated",
        description: "The school has been successfully updated.",
      });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update school",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: SchoolFormData) => {
    setIsSubmitting(true);
    try {
      if (mode === "create") {
        await createDomainMutation.mutateAsync({
          data: {
            name: data.name,
            customDomain: data.customDomain || undefined,
            email: data.email,
            settings: {
              title: data.title,
              subtitle: data.subtitle || undefined,
            },
          },
        });
      } else if (mode === "edit" && domain) {
        await updateDomainMutation.mutateAsync({
          id: domain._id,
          data: {
            name: data.name,
            customDomain: data.customDomain || undefined,
            email: data.email,
            settings: {
              title: data.title,
              subtitle: data.subtitle || undefined,
            },
          },
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  const isLoading =
    createDomainMutation.isPending ||
    updateDomainMutation.isPending ||
    isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "create" ? (
              <>
                <Plus className="w-5 h-5" />
                Add New School
              </>
            ) : (
              <>
                <Edit className="w-5 h-5" />
                Edit School
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new school/domain in your multi-tenant system. Each school will have its own subdomain."
              : "Update the school information and settings."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Subdomain *</FieldLabel>
                    <Input placeholder="school-name" {...field} aria-invalid={fieldState.invalid} />
                    <FieldDescription>
                      Will be accessible at: {field.value}.yourdomain.com
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="customDomain"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Custom Domain</FieldLabel>
                    <Input placeholder="school.com" {...field} aria-invalid={fieldState.invalid} />
                    <FieldDescription>Optional custom domain</FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Admin Email *</FieldLabel>
                  <Input
                    type="email"
                    placeholder="admin@school.com"
                    {...field}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="title"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>School Name *</FieldLabel>
                  <Input placeholder="School Name" {...field} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="subtitle"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>School Description</FieldLabel>
                  <Input
                    placeholder="Brief description of the school"
                    {...field}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading
                ? mode === "create"
                  ? "Creating..."
                  : "Updating..."
                : mode === "create"
                  ? "Create School"
                  : "Update School"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
