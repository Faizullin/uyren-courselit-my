"use client";

import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { PublicationStatusEnum } from "@workspace/common-logic/lib/publication_status";
import { ThemeAssetTypeEnum } from "@workspace/common-logic/models/theme.types";
import { useToast } from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useThemeContext } from "./theme-context";

const ThemeSchema = z.object({
  name: z.string().min(1, "Theme name is required").max(255),
  description: z.string().optional(),
  publicationStatus: z.nativeEnum(PublicationStatusEnum),
});

type ThemeFormData = z.infer<typeof ThemeSchema>;

export default function ThemeSettings() {
  const { mode, theme } = useThemeContext();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<ThemeFormData>({
    resolver: zodResolver(ThemeSchema),
    defaultValues: {
      name: "",
      description: "",
      publicationStatus: PublicationStatusEnum.DRAFT,
    },
  });

  const createMutation = trpc.lmsModule.themeModule.theme.create.useMutation({
    onSuccess: (response) => {
      toast({
        title: "Success",
        description: "Theme created successfully",
      });
      router.push(`/dashboard/lms/themes/${response._id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = trpc.lmsModule.themeModule.theme.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Theme updated successfully",
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

  const handleSave = useCallback(async (data: ThemeFormData) => {
    if (mode === "create") {
      const defaultTheme = {
        name: data.name,
        description: data.description,
        publicationStatus: data.publicationStatus,
        stylesCss: `/* Default theme styles */`,
        assets: [
          {
            assetType: ThemeAssetTypeEnum.FONT,
            url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
            preload: true,
            rel: "stylesheet",
            name: "Inter Font",
            description: "Google Fonts Inter font family",
          },
        ],
      };
      await createMutation.mutateAsync({ data: defaultTheme });
    } else if (theme?._id) {
      await updateMutation.mutateAsync({
        id: `${theme._id}`,
        data,
      });
    }
  }, [mode, theme, createMutation, updateMutation]);

  useEffect(() => {
    if (theme && mode === "edit") {
      form.reset({
        name: theme.name || "",
        description: theme.description || "",
        publicationStatus: theme.publicationStatus || PublicationStatusEnum.DRAFT,
      });
    }
  }, [theme, mode, form]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6 mt-2">
      <Card>
        <CardHeader>
          <CardTitle>Theme Information</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Theme Name *</FieldLabel>
                  <Input
                    {...field}
                    placeholder="Enter theme name..."
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
              name="description"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Description</FieldLabel>
                  <Textarea
                    {...field}
                    placeholder="Enter theme description..."
                    rows={3}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <div className="pt-4">
              <Button
                type="submit"
                disabled={isSaving || !form.formState.isDirty}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : mode === "create" ? "Create Theme" : "Save Changes"}
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      {theme && (
        <Card>
          <CardHeader>
            <CardTitle>Theme Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <FieldLabel>Created</FieldLabel>
              <div className="text-sm text-muted-foreground">
                {new Date(theme.createdAt || "").toLocaleDateString()}
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel>Last Updated</FieldLabel>
              <div className="text-sm text-muted-foreground">
                {new Date(theme.updatedAt || "").toLocaleDateString()}
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel>Owner ID</FieldLabel>
              <div className="text-sm text-muted-foreground">
                {theme.ownerId}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </form>
  );
}
