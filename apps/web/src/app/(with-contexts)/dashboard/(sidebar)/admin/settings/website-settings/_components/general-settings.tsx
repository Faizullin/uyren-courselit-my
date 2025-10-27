"use client";

import React from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@workspace/ui/components/field";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

interface GeneralSettingsProps {
  form: UseFormReturn<any>;
}

export const GeneralSettings = React.memo<GeneralSettingsProps>(({ form }) => {
  const { t } = useTranslation(["admin", "common"]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin:settings.general_page_settings")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Controller
          control={form.control}
          name="showStats"
          render={({ field }) => (
            <Field className="flex flex-row items-start space-x-3 space-y-0">
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <FieldContent>
                <FieldLabel>{t("admin:settings.show_statistics_section")}</FieldLabel>
                <FieldDescription>
                  {t("admin:settings.display_student_count")}
                </FieldDescription>
              </FieldContent>
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="showFeatures"
          render={({ field }) => (
            <Field className="flex flex-row items-start space-x-3 space-y-0">
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <FieldContent>
                <FieldLabel>{t("admin:settings.show_features_section")}</FieldLabel>
                <FieldDescription>
                  {t("admin:settings.display_platform_features")}
                </FieldDescription>
              </FieldContent>
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="showTestimonials"
          render={({ field }) => (
            <Field className="flex flex-row items-start space-x-3 space-y-0">
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <FieldContent>
                <FieldLabel>{t("admin:settings.show_testimonials_section")}</FieldLabel>
                <FieldDescription>
                  {t("admin:settings.display_student_testimonials")}
                </FieldDescription>
              </FieldContent>
            </Field>
          )}
        />
      </CardContent>
    </Card>
  );
});

GeneralSettings.displayName = "GeneralSettings";
