"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Textarea } from "@workspace/ui/components/textarea";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useSettingsContext } from "./settings-context";

const customizationsSettingsSchema = z.object({
  codeInjectionHead: z.string().optional(),
  codeInjectionBody: z.string().optional(),
});

type CustomizationsSettingsFormData = z.infer<
  typeof customizationsSettingsSchema
>;

export default function CustomizationsSettings() {
  const { settings, updateSettingsMutation, loadSettingsQuery } =
    useSettingsContext();
  const { toast } = useToast();
  const { t } = useTranslation(["admin", "common"]);

  const form = useForm<CustomizationsSettingsFormData>({
    resolver: zodResolver(customizationsSettingsSchema),
    defaultValues: {
      codeInjectionHead: "",
      codeInjectionBody: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        codeInjectionHead: settings.codeInjectionHead || "",
        codeInjectionBody: settings.codeInjectionBody || "",
      });
    }
  }, [settings, form]);

  const onSubmit = async (data: CustomizationsSettingsFormData) => {
    try {
      await updateSettingsMutation.mutateAsync({
        data: {
          codeInjectionHead: data.codeInjectionHead,
          codeInjectionBody: data.codeInjectionBody,
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
    <div className="space-y-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FieldGroup>
          <Controller
            control={form.control}
            name="codeInjectionHead"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>{t("admin:settings.code_injection_head")}</FieldLabel>
                <Textarea
                  {...field}
                  rows={10}
                  placeholder={t("admin:settings.code_injection_head_placeholder")}
                  className="font-mono text-sm"
                  disabled={isDisabled}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="codeInjectionBody"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>{t("admin:settings.code_injection_body")}</FieldLabel>
                <Textarea
                  {...field}
                  rows={10}
                  placeholder={t("admin:settings.code_injection_body_placeholder")}
                  className="font-mono text-sm"
                  disabled={isDisabled}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        <Button
          type="submit"
          disabled={!form.formState.isDirty || isDisabled}
          className="w-full sm:w-auto"
        >
          {isSaving || isSubmitting ? t("common:saving") : t("common:save")}
        </Button>
      </form>
    </div>
  );
}
