"use client";

import { uploadLogo } from "@/server/actions/site/media";
import { zodResolver } from "@hookform/resolvers/zod";
import { MediaSelector, useToast } from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useSettingsContext } from "./settings-context";

const generalSettingsSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
});

type GeneralSettingsFormData = z.infer<typeof generalSettingsSchema>;

export default function GeneralSettings() {
  const { settings, updateSettingsMutation, loadSettingsQuery } =
    useSettingsContext();
  const { toast } = useToast();
  const [logo, setLogo] = useState<any>(null);

  const form = useForm<GeneralSettingsFormData>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      title: "",
      subtitle: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        title: settings.title || "",
        subtitle: settings.subtitle || "",
      });
      setLogo(settings.logo || null);
    }
  }, [settings, form]);

  const onSubmit = async (data: GeneralSettingsFormData) => {
    try {
      await updateSettingsMutation.mutateAsync({
        data: {
          title: data.title,
          subtitle: data.subtitle,
        },
      });
      await loadSettingsQuery.refetch();
      toast({
        title: "Success",
        description: "Settings saved",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  const isSubmitting = form.formState.isSubmitting;
  const isSaving = updateSettingsMutation.isPending;
  const isLoading = loadSettingsQuery.isLoading;
  const isDisabled = isLoading || isSaving || isSubmitting;

  return (
    <div className="space-y-8">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FieldGroup>
          <Controller
            control={form.control}
            name="title"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Title</FieldLabel>
                <Input {...field} required disabled={isDisabled} aria-invalid={fieldState.invalid} />
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
                <FieldLabel>Subtitle</FieldLabel>
                <Input {...field} disabled={isDisabled} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Button
            type="submit"
            disabled={isDisabled}
            className="w-full sm:w-auto"
          >
            {isSaving || isSubmitting ? "Saving..." : "Save Settings"}
          </Button>
        </FieldGroup>
      </form>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Logo</h3>
        <MediaSelector
          media={logo}
          onSelection={async (media) => {
            await loadSettingsQuery.refetch();
          }}
          onRemove={async () => {
            setLogo(null);
            await loadSettingsQuery.refetch();
          }}
          mimeTypesToShow={[
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/webp",
            "image/gif",
          ]}
          type="domain"
          disabled={isDisabled}
          strings={{
            buttonCaption: "Upload",
            removeButtonCaption: "Remove",
          }}
          functions={{
            uploadFile: async (files: File[]) => {
              const formData = new FormData();
              files.forEach(file => formData.append("file", file));
              
              const result = await uploadLogo(formData);
              if (!result.success) throw new Error(result.error);
              return result.media || [];
            },
            removeFile: async (mediaId: string) => {
              await loadSettingsQuery.refetch();
            }
          }}
        />
      </div>
    </div>
  );
}
