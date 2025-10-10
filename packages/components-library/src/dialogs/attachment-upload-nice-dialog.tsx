import { useCallback } from "react";
import NiceModal, { type NiceModalHocPropsExtended } from "../nice-modal/modal-context";
import { AttachmentUploadDialog } from "./attachment-upload-dialog";

export const AttachmentUploadNiceDialog = NiceModal.create<
    NiceModalHocPropsExtended<{
        args: {
            title?: string;
            description?: string;
            maxFiles?: number;
            acceptedFileTypes?: Record<string, string[]>;
            maxFileSize?: number;
            uploadFn: (files: File[]) => Promise<{ success: boolean; files: File[]; error?: string }>;
        };
    }>,
    {
        files: File[];
    }
>(({ args }) => {
    const modal = NiceModal.useModal();

    const handleUpload = useCallback(async (files: File[]) => {
        try {
            const result = await args.uploadFn(files);
            if (result.success) {
                modal.resolve({ files: result.files });
                return result;
            } else {
                throw new Error(result.error || "Upload failed");
            }
        } catch (error) {
            throw error;
        }
    }, [args.uploadFn, modal]);

    return (
        <AttachmentUploadDialog
            control={{
                isVisible: modal.visible,
                hide: modal.hide,
                show: modal.show,
                toggle: () => modal.visible ? modal.hide() : modal.show(),
                data: {
                    uploadFn: handleUpload,
                    title: args.title,
                    description: args.description,
                    maxFiles: args.maxFiles,
                    acceptedFileTypes: args.acceptedFileTypes,
                    maxFileSize: args.maxFileSize,
                },
            }}
        />
    );
});
