"use client";

import { removeLogo, uploadLogo } from "@/server/actions/site/media";
import { zodResolver } from "@hookform/resolvers/zod";
import { MediaSelector, useToast } from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useSettingsContext } from "./settings-context";
import { IAttachmentMedia } from "@workspace/common-logic/models/media.types";

const createGeneralSettingsSchema = (t: (key: string, params?: any) => string) => z.object({
  title: z.string().min(1, t("error:validation.required", { field: t("admin:settings.title") })),
  subtitle: z.string().optional(),
  aiHelperEnabled: z.boolean().optional(),
});

type GeneralSettingsFormData = z.infer<ReturnType<typeof createGeneralSettingsSchema>>;

export default function GeneralSettings() {
  const { settings, updateSettingsMutation, loadSettingsQuery } =
    useSettingsContext();
  const { toast } = useToast();
  const { t } = useTranslation(["admin", "common", "error"]);
  const [logo, setLogo] = useState<IAttachmentMedia | null>(null);

  const form = useForm<GeneralSettingsFormData>({
    resolver: zodResolver(createGeneralSettingsSchema(t)),
    defaultValues: {
      title: "",
      subtitle: "",
      aiHelperEnabled: false,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        title: settings.title || "",
        subtitle: settings.subtitle || "",
        aiHelperEnabled: settings.aiHelper?.enabled || false,
      });
      setLogo((settings.logo || null) as any);
    }
  }, [settings, form]);

  const onSubmit = async (data: GeneralSettingsFormData) => {
    try {
      await updateSettingsMutation.mutateAsync({
        data: {
          title: data.title,
          subtitle: data.subtitle,
          aiHelper: {
            enabled: data.aiHelperEnabled || false,
          },
        },
      });
      await loadSettingsQuery.refetch();
      toast({
        title: t("common:success"),
        description: t("common:toast.updated_successfully", { item: t("common:settings") }),
      });
    } catch (error) {
      toast({
        title: t("common:error"),
        description: t("common:error_occurred"),
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
                <FieldLabel>{t("admin:settings.title")}</FieldLabel>
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
                <FieldLabel>{t("admin:settings.subtitle")}</FieldLabel>
                <Input {...field} disabled={isDisabled} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <div>
            <Button
              type="submit"
              disabled={isDisabled}
              className="w-full sm:w-auto"
            >
              {isSaving || isSubmitting ? t("common:saving") : t("admin:settings.save_settings")}
            </Button>
          </div>
        </FieldGroup>
      </form>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t("admin:settings.logo")}</h3>
        <MediaSelector
            media={logo}
            onSelection={async (media) => {
              setLogo(media);
            }}
            onRemove={async () => {
              setLogo(null);
              await loadSettingsQuery.refetch();
            }}
            mimeTypesToShow={["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]}
            type="domain"
            strings={{
              buttonCaption: t("admin:settings.upload_image"),
            }}
            disabled={isDisabled}
            functions={{
              uploadFile: async (files: File[], _type: string, _storageProvider?: string, _caption?: string) => {
                const formData = new FormData();
                files.forEach(file => formData.append("file", file));
                
                const result = await uploadLogo(formData);
                if (!result.success) throw new Error(result.error);
                return result.media || [];
              },
              removeFile: async (mediaId: string) => {
                await removeLogo(mediaId);
            }
          }}
        />
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <h3 className="text-lg font-semibold">{t("dashboard:settings.ai_helper")}</h3>
        <Controller
          control={form.control}
          name="aiHelperEnabled"
          render={({ field }) => (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="aiHelperEnabled"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={isDisabled}
              />
              <FieldLabel htmlFor="aiHelperEnabled" className="font-normal cursor-pointer">
                {t("dashboard:settings.ai_helper_enabled")}
              </FieldLabel>
            </div>
          )}
        />
        <p className="text-sm text-muted-foreground">
          {t("dashboard:settings.ai_helper_enabled_desc")}
        </p>
        <div>
          <Button type="submit" disabled={isDisabled} className="w-full sm:w-auto">
            {isSaving || isSubmitting ? t("common:saving") : t("admin:settings.save_settings")}
          </Button>
        </div>
      </form>
    </div>
  );
}
