"use client";

import { FormMode } from "@/components/dashboard/layout/types";
import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalApiKeyStatusEnum } from "@workspace/common-logic/models/api/external-api-key.types";
import { FormDialog, useDialogControl, useToast } from "@workspace/components-library";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

const ExternalApiKeySchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  publicKey: z.string().min(1, "Public key is required"),
  secretKey: z.string().optional(),
  description: z.string().optional(),
  status: z.nativeEnum(ExternalApiKeyStatusEnum).optional(),
  expiresAt: z.string().optional(),
  isSelf: z.boolean().optional(),
});

type ExternalApiKeyFormData = z.infer<typeof ExternalApiKeySchema>;

interface ExternalApiKeyCreateEditDialogProps {
  control: ReturnType<typeof useDialogControl<string | null>>;
  onSuccess?: () => void;
}

export function ExternalApiKeyCreateEditDialog({ control, onSuccess }: ExternalApiKeyCreateEditDialogProps) {
  const { t } = useTranslation(["dashboard", "common"]);
  const { toast } = useToast();
  const [mode, setMode] = useState<FormMode>("create");

  const form = useForm<ExternalApiKeyFormData>({
    resolver: zodResolver(ExternalApiKeySchema),
    defaultValues: {
      title: "",
      publicKey: "",
      secretKey: "",
      description: "",
      status: ExternalApiKeyStatusEnum.ACTIVE,
      expiresAt: "",
      isSelf: false,
    },
  });

  useEffect(() => {
    if (control.isVisible) {
      const newMode = control.data ? "edit" : "create";
      setMode(newMode);
      // Update form resolver based on mode
      form.clearErrors();
    }
  }, [control.isVisible, control.data, form]);

  const apiKeyQuery = trpc.siteModule.externalApiKey.getById.useQuery(
    { id: control.data! },
    {
      enabled: mode === "edit" && !!control.data && control.isVisible,
    },
  );

  useEffect(() => {
    if (mode === "edit" && apiKeyQuery.data) {
      form.reset({
        title: apiKeyQuery.data.title,
        publicKey: apiKeyQuery.data.publicKey,
        secretKey: "", // Don't show existing secret
        description: apiKeyQuery.data.description || "",
        status: apiKeyQuery.data.status,
        expiresAt: apiKeyQuery.data.expiresAt
          ? new Date(apiKeyQuery.data.expiresAt).toISOString().slice(0, 16)
          : "",
        isSelf: apiKeyQuery.data.isSelf || false,
      });
    } else if (mode === "create") {
      form.reset({
        title: "",
        publicKey: "",
        secretKey: "",
        description: "",
        status: ExternalApiKeyStatusEnum.ACTIVE,
        expiresAt: "",
        isSelf: false,
      });
    }
  }, [mode, apiKeyQuery.data, form]);

  const createMutation = trpc.siteModule.externalApiKey.create.useMutation({
    onSuccess: () => {
      toast({
        title: t("common:dashboard.success"),
        description: "API key created successfully",
      });
      onSuccess?.();
      control.hide();
    },
    onError: (err: any) => {
      toast({ title: t("common:dashboard.error"), description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = trpc.siteModule.externalApiKey.update.useMutation({
    onSuccess: () => {
      toast({
        title: t("common:dashboard.success"),
        description: "API key updated successfully",
      });
      onSuccess?.();
      control.hide();
    },
    onError: (err: any) => {
      toast({
        title: t("common:dashboard.error"),
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = useCallback(() => {
    control.hide();
    form.reset();
    setMode("create");
  }, [control, form]);

  const handleSubmit = useCallback(
    async (data: ExternalApiKeyFormData) => {
      // Validate secret key for create mode
      if (mode === "create" && (!data.secretKey || data.secretKey.trim() === "")) {
        toast({
          title: t("common:dashboard.error"),
          description: "Secret key is required for creation",
          variant: "destructive",
        });
        return;
      }

      if (mode === "edit" && control.data) {
        const updateData: any = {
          title: data.title,
          publicKey: data.publicKey,
          description: data.description,
          status: data.status,
          expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
        };
        // Only update secret key if provided
        if (data.secretKey && data.secretKey.trim() !== "") {
          updateData.secretKey = data.secretKey;
        }

        await updateMutation.mutateAsync({
          id: control.data,
          data: updateData,
        });
      } else {
        await createMutation.mutateAsync({
          data: {
            title: data.title,
            publicKey: data.publicKey,
            secretKey: data.secretKey!,
            description: data.description,
            expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
            isSelf: data.isSelf,
          },
        });
      }
    },
    [mode, control.data, createMutation, updateMutation, toast, t],
  );

  const isLoading = createMutation.isPending || updateMutation.isPending || apiKeyQuery.isLoading;

  const dialogConfig = useMemo(() => ({
    title: mode === "edit" ? "Edit External API Key" : "Create External API Key",
    description: mode === "edit" 
      ? "Update API key details. Leave secret key empty to keep existing one."
      : "Add third-party API credentials for external integrations",
    submitText: mode === "edit" ? "Update" : "Create",
  }), [mode]);

  return (
    <FormDialog
      open={control.isVisible}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      title={dialogConfig.title}
      description={dialogConfig.description}
      onSubmit={form.handleSubmit(handleSubmit)}
      onCancel={handleClose}
      isLoading={isLoading}
      submitText={dialogConfig.submitText}
      cancelText={t("common:dashboard.cancel")}
      maxWidth="xl"
    >
      <FieldGroup>
        <Controller
          control={form.control}
          name="title"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Title *</FieldLabel>
              <Input
                {...field}
                placeholder="e.g., OpenAI API Key"
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
          name="publicKey"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Public Key / API Key ID *</FieldLabel>
              <FieldDescription>
                The public identifier or API key from the third-party service
              </FieldDescription>
              <Input
                {...field}
                placeholder="e.g., pk_live_..."
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
          name="secretKey"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Secret Key {mode === "edit" && "(Optional)"}</FieldLabel>
              <FieldDescription>
                {mode === "edit" 
                  ? "Leave empty to keep existing secret key"
                  : "The secret/private key from the third-party service (will be hashed)"}
              </FieldDescription>
              <Input
                {...field}
                type="password"
                placeholder={mode === "edit" ? "Enter new secret to update" : "e.g., sk_live_..."}
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
              <FieldLabel>Description (Optional)</FieldLabel>
              <Textarea
                {...field}
                placeholder="Describe the purpose of this API key..."
                rows={3}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        {mode === "edit" && (
          <Controller
            control={form.control}
            name="status"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="status-select">Status</FieldLabel>
                <div>
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="status-select" aria-invalid={fieldState.invalid}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ExternalApiKeyStatusEnum).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        )}

        <Controller
          control={form.control}
          name="expiresAt"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Expiration Date (Optional)</FieldLabel>
              <FieldDescription>
                Leave empty for no expiration
              </FieldDescription>
              <Input
                {...field}
                type="datetime-local"
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
          name="isSelf"
          render={({ field }) => (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FieldLabel className="text-base">System-Level Key</FieldLabel>
                <p className="text-sm text-muted-foreground">
                  This key can access all organization data (admin only)
                </p>
              </div>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </div>
          )}
        />
      </FieldGroup>
    </FormDialog>
  );
}

