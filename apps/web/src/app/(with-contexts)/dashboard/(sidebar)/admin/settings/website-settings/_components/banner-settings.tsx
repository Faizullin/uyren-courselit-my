"use client";

import React from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

interface BannerSettingsProps {
  form: UseFormReturn<any>;
}

export const BannerSettings = React.memo<BannerSettingsProps>(({ form }) => {
  const { t } = useTranslation(["admin", "common"]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin:settings.banner_settings")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Controller
          control={form.control}
          name="showBanner"
          render={({ field }) => (
            <Field className="flex flex-row items-start space-x-3 space-y-0">
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <FieldContent>
                <FieldLabel>{t("admin:settings.show_main_page_banner")}</FieldLabel>
                <FieldDescription>
                  {t("admin:settings.display_banner_section")}
                </FieldDescription>
              </FieldContent>
            </Field>
          )}
        />

        {form.watch("showBanner") && (
          <div className="space-y-4 pl-6 border-l-2 border-muted">
            <Controller
              control={form.control}
              name="bannerTitle"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{t("admin:settings.banner_title")}</FieldLabel>
                  <Input
                    placeholder={t("admin:settings.banner_title")}
                    {...field}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="bannerSubtitle"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{t("admin:settings.banner_subtitle")}</FieldLabel>
                  <Input
                    placeholder={t("admin:settings.banner_subtitle")}
                    {...field}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
});

BannerSettings.displayName = "BannerSettings";
