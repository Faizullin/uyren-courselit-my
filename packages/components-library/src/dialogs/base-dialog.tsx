import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { type ReactNode } from "react";

interface BaseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: ReactNode;
    footer?: ReactNode;
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl";
    maxHeight?: string;
}

const maxWidthClasses = {
    sm: "!max-w-sm",
    md: "!max-w-md",
    lg: "!max-w-lg",
    xl: "!max-w-xl",
    "2xl": "!max-w-2xl",
    "3xl": "!max-w-3xl",
    "4xl": "!max-w-4xl",
    "5xl": "!max-w-5xl",
    "6xl": "!max-w-6xl",
    "7xl": "!max-w-7xl",
};

export function BaseDialog({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
    maxWidth = "2xl",
    maxHeight = "max-h-[90vh]"
}: BaseDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={`${maxWidthClasses[maxWidth]} ${maxHeight} overflow-y-auto`}
            >
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                {children}
                {footer && (
                    <div className="flex justify-end space-x-4 pt-4">
                        {footer}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
