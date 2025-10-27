"use client";

import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormDialog, useDialogControl, useToast } from "@workspace/components-library";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { slugify } from "@workspace/utils";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

const createOrganizationSchema = (t: (key: string, params?: any) => string) => z.object({
  name: z.string()
    .min(1, t("error:validation.required", { field: t("admin:organizations.organization_name") }))
    .max(255, t("error:validation.max_length", { field: t("admin:organizations.organization_name"), max: 255 })),
  email: z.string()
    .min(1, t("error:validation.required", { field: t("admin:organizations.email") }))
    .email(t("error:validation.invalid_email")),
  description: z.string()
    .max(1000, t("error:validation.max_length", { field: t("admin:organizations.description"), max: 1000 }))
    .optional(),
  phone: z.string()
    .max(50, t("error:validation.max_length", { field: t("admin:organizations.phone"), max: 50 }))
    .optional(),
  address: z.string()
    .max(500, t("error:validation.max_length", { field: t("admin:organizations.address"), max: 500 }))
    .optional(),
});

type OrganizationFormData = z.infer<ReturnType<typeof createOrganizationSchema>>;

interface OrganizationCreateDialogProps {
  control: ReturnType<typeof useDialogControl>;
  onSuccess?: () => void;
}

export function OrganizationCreateDialog({
  control,
  onSuccess,
}: OrganizationCreateDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation(["admin", "common", "error"]);
  const trpcUtils = trpc.useUtils();

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(createOrganizationSchema(t)),
    defaultValues: {
      name: "",
      email: "",
      description: "",
      phone: "",
      address: "",
    },
  });

  const createOrganizationMutation =
    trpc.siteModule.organization.create.useMutation({
      onSuccess: () => {
        toast({
          title: t("common:success"),
          description: t("common:toast.created_successfully", { item: t("admin:organizations.create_organization") }),
        });
        control.hide();
        form.reset();
        trpcUtils.siteModule.organization.list.invalidate();
        onSuccess?.();
      },
      onError: (error) => {
        toast({
          title: t("common:error"),
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const handleSubmit = async (data: OrganizationFormData) => {
    await createOrganizationMutation.mutateAsync({
      data: {
        name: data.name,
        slug: slugify(data.name),
        email: data.email,
        description: data.description,
        phone: data.phone,
        address: data.address,
      },
    });
  };

  return (
    <FormDialog
      open={control.isVisible}
      onOpenChange={(open) => {
        if (!open) {
          control.hide();
          form.reset();
        }
      }}
      title={t("admin:organizations.create_new_organization")}
      onSubmit={form.handleSubmit(handleSubmit)}
      onCancel={control.hide}
      isLoading={createOrganizationMutation.isPending || form.formState.isSubmitting}
      submitText={t("admin:organizations.create_organization")}
      cancelText={t("common:cancel")}
      maxWidth="xl"
    >
      <FieldGroup>
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t("admin:organizations.organization_name")}</FieldLabel>
              <Input
                {...field}
                placeholder={t("admin:organizations.name_placeholder")}
                disabled={createOrganizationMutation.isPending}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t("admin:organizations.email")}</FieldLabel>
              <Input
                {...field}
                type="email"
                placeholder={t("admin:organizations.email_placeholder")}
                disabled={createOrganizationMutation.isPending}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="description"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t("admin:organizations.description")} ({t("common:optional")})</FieldLabel>
              <Textarea
                {...field}
                placeholder={t("admin:organizations.description_placeholder")}
                rows={3}
                disabled={createOrganizationMutation.isPending}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <Controller
            control={form.control}
            name="phone"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>{t("admin:organizations.phone")} ({t("common:optional")})</FieldLabel>
                <Input
                  {...field}
                  type="tel"
                  placeholder={t("admin:organizations.phone_placeholder")}
                  disabled={createOrganizationMutation.isPending}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="address"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>{t("admin:organizations.address")} ({t("common:optional")})</FieldLabel>
                <Input
                  {...field}
                  placeholder={t("admin:organizations.address_placeholder")}
                  disabled={createOrganizationMutation.isPending}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
      </FieldGroup>
    </FormDialog>
  );
}

