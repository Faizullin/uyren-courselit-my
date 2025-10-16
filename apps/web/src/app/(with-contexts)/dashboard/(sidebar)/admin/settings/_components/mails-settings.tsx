"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Textarea } from "@workspace/ui/components/textarea";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useSettingsContext } from "./settings-context";

const mailsSettingsSchema = z.object({
  mailingAddress: z.string().optional(),
});

type MailsSettingsFormData = z.infer<typeof mailsSettingsSchema>;

export default function MailsSettings() {
  const { settings, updateSettingsMutation, loadSettingsQuery } =
    useSettingsContext();
  const { toast } = useToast();

  const form = useForm<MailsSettingsFormData>({
    resolver: zodResolver(mailsSettingsSchema),
    defaultValues: {
      mailingAddress: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        mailingAddress: settings.mailingAddress || "",
      });
    }
  }, [settings, form]);

  const onSubmit = async (data: MailsSettingsFormData) => {
    try {
      await updateSettingsMutation.mutateAsync({
        data: {
          mailingAddress: data.mailingAddress,
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
    <div className="space-y-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FieldGroup>
          <Controller
            control={form.control}
            name="mailingAddress"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Mailing Address</FieldLabel>
                <Textarea
                  {...field}
                  rows={5}
                  placeholder="Enter mailing address..."
                  disabled={isDisabled}
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>
                  This address will be used in transactional emails and on your site.
                </FieldDescription>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Button
            type="submit"
            disabled={!form.formState.isDirty || isDisabled}
            className="w-full sm:w-auto"
          >
            {isSaving || isSubmitting ? "Saving..." : "Save"}
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
