import { Button } from "@workspace/ui/components/button";
import { type ReactNode } from "react";
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
    submitText = "Save",
    cancelText = "Cancel",
    isLoading = false,
    maxWidth = "2xl"
}: FormDialogProps) {
    const handleCancel = () => {
        onCancel?.();
        onOpenChange(false);
    };

    const footer = (
        <>
            <Button type="button" variant="outline" onClick={handleCancel}>
                {cancelText}
            </Button>
            <Button type="button" onClick={onSubmit} disabled={isLoading}>
                {isLoading ? "Saving..." : submitText}
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
