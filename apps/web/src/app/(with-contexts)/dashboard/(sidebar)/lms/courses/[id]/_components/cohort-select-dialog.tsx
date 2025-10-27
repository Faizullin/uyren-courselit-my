"use client";

import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
import { ComboBox2 } from "@workspace/components-library";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { useCallback, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { NiceModal, NiceModalHocProps, FormDialog } from "@workspace/components-library";

type CohortType = GeneralRouterOutputs["lmsModule"]["cohortModule"]["cohort"]["list"]["items"][number];

const CohortSelectSchema = z.object({
  cohortId: z.string().min(1, "Cohort is required"),
});

type CohortSelectFormData = z.infer<typeof CohortSelectSchema>;

interface CohortSelectDialogProps extends NiceModalHocProps {
  courseId: string;
  onSelect?: (cohort: CohortType) => void;
}

export const CohortSelectDialog = NiceModal.create<
  CohortSelectDialogProps,
  { reason: "cancel" | "submit"; cohort?: CohortType }
>(({ courseId, onSelect }) => {
  const { visible, hide, resolve } = NiceModal.useModal();
  const { t } = useTranslation(["common", "course"]);
  const trpcUtils = trpc.useUtils();

  const form = useForm<CohortSelectFormData>({
    resolver: zodResolver(CohortSelectSchema),
    defaultValues: {
      cohortId: "",
    },
  });

  const searchCohorts = useCallback(
    async (search: string, offset: number, size: number): Promise<CohortType[]> => {
      const result = await trpcUtils.lmsModule.cohortModule.cohort.list.fetch({
        pagination: { skip: offset, take: size },
        filter: { courseId },
        search: search ? { q: search } : undefined,
      });
      return result.items;
    },
    [trpcUtils, courseId]
  );

  const renderCohortLabel = useCallback((cohort: CohortType) => {
    const currentCount = cohort.statsCurrentStudentsCount || 0;
    const capacity = cohort.maxCapacity 
      ? `${currentCount}/${cohort.maxCapacity}` 
      : `${currentCount} / ${t("common:unlimited")}`;
    return (
      <div className="flex items-center justify-between w-full">
        <span className="font-medium">{cohort.title}</span>
        <span className="text-sm text-muted-foreground ml-2">
          {capacity} {t("common:students")}
        </span>
      </div>
    );
  }, [t]);

  const handleSubmit = useCallback(async (data: CohortSelectFormData) => {
    try {
      const cohorts = await searchCohorts("", 0, 100);
      const selectedCohort = cohorts.find(c => c._id === data.cohortId);
      
      if (selectedCohort) {
        onSelect?.(selectedCohort);
        resolve({ reason: "submit", cohort: selectedCohort });
      }
      hide();
    } catch (error) {
      console.error("Error selecting cohort:", error);
    }
  }, [searchCohorts, onSelect, resolve, hide]);

  return (
    <FormDialog
      open={visible}
      onOpenChange={(open) => {
        if (!open) {
          hide();
          resolve({ reason: "cancel" });
        }
      }}
      title={t("course:cohorts.select_cohort")}
      onSubmit={form.handleSubmit(handleSubmit)}
      onCancel={() => {
        resolve({ reason: "cancel" });
        hide();
      }}
      submitText={t("common:select")}
      cancelText={t("common:cancel")}
    >
      <FieldGroup>
        <Controller
          name="cohortId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t("course:cohorts.select_cohort")}</FieldLabel>
              <ComboBox2<CohortType>
                title={t("course:cohorts.select_cohort")}
                valueKey="_id"
                value={field.value ? { _id: field.value, title: "" } as CohortType : undefined}
                searchFn={searchCohorts}
                renderLabel={renderCohortLabel}
                onChange={(cohort) => field.onChange(cohort?._id || "")}
                multiple={false}
              />
              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
      </FieldGroup>
    </FormDialog>
  );
});
