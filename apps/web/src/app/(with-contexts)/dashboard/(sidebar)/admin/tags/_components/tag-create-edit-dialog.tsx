"use client";

import { FormMode } from "@/components/dashboard/layout/types";
import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormDialog, useDialogControl, useToast } from "@workspace/components-library";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

const TagSchema = z.object({
    name: z.string().min(1, "Tag name is required").max(100, "Tag name must be less than 100 characters"),
});
type TagFormDataType = z.infer<typeof TagSchema>;

interface TagCreateEditDialogProps {
    control: ReturnType<typeof useDialogControl<string | null>>;
    onSuccess?: () => void;
}

export function TagCreateEditDialog({ control, onSuccess }: TagCreateEditDialogProps) {
    const { t } = useTranslation(["dashboard", "common"]);
    const { toast } = useToast();
    const [mode, setMode] = useState<FormMode>("create");

    const form = useForm<TagFormDataType>({
        resolver: zodResolver(TagSchema),
        defaultValues: {
            name: "",
        },
    });

    useEffect(() => {
        if (control.isVisible) {
            setMode(control.data ? "edit" : "create");
        }
    }, [control.isVisible, control.data]);

    const tagQuery = trpc.siteModule.tag.getById.useQuery(
        { id: control.data! },
        {
            enabled: mode === "edit" && !!control.data && control.isVisible,
        }
    );

    useEffect(() => {
        if (mode === "edit" && tagQuery.data) {
            form.reset({ name: tagQuery.data.name });
        } else if (mode === "create") {
            form.reset({ name: "" });
        }
    }, [mode, tagQuery.data, form]);

    const createMutation = trpc.siteModule.tag.create.useMutation({
        onSuccess: () => {
            toast({
                title: t("common:dashboard.success"),
                description: "Tag created successfully"
            });
            onSuccess?.();
        },
        onError: (err: any) => {
            toast({
                title: t("common:dashboard.error"),
                description: err.message,
                variant: "destructive"
            });
        },
    });

    const updateMutation = trpc.siteModule.tag.update.useMutation({
        onSuccess: () => {
            toast({
                title: t("common:dashboard.success"),
                description: "Tag updated successfully"
            });
            onSuccess?.();
        },
        onError: (err: any) => {
            toast({
                title: t("common:dashboard.error"),
                description: err.message,
                variant: "destructive"
            });
        },
    });

    const handleClose = () => {
        control.hide();
        form.reset();
        setMode("create");
    };

    const handleSubmit = (data: TagFormDataType) => {
        if (mode === "edit" && control.data) {
            updateMutation.mutateAsync({
                id: control.data,
                data: { name: data.name }
            });
        } else {
            createMutation.mutateAsync({
                data: { name: data.name }
            });
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending || tagQuery.isLoading;

    const dialogConfig = useMemo(() => ({
        title: mode === "edit" ? "Edit Tag" : "Create Tag",
        submitText: mode === "edit" ? "Update" : "Create",
    }), [mode]);

    return (
        <FormDialog
            open={control.isVisible}
            onOpenChange={(open) => {
                if (!open) handleClose();
            }}
            title={dialogConfig.title}
            onSubmit={form.handleSubmit(handleSubmit)}
            isLoading={isLoading}
            submitText={dialogConfig.submitText}
        >
            <FieldGroup>
                <Controller
                    control={form.control}
                    name="name"
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Tag Name</FieldLabel>
                            <Input {...field} placeholder="Enter tag name" aria-invalid={fieldState.invalid} />
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

