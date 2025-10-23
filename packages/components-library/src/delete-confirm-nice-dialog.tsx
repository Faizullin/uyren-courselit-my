"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { useTranslation } from "react-i18next";
import NiceModal, { NiceModalHocProps } from "./nice-modal";

interface DeleteConfirmDialogProps<T = any> extends NiceModalHocProps {
  title?: string;
  message?: string;
  data?: T;
  confirmText?: string;
  cancelText?: string;
}

export const DeleteConfirmNiceDialog = NiceModal.create<
  DeleteConfirmDialogProps<any>,
  { reason: "cancel"; data: null } | { reason: "confirm"; data: any }
>(
  ({
    title,
    message,
    data,
    confirmText,
    cancelText,
  }) => {
    const { visible, hide, resolve } = NiceModal.useModal();
    const { t } = useTranslation(["common"]);

    const handleClose = () => {
      resolve({ reason: "cancel", data: null });
      hide();
    };

    const handleConfirm = () => {
      resolve({ reason: "confirm", data });
      hide();
    };

    return (
      <Dialog
        open={visible}
        onOpenChange={(v) => {
          if (!v) {
            handleClose();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title || t("common:delete")}</DialogTitle>
            <DialogDescription>{message || t("common:dialog.delete_confirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              {cancelText || t("common:cancel")}
            </Button>
            <Button variant="destructive" onClick={handleConfirm}>
              {confirmText || t("common:delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
);
