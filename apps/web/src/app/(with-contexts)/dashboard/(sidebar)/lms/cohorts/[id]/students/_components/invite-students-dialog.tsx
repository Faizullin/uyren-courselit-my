import { ICohort } from "@workspace/common-logic/models/lms/cohort.types";
import { ComboBox2, NiceModal, NiceModalHocProps } from "@workspace/components-library";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/utils/trpc";
import { useToast } from "@workspace/components-library";
import { FormDialog } from "@workspace/components-library";

type UserItem = { _id: string; fullName?: string; email: string };

const InviteStudentsSchema = z.object({
    userIds: z.array(z.string()).min(1, "Please select at least one user"),
});

type InviteStudentsFormData = z.infer<typeof InviteStudentsSchema>;

interface InviteStudentsDialogProps extends NiceModalHocProps {
    args: {
        cohort: ICohort;
    };
}

export const InviteStudentsDialog = NiceModal.create<
    InviteStudentsDialogProps,
    { reason: "cancel"; data: null } | { reason: "submit"; data: null }
>(({ args }) => {
    const { t } = useTranslation(["dashboard", "common"]);
    const { toast } = useToast();
    const { visible, hide, resolve } = NiceModal.useModal();
    const { cohort } = args || { cohort: null };
    const trpcUtils = trpc.useUtils();

    const form = useForm<InviteStudentsFormData>({
        resolver: zodResolver(InviteStudentsSchema),
        defaultValues: {
            userIds: [],
        },
    });

    const searchUsers = useCallback(
        async (search: string, offset: number, size: number) => {
            const result = await trpcUtils.userModule.user.list.fetch({
                pagination: { skip: offset, take: size },
                search: search ? { q: search } : undefined,
            });
            return result.items.map((user) => ({ 
                _id: user._id, 
                fullName: user.fullName || undefined,
                email: user.email 
            }));
        },
        [trpcUtils],
    );

    const handleCancel = useCallback(() => {
        resolve({ reason: "cancel", data: null });
        hide();
        form.reset();
    }, [resolve, hide, form]);

    const handleSubmit = useCallback(async (data: InviteStudentsFormData) => {
        toast({
            title: t("dashboard:cohort_students.coming_soon"),
            description: t("dashboard:cohort_students.coming_soon_desc")
        });
        handleCancel();
    }, [toast, t, handleCancel]);

    return (
        <FormDialog
            open={visible}
            onOpenChange={(open) => {
                if (!open) {
                    handleCancel();
                }
            }}
            title={t("dashboard:cohort_students.invite_students_title")}
            onSubmit={form.handleSubmit(handleSubmit)}
            onCancel={handleCancel}
            isLoading={form.formState.isSubmitting}
            submitText={t("common:invite")}
            cancelText={t("common:cancel")}
            maxWidth="xl"
        >
            <FieldGroup>
                <p className="text-sm text-muted-foreground mb-4">
                    {t("dashboard:cohort_students.invite_students_subtitle")}
                </p>
                <Controller
                    name="userIds"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="invite-users">{t("dashboard:cohort_students.select_users")}</FieldLabel>
                            <div id="invite-users">
                                <ComboBox2<UserItem>
                                    title={t("dashboard:cohort_students.select_users")}
                                    valueKey="_id"
                                    value={field.value.map(id => ({ _id: id, email: "" }))}
                                    searchFn={searchUsers}
                                    renderLabel={(item) => item.fullName || item.email}
                                    onChange={(items) => {
                                        field.onChange(items.map(item => item._id));
                                    }}
                                    multiple={true}
                                />
                            </div>
                            {fieldState.invalid && (
                                <span className="text-sm text-destructive mt-1">
                                    {fieldState.error?.message}
                                </span>
                            )}
                        </Field>
                    )}
                />
            </FieldGroup>
        </FormDialog>
    );
});
