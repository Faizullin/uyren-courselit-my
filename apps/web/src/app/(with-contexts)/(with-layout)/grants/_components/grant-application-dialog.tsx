"use client";

import { submitGrantApplication } from "@/server/actions/grant-application";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { AidTypeEnum, EducationStatusEnum, IntendedTrackEnum } from "@workspace/common-logic/models/lms/grant-application.types";
import { FormDialog, PhoneInput, useDialogControl, useToast } from "@workspace/components-library";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { CheckCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

interface GrantApplicationDialogProps {
  control: ReturnType<typeof useDialogControl>;
}

export function GrantApplicationDialog({ control }: GrantApplicationDialogProps) {
  const { t } = useTranslation("frontend");
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Zod validation schema with translated error messages
  const grantApplicationSchema = useMemo(() => z.object({
    fullName: z.string()
      .min(1, { message: t("grants.form.validation.fullName_required") }),
    email: z.string()
      .min(1, { message: t("grants.form.validation.email_required") })
      .email({ message: t("grants.form.validation.email_invalid") }), 
    phone: z.string()
      .min(1, { message: t("grants.form.validation.phone_required") }),
    educationStatus: z.nativeEnum(EducationStatusEnum, {
      errorMap: () => ({ message: t("grants.form.validation.educationStatus_required") })
    }),
    intendedTrack: z.nativeEnum(IntendedTrackEnum, {
      errorMap: () => ({ message: t("grants.form.validation.intendedTrack_required") })
    }),
    aidType: z.nativeEnum(AidTypeEnum, {
      errorMap: () => ({ message: t("grants.form.validation.aidType_required") })
    }),
    motivation: z.string()
      .min(100, { message: t("grants.form.validation.motivation_min") })
      .max(1000, { message: t("grants.form.validation.motivation_max") }),
    consent: z.boolean()
      .refine((val) => val === true, { 
        message: t("grants.form.validation.consent_required") 
      }),
  }), [t]);

  type GrantApplicationFormData = z.infer<typeof grantApplicationSchema>;

  // Initialize react-hook-form with zod resolver
  const form = useForm<GrantApplicationFormData>({
    resolver: zodResolver(grantApplicationSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      educationStatus: EducationStatusEnum.HIGH_SCHOOL_9,
      intendedTrack: IntendedTrackEnum.PROGRAMMING,
      aidType: AidTypeEnum.FULL_GRANT,
      motivation: "",
      consent: false,
    },
  });

  const submitApplicationMutation = useMutation({
    mutationFn: submitGrantApplication,
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: t("grants.form.toast_success"), description: result.message });
        setIsSubmitted(true);
        form.reset();
      } else {
        toast({ title: t("grants.form.toast_error"), description: result.message, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: t("grants.form.toast_error"), 
        description: error.message || t("grants.form.toast_submit_failed"), 
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (data: GrantApplicationFormData) => {
    submitApplicationMutation.mutate(data);
  };

  if (isSubmitted) {
    return (
      <FormDialog
        open={control.isVisible}
        onOpenChange={(open) => {
          if (!open) {
            control.hide();
            setIsSubmitted(false);
          }
        }}
        title={t("grants.form.success_title")}
        description={t("grants.form.success_description")}
        onSubmit={() => {
          control.hide();
          setIsSubmitted(false);
        }}
        submitText={t("grants.form.close")}
        maxWidth="md"
      >
        <div className="text-center py-6">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </FormDialog>
    );
  }

  return (
    <FormDialog
      open={control.isVisible}
      onOpenChange={(open) => {
        if (!open) {
          control.hide();
          form.reset();
        }
      }}
      title={t("grants.form.title")}
      description={t("grants.form.description")}
      onSubmit={form.handleSubmit(handleSubmit)}
      isLoading={submitApplicationMutation.isPending}
      submitText={submitApplicationMutation.isPending ? t("grants.form.submitting") : t("grants.form.submit")}
      maxWidth="2xl"
    >
      <FieldGroup>
        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("grants.form.section_personal_info")}
          </h3>

          <Controller
            control={form.control}
            name="fullName"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="grant-ctrl-fullName">
                  {t("grants.form.field_full_name")} *
                </FieldLabel>
                <Input
                  {...field}
                  id="grant-ctrl-fullName"
                  placeholder={t("grants.form.field_full_name_placeholder")}
                  aria-invalid={fieldState.invalid}
                  autoComplete="name"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="grant-ctrl-email">
                  {t("grants.form.field_email")} *
                </FieldLabel>
                <Input
                  {...field}
                  id="grant-ctrl-email"
                  type="email"
                  placeholder={t("grants.form.field_email_placeholder")}
                  aria-invalid={fieldState.invalid}
                  autoComplete="email"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="phone"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="grant-ctrl-phone">
                  {t("grants.form.field_phone")} *
                </FieldLabel>
                <PhoneInput
                  {...field}
                  id="grant-ctrl-phone"
                  placeholder={t("grants.form.field_phone_placeholder")}
                  defaultCountry="KZ"
                  international
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>

        {/* Education & Program */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("grants.form.section_education_program")}
          </h3>

          <Controller
            control={form.control}
            name="educationStatus"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="grant-ctrl-educationStatus">
                  {t("grants.form.field_education_status")} *
                </FieldLabel>
                <Select
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id="grant-ctrl-educationStatus"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder={t("grants.form.field_education_status_placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high-school-9">{t("grants.form.education_high_school_9")}</SelectItem>
                    <SelectItem value="high-school-10">{t("grants.form.education_high_school_10")}</SelectItem>
                    <SelectItem value="high-school-11">{t("grants.form.education_high_school_11")}</SelectItem>
                    <SelectItem value="high-school-12">{t("grants.form.education_high_school_12")}</SelectItem>
                    <SelectItem value="college">{t("grants.form.education_college")}</SelectItem>
                    <SelectItem value="university">{t("grants.form.education_university")}</SelectItem>
                    <SelectItem value="other">{t("grants.form.education_other")}</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="intendedTrack"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="grant-ctrl-intendedTrack">
                  {t("grants.form.field_intended_track")} *
                </FieldLabel>
                <Select
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id="grant-ctrl-intendedTrack"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder={t("grants.form.field_intended_track_placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="programming">{t("grants.form.track_programming")}</SelectItem>
                    <SelectItem value="analytics">{t("grants.form.track_analytics")}</SelectItem>
                    <SelectItem value="ai">{t("grants.form.track_ai")}</SelectItem>
                    <SelectItem value="data-science">{t("grants.form.track_data_science")}</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="aidType"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="grant-ctrl-aidType">
                  {t("grants.form.field_aid_type")} *
                </FieldLabel>
                <Select
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id="grant-ctrl-aidType"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder={t("grants.form.field_aid_type_placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100-percent">{t("grants.form.aid_100_percent")}</SelectItem>
                    <SelectItem value="50-percent">{t("grants.form.aid_50_percent")}</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>

        {/* Motivation */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("grants.form.section_motivation")}
          </h3>

          <Controller
            control={form.control}
            name="motivation"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="grant-ctrl-motivation">
                  {t("grants.form.field_motivation")} * (100-1000 {t("grants.form.field_motivation_chars")})
                </FieldLabel>
                <Textarea
                  {...field}
                  id="grant-ctrl-motivation"
                  placeholder={t("grants.form.field_motivation_placeholder")}
                  className="min-h-[120px] resize-none"
                  rows={6}
                  maxLength={1000}
                  aria-invalid={fieldState.invalid}
                />
                <div className="flex justify-between items-center">
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                  <p className="text-sm text-gray-500 tabular-nums ml-auto">
                    {field.value.length}/1000 {t("grants.form.field_motivation_chars")}
                  </p>
                </div>
              </Field>
            )}
          />
        </div>

        {/* Consent */}
        <Controller
          control={form.control}
          name="consent"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="grant-ctrl-consent"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-invalid={fieldState.invalid}
                />
                <FieldLabel
                  htmlFor="grant-ctrl-consent"
                  className="text-sm leading-relaxed font-normal"
                >
                  {t("grants.form.field_consent")} *
                </FieldLabel>
              </div>
              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
      </FieldGroup>
    </FormDialog>
  );
}

