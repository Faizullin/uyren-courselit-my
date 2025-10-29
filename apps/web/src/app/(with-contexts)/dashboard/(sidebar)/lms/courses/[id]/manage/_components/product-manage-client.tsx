"use client";

import { Serialized } from "@/lib/types";
import { useProfile } from "@/components/contexts/profile-context";
import { useSiteInfo } from "@/components/contexts/site-info-context";
import { useCourseDetail } from "@/components/course/detail/course-detail-context";
import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import PaymentPlanList from "@/components/dashboard/payments/payment-plan-list";
import { removeFeaturedImage, uploadFeaturedImage } from "@/server/actions/lms/course-media";
import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { Editor } from "@tiptap/react";
import { PublicationStatusEnum } from "@workspace/common-logic/lib/publication_status";
import { ITextEditorContent } from "@workspace/common-logic/lib/text-editor-content";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { IAttachmentMedia } from "@workspace/common-logic/models/media.types";
import { IPaymentPlan, PaymentPlanTypeEnum } from "@workspace/common-logic/models/payment/payment-plan.types";
import {
  ComboBox2,
  DeleteConfirmNiceDialog,
  getSymbolFromCurrency,
  MediaSelector,
  NiceModal,
  useToast,
} from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import z from "zod";

const DescriptionEditor = dynamic(() =>
  import(
    "@/components/editors/tiptap/templates/description/description-editor"
  ).then((mod) => ({ default: mod.DescriptionEditor })),
);

const createProductSchema = (t: (key: string, params?: any) => string) => z.object({
  title: z.string()
    .min(1, t("error:validation.required", { field: t("course:manage.title_label") }))
    .max(255, t("error:validation.max_length", { field: t("course:manage.title_label"), max: 255 })),
  shortDescription: z.string()
    .max(500, t("error:validation.max_length", { field: t("course:manage.short_description_label"), max: 500 }))
    .optional(),
  description: z.custom<ITextEditorContent>().optional(),
  themeId: z.string().nullable(),
  instructors: z.array(z.object({
    userId: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    fullName: z.string(),
  })).optional(),
});

type ProductFormDataType = z.infer<ReturnType<typeof createProductSchema>>;

interface UsePaymentPlanOperationsProps {
  id: string;
}

type PaymentPlanWithId = Serialized<IPaymentPlan & { _id: string }>;

function usePaymentPlanOperations({ id }: UsePaymentPlanOperationsProps) {
  const loadPaymentPlansQuery = trpc.paymentModule.paymentPlan.list.useQuery({
    pagination: { skip: 0, take: 100 },
    filter: {
      entityType: "course",
      entityId: id,
    },
  });

  const allPlans = (loadPaymentPlansQuery.data?.items || []) as PaymentPlanWithId[];
  const paymentPlans = allPlans.filter((p) => p.status !== "archived");
  const archivedPlans = allPlans.filter((p) => p.status === "archived");
  const defaultPaymentPlanId = paymentPlans.find((p) => p.isDefault)?._id;

  const createPaymentPlanMutation = trpc.lmsModule.courseModule.course.createPaymentPlan.useMutation({
    onSuccess: () => {
      loadPaymentPlansQuery.refetch();
    },
  });

  const archivePaymentPlanMutation = trpc.paymentModule.paymentPlan.archive.useMutation({
    onSuccess: () => {
      loadPaymentPlansQuery.refetch();
    },
  });

  const deletePaymentPlanMutation = trpc.paymentModule.paymentPlan.delete.useMutation({
    onSuccess: () => {
      loadPaymentPlansQuery.refetch();
    },
  });

  const updatePaymentPlanMutation = trpc.paymentModule.paymentPlan.update.useMutation({
    onSuccess: () => {
      loadPaymentPlansQuery.refetch();
    },
  });

  const setDefaultPlanMutation = trpc.paymentModule.paymentPlan.setDefault.useMutation({
    onSuccess: () => {
      loadPaymentPlansQuery.refetch();
    },
  });

  const onPlanSubmitted = useCallback(async (values: any) => {
    try {
      await createPaymentPlanMutation.mutateAsync({
        data: {
          ...values,
          courseId: id,
        },
      });
    } catch (error) {
      console.error("Error submitting plan:", error);
      throw error;
    }
  }, [createPaymentPlanMutation, id]);

  const onPlanArchived = useCallback(async (plan: PaymentPlanWithId) => {
    const response = await archivePaymentPlanMutation.mutateAsync({
      id: plan._id,
    });
    return response;
  }, [archivePaymentPlanMutation]);

  const onDefaultPlanChanged = useCallback(async (plan: PaymentPlanWithId) => {
    const response = await setDefaultPlanMutation.mutateAsync({
      id: plan._id,
    });
    return response;
  }, [setDefaultPlanMutation]);

  const onPlanRestored = useCallback(async (plan: PaymentPlanWithId) => {
    const response = await updatePaymentPlanMutation.mutateAsync({
      id: plan._id,
      data: { status: "active" as any },
    });
    return response;
  }, [updatePaymentPlanMutation]);

  const onPlanDeleted = useCallback(async (plan: PaymentPlanWithId) => {
    const response = await deletePaymentPlanMutation.mutateAsync({
      id: plan._id,
    });
    return response;
  }, [deletePaymentPlanMutation]);

  return { 
    paymentPlans,
    archivedPlans,
    defaultPaymentPlanId, 
    onPlanSubmitted, 
    onPlanArchived, 
    onDefaultPlanChanged,
    onPlanRestored,
    onPlanDeleted,
    isLoadingPaymentPlans: loadPaymentPlansQuery.isLoading,
  };
}

export default function ProductManageClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation(["course", "common"]);
  const { profile } = useProfile();
  const { siteInfo } = useSiteInfo();
  const { loadCourseDetailQuery } = useCourseDetail();
  const trpcUtils = trpc.useUtils();

  const product = loadCourseDetailQuery.data!;

  const editorRef = useRef<Editor | null>(null);
  const [editorContent, setEditorContent] = useState<ITextEditorContent>({
    type: "doc",
    content: "",
    assets: [],
    widgets: [],
    config: { editorType: "tiptap" },
  });
  const [featuredImage, setFeaturedImage] = useState<IAttachmentMedia | null>(
    product.featuredImage ? (product.featuredImage as unknown as IAttachmentMedia) : null
  );
  const [published, setPublished] = useState(product.published || false);
  const [selectedTheme, setSelectedTheme] = useState<{ key: string; title: string } | null>(null);
  const [selectedInstructors, setSelectedInstructors] = useState<Array<{
    _id: string;
    fullName: string;
    email: string;
  }>>([]);
  const [allowEnrollment, setAllowEnrollment] = useState<boolean>(product?.allowEnrollment || false);
  const [allowSelfEnrollment, setAllowSelfEnrollment] = useState<boolean>(product?.allowSelfEnrollment || false);

  const {
    paymentPlans,
    archivedPlans,
    defaultPaymentPlanId,
    onPlanSubmitted,
    onPlanArchived,
    onDefaultPlanChanged,
    onPlanRestored,
    onPlanDeleted,
  } = usePaymentPlanOperations({ id: product._id });

  const form = useForm<ProductFormDataType>({
    resolver: zodResolver(createProductSchema(t)),
    defaultValues: {
      title: product.title || "",
      shortDescription: product.shortDescription || "",
      description: product.description as ITextEditorContent | undefined,
      themeId: product.themeId || null,
      instructors: product.instructors || [],
    },
  });

  const isAdmin = useMemo(() => 
    profile?.roles?.includes(UIConstants.roles.admin) || false,
    [profile?.roles]
  );
  
  const fetchThemes = useCallback(async (search: string, offset: number, size: number) => {
    try {
      const response = await trpcUtils.lmsModule.themeModule.theme.list.fetch({
        pagination: { skip: offset, take: size },
        search: search ? { q: search } : undefined,
        filter: { publicationStatus: PublicationStatusEnum.PUBLISHED },
      });
      return response.items.map((theme) => ({
        key: theme._id,
        title: theme.name,
      }));
    } catch (error) {
      console.error("Failed to fetch themes:", error);
      return [];
    }
  }, [trpcUtils]);

  const searchInstructors = useCallback(async (search: string, offset: number, size: number) => {
    try {
      const result = await trpcUtils.userModule.user.listInstructors.fetch({
        pagination: { skip: offset, take: size },
        search: search ? { q: search } : undefined,
      });
      return result.items.map(user => ({ 
        _id: user._id, 
        fullName: user.fullName || user.email,
        email: user.email,
      }));
    } catch (error) {
      console.error("Failed to fetch instructors:", error);
      return [];
    }
  }, [trpcUtils]);

  const updateCourseMutation = trpc.lmsModule.courseModule.course.update.useMutation({
    onSuccess: () => {
      toast({
        title: t("common:success"),
        description: t("course:toast.updated"),
      });
    },
    onError: (error) => {
      toast({
        title: t("common:error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCourseMutation = trpc.lmsModule.courseModule.course.delete.useMutation({
    onSuccess: () => {
      toast({
        title: t("common:success"),
        description: t("course:toast.deleted"),
      });
      router.push("/dashboard/lms/courses");
    },
    onError: (error) => {
      toast({
        title: t("common:error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAllowEnrollment = async (checked: boolean) => {
    try {
      await updateCourseMutation.mutateAsync({
        id: product._id,
        data: { allowEnrollment: checked },
      });
      setAllowEnrollment(checked);
    } catch (error) {
      console.error("Error updating allowEnrollment:", error);
    }
  };

  const updateAllowSelfEnrollment = async (checked: boolean) => {
    try {
      await updateCourseMutation.mutateAsync({
        id: product._id,
        data: { allowSelfEnrollment: checked },
      });
      setAllowSelfEnrollment(checked);
    } catch (error) {
      console.error("Error updating allowSelfEnrollment:", error);
    }
  };

  useEffect(() => {
    if (product?.description) {
      setEditorContent(product.description as unknown as ITextEditorContent);
    }
    
    const theme = product.theme as { _id: string; name: string } | undefined;
    if (theme) {
      setSelectedTheme({
        key: theme._id || "",
        title: theme.name || "",
      });
    }

    if (product.instructors && product.instructors.length > 0) {
      setSelectedInstructors(
        product.instructors.map(inst => ({
          _id: String(inst.userId),
          fullName: inst.fullName,
          email: "",
        }))
      );
    }
  }, [product]);

  const handleSubmit = useCallback(async (data: ProductFormDataType) => {
    try {
      const updateData: any = {
        title: data.title,
        shortDescription: data.shortDescription,
        description: editorContent,
        themeId: data.themeId,
      };

      if (data.instructors && isAdmin) {
        updateData.instructors = data.instructors;
      }

      await updateCourseMutation.mutateAsync({
        id: product._id,
        data: updateData,
      });
    } catch (error) {
      // Error handling is done in the mutation
    }
  }, [updateCourseMutation, product._id, editorContent, isAdmin]);

  const updatePublishedStatus = useCallback(async (published: boolean) => {
    try {
      await updateCourseMutation.mutateAsync({
        id: product._id,
        data: { published },
      });
    } catch (error) {
      console.error("Error updating published status:", error);
    }
  }, [updateCourseMutation, product._id]);

  useEffect(() => {
    if (product.description) {
      try {
        const parsedDesc = typeof product.description === "string"
          ? JSON.parse(product.description)
          : product.description;
        if (parsedDesc.content) {
          setEditorContent(parsedDesc);
        }
      } catch (error) {
        console.error("Error initializing editor content:", error);
      }
    }
  }, [product.description]);

  useEffect(() => {
    if (product.themeId) {
      form.setValue("themeId", product.themeId);
    }
  }, [product.themeId, form]);

  const isSubmitting = form.formState.isSubmitting;
  const isSaving = updateCourseMutation.isPending;

  const breadcrumbs = [
    { label: t("course:manage.breadcrumb_courses"), href: "/dashboard/lms/courses" },
    {
      label: product.title || t("course:detail.badge_course"),
      href: `/dashboard/lms/courses/${product._id}`,
    },
    { label: t("course:manage.breadcrumb_manage"), href: "#" },
  ];

  return (
    <DashboardContent breadcrumbs={breadcrumbs}>
      <HeaderTopbar
        header={{
          title: t("course:manage.breadcrumb_manage"),
        }}
      />

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FieldGroup>
          <Controller
            control={form.control}
            name="title"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="course-title" className="text-base font-semibold">
                  {t("course:manage.title_label")}
                </FieldLabel>
                <Input {...field} id="course-title" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="shortDescription"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="course-short-description" className="text-base font-semibold">
                  {t("course:manage.short_description_label")}
                </FieldLabel>
                <Textarea
                  {...field}
                  id="course-short-description"
                  placeholder={t("course:manage.short_description_placeholder")}
                  maxLength={500}
                  aria-invalid={fieldState.invalid}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {field.value?.length || 0}/500
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="themeId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel className="text-base font-semibold">
                    {t("course:manage.course_theme_label")}
                  </FieldLabel>
                  <ComboBox2<{ key: string; title: string }>
                    title={t("course:manage.select_theme")}
                    valueKey="key"
                    value={selectedTheme || undefined}
                    searchFn={fetchThemes}
                    renderLabel={(item) => item.title}
                    onChange={(item) => {
                      setSelectedTheme(item || null);
                      field.onChange(item?.key || null);
                    }}
                    multiple={false}
                    showCreateButton={true}
                    showEditButton={true}
                    onCreateClick={() => window.open(`/dashboard/lms/themes/new`, "_blank")}
                    onEditClick={(item) => window.open(`/dashboard/lms/themes/${item.key}`, "_blank")}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="instructors"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel className="text-base font-semibold">
                    {t("course:manage.instructors_label")}
                  </FieldLabel>
                  <ComboBox2<{ _id: string; fullName: string; email: string }>
                    title={t("course:manage.select_instructors")}
                    valueKey="_id"
                    value={selectedInstructors}
                    searchFn={searchInstructors}
                    renderLabel={(item) => item.fullName}
                    onChange={(items) => {
                      setSelectedInstructors(items as any);
                      const instructorData = items.map(item => ({
                        userId: item._id,
                        firstName: item.fullName.split(" ")[0] || "",
                        lastName: item.fullName.split(" ").slice(1).join(" ") || "",
                        fullName: item.fullName,
                      }));
                      field.onChange(instructorData);
                    }}
                    multiple={true}
                    disabled={!isAdmin}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>
        </FieldGroup>
      </form>

      <div className="space-y-4">
        <Field>
          <FieldLabel
            className="text-base font-semibold"
            onClick={() => editorRef.current?.commands.focus("end")}
          >
            {t("course:manage.description_label")}
          </FieldLabel>
          <DescriptionEditor
            courseId={product._id}
            placeholder={t("course:manage.description_placeholder")}
            onEditor={(editor, meta) => {
              if (meta.reason === "create") {
                editorRef.current = editor;
                editor!.commands.setMyContent(editorContent);
              }
            }}
            onChange={(content) => {
              setEditorContent({
                ...editorContent,
                content: content,
              });
            }}
          />
        </Field>

        <div className="flex justify-end">
          <Button 
            type="button" 
            disabled={isSaving || isSubmitting}
            onClick={form.handleSubmit(handleSubmit)}
          >
            {isSaving || isSubmitting ? t("common:saving") : t("common:save")}
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{t("course:manage.featured_image")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("course:manage.featured_image_desc")}
        </p>
        <MediaSelector
          media={featuredImage}
          onSelection={(media) => setFeaturedImage(media)}
          onRemove={() => {
            setFeaturedImage(null);
            loadCourseDetailQuery.refetch();
          }}
          mimeTypesToShow={["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]}
          type="course"
          strings={{
            buttonCaption: t("common:upload"),
          }}
          functions={{
            uploadFile: async (files: File[], _type: string, _storageProvider?: string, _caption?: string) => {
              const formData = new FormData();
              files.forEach(file => formData.append("file", file));
              
              const result = await uploadFeaturedImage(product._id, formData);
              if (!result.success) {
                throw new Error(result.error || "Upload failed");
              }

              if (result.media) {
                setFeaturedImage(result.media as any);
              }
              
              loadCourseDetailQuery.refetch();
              
              toast({
                title: t("common:success"),
                description: t("common:toast.uploaded_successfully", { item: t("course:manage.featured_image") }),
              });
              
              return [result.media];
            },
            removeFile: async (mediaId: string) => {
              const result = await removeFeaturedImage(product._id);
              
              if (!result.success) {
                throw new Error(result.error || "Failed to remove image");
              }
              
              toast({
                title: t("common:success"),
                description: t("common:toast.removed_successfully", { item: t("course:manage.featured_image") }),
              });
            }
          }}
        />
      </div>

      <Separator />

      <div className="space-y-4 flex flex-col md:flex-row md:items-start md:justify-between w-full">
        <div className="space-y-2">
          <Label className="text-lg font-semibold">{t("course:manage.pricing")}</Label>
          <p className="text-sm text-muted-foreground">
            {t("course:manage.pricing_desc")}
          </p>
        </div>
        <PaymentPlanList
          paymentPlans={paymentPlans}
          archivedPlans={archivedPlans}
          userRoles={profile?.roles || []}
          onPlanSubmit={async (values) => {
            const submitValues: any = {
              name: values.name,
              type: values.type,
            };
            if (values.type === PaymentPlanTypeEnum.SUBSCRIPTION) {
              submitValues.subscriptionMonthlyAmount = values.subscriptionMonthlyAmount;
              submitValues.subscriptionYearlyAmount = values.subscriptionYearlyAmount;
            } else if (values.type === PaymentPlanTypeEnum.ONE_TIME) {
              submitValues.oneTimeAmount = values.oneTimeAmount;
            } else if (values.type === PaymentPlanTypeEnum.EMI) {
              submitValues.emiAmount = values.emiAmount;
              submitValues.emiTotalInstallments = values.emiTotalInstallments;
            }
            try {
              await onPlanSubmitted(submitValues);
            } catch (err) {
              const error = err instanceof Error ? err : new Error(String(err));
              toast({
                title: t("common:error"),
                description: error.message,
                variant: "destructive",
              });
            }
          }}
          onPlanArchived={async (plan) => {
            try {
              await onPlanArchived(plan);
            } catch (err) {
              const error = err instanceof Error ? err : new Error(String(err));
              toast({
                title: t("common:error"),
                description: error.message,
                variant: "destructive",
              });
            }
          }}
          allowedPlanTypes={[
            PaymentPlanTypeEnum.SUBSCRIPTION,
            PaymentPlanTypeEnum.FREE,
            PaymentPlanTypeEnum.ONE_TIME,
            PaymentPlanTypeEnum.EMI,
          ]}
          currencySymbol={getSymbolFromCurrency(siteInfo.currencyISOCode || "USD")}
          currencyISOCode={siteInfo.currencyISOCode?.toUpperCase() || "USD"}
          onDefaultPlanChanged={async (id) => {
            try {
              await onDefaultPlanChanged(id);
            } catch (err) {
              const error = err instanceof Error ? err : new Error(String(err));
              toast({
                title: t("common:error"),
                description: error.message,
                variant: "destructive",
              });
            }
          }}
          onPlanRestored={async (plan) => {
            try {
              await onPlanRestored(plan);
            } catch (err) {
              const error = err instanceof Error ? err : new Error(String(err));
              toast({
                title: t("common:error"),
                description: error.message,
                variant: "destructive",
              });
            }
          }}
          onPlanDeleted={async (plan) => {
            try {
              await onPlanDeleted(plan);
            } catch (err) {
              const error = err instanceof Error ? err : new Error(String(err));
              toast({
                title: t("common:error"),
                description: error.message,
                variant: "destructive",
              });
            }
          }}
          defaultPaymentPlanId={defaultPaymentPlanId}
        />
      </div>

      <Separator />

      <div className="space-y-6" id="publish">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="course-published" className="text-base font-semibold">{t("course:manage.published_label")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("course:manage.published_desc")}
            </p>
          </div>
          <Switch
            id="course-published"
            checked={published}
            onCheckedChange={(checked) => {
              setPublished(checked);
              updatePublishedStatus(checked);
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="course-allow-enrollment" className="text-base font-semibold">
            {t("course:manage.allow_enrollment_label")}
          </Label>
        </div>
        <Switch
          id="course-allow-enrollment"
          checked={allowEnrollment}
          onCheckedChange={async (checked) => {
            setAllowEnrollment(checked);
            await updateAllowEnrollment(checked);
          }}
          disabled={!published}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="course-allow-self-enrollment" className="text-base font-semibold">
            {t("course:manage.allow_self_enrollment_label")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("course:manage.allow_self_enrollment_desc")}
          </p>
        </div>
        <Switch
          id="course-allow-self-enrollment"
          checked={allowSelfEnrollment}
          onCheckedChange={async (checked) => {
            setAllowSelfEnrollment(checked);
            await updateAllowSelfEnrollment(checked);
          }}
          disabled={!published}
        />
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-destructive font-semibold">
          {t("course:manage.danger_zone")}
        </h2>
        <Button
          type="button"
          variant="destructive"
          disabled={isSaving}
          onClick={async () => {
            const result = await NiceModal.show(DeleteConfirmNiceDialog, {
              title: t("course:manage.delete_dialog_title"),
              message: t("course:manage.delete_dialog_message", { title: product.title }),
            });

            if (result.reason === "confirm") {
              await deleteCourseMutation.mutateAsync({ id: product._id });
            }
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t("course:manage.delete_button")}
        </Button>
      </div>
    </DashboardContent>
  );
}
