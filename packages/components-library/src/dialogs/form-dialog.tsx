"use client";

import { Button } from "@workspace/ui/components/button";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BaseDialog } from "./base-dialog";

interface FormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: ReactNode;
    onSubmit: () => void;
    onCancel?: () => void;
    submitText?: string;
    cancelText?: string;
    isLoading?: boolean;
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl";
}

export function FormDialog({
    open,
    onOpenChange,
    title,
    description,
    children,
    onSubmit,
    onCancel,
    submitText,
    cancelText,
    isLoading = false,
    maxWidth = "2xl"
}: FormDialogProps) {
    const { t } = useTranslation(["common"]);

    const handleCancel = () => {
        onCancel?.();
        onOpenChange(false);
    };

    const footer = (
        <>
            <Button type="button" variant="outline" onClick={handleCancel}>
                {cancelText || t("common:cancel")}
            </Button>
            <Button type="button" onClick={onSubmit} disabled={isLoading}>
                {isLoading ? t("common:saving") : (submitText || t("common:save"))}
            </Button>
        </>
    );

    return (
        <BaseDialog
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            description={description}
            maxWidth={maxWidth}
            footer={footer}
        >
            {children}
        </BaseDialog>
    );
}
