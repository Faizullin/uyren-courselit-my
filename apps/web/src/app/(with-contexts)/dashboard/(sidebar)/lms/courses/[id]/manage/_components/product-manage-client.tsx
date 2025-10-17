"use client";

import { useSiteInfo } from "@/components/contexts/site-info-context";
import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import PaymentPlanList from "@/components/dashboard/payments/payment-plan-list";
import { removeFeaturedImage, uploadFeaturedImage } from "@/server/actions/course/media";
import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { Editor } from "@tiptap/react";
import { PublicationStatusEnum } from "@workspace/common-logic/lib/publication_status";
import { ITextEditorContent } from "@workspace/common-logic/lib/text-editor-content";
import { IAttachmentMedia } from "@workspace/common-logic/models/media.types";
import { IPaymentPlan, PaymentPlanTypeEnum } from "@workspace/common-logic/models/payment/payment-plan.types";
import { SerializedCourse } from "../../_components/types";
import { useCourseContext } from "../../_components/course-context";
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
import { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";

const DescriptionEditor = dynamic(() =>
  import(
    "@/components/editors/tiptap/templates/description/description-editor"
  ).then((mod) => ({ default: mod.DescriptionEditor })),
);

const ProductSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be less than 255 characters"),
  shortDescription: z
    .string()
    .max(500, "Short description must be less than 500 characters")
    .optional(),
  description: z.custom<ITextEditorContent>().optional(),
  themeId: z.string().nullable(),
});

type ProductFormDataType = z.infer<typeof ProductSchema>;

interface ProductManageClientProps {
  product: SerializedCourse;
}

interface UsePaymentPlanOperationsProps {
  id: string;
}

type PaymentPlanWithId = IPaymentPlan & { _id: string };

function usePaymentPlanOperations({
  id,
}: UsePaymentPlanOperationsProps) {
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlanWithId[]>([]);
  const [defaultPaymentPlanId, setDefaultPaymentPlanId] = useState<string>();

  const createPaymentPlanMutation = trpc.paymentModule.paymentPlan.create.useMutation();
  const archivePaymentPlanMutation =  trpc.paymentModule.paymentPlan.archive.useMutation();
  const setDefaultPlanMutation = trpc.paymentModule.paymentPlan.setDefault.useMutation();

  const onPlanSubmitted = useCallback(async (values: any) => {
    try {
      const response = await createPaymentPlanMutation.mutateAsync({
        data: values,
      });
      setPaymentPlans([...paymentPlans, response as unknown as PaymentPlanWithId]);
    } catch (error) {
      console.error("Error submitting plan:", error);
    }
  }, [createPaymentPlanMutation, paymentPlans]);

  const onPlanArchived = useCallback(async (plan: PaymentPlanWithId) => {
    const response = await archivePaymentPlanMutation.mutateAsync({
      id: plan._id,
    });
    setPaymentPlans(paymentPlans.filter((p) => p._id !== plan._id));
    return response;
  }, [archivePaymentPlanMutation, paymentPlans]);

  const onDefaultPlanChanged = useCallback(async (plan: PaymentPlanWithId) => {
    const response = await setDefaultPlanMutation.mutateAsync({
      id: plan._id,
    });
    if (response) {
      setDefaultPaymentPlanId(plan._id);
    }
    return response;
  }, [setDefaultPlanMutation, paymentPlans, setDefaultPaymentPlanId, setDefaultPaymentPlanId]);

  return { paymentPlans, defaultPaymentPlanId, onPlanSubmitted, onPlanArchived, onDefaultPlanChanged };
}

export default function ProductManageClient({
  product,
}: ProductManageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { siteInfo } = useSiteInfo();
  const { refetch: refetchCourse } = useCourseContext();
  const trpcUtils = trpc.useUtils();

  const [editorContent, setEditorContent] = useState<ITextEditorContent>({
    type: "doc",
    content: "",
    assets: [],
    widgets: [],
    config: {
      editorType: "tiptap",
    },
  });
  const editorRef = useRef<Editor | null>(null);
  const [featuredImage, setFeaturedImage] = useState<IAttachmentMedia | null>(
    product.featuredImage ? (product.featuredImage as unknown as IAttachmentMedia) : null
  );
  const [published, setPublished] = useState(product.published || false);
  const [selectedTheme, setSelectedTheme] = useState<{
    key: string;
    title: string;
  } | null>(null);

  const {
    paymentPlans,
    defaultPaymentPlanId,
    onPlanSubmitted,
    onPlanArchived,
    onDefaultPlanChanged,
  } = usePaymentPlanOperations({
    id: product._id,
  });

  const [allowEnrollment, setAllowEnrollment] = useState<boolean>(product?.allowEnrollment || false);
  const [allowSelfEnrollment, setAllowSelfEnrollment] = useState<boolean>(product?.allowSelfEnrollment || false);
  const form = useForm<ProductFormDataType>({
    resolver: zodResolver(ProductSchema),
    defaultValues: {
      title: product.title || "",
      shortDescription: product.shortDescription || "",
      description: product.description as ITextEditorContent | undefined,
      themeId: product.themeId || null,
    },
  });
  
  const fetchThemes = useCallback(
    async (search: string, offset: number, size: number) => {
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
    },
    [trpcUtils],
  );

  const updateCourseMutation = trpc.lmsModule.courseModule.course.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Course saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCourseMutation = trpc.lmsModule.courseModule.course.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Course deleted successfully",
      });
      router.push("/dashboard/lms/courses");
    },
    onError: (error) => {
      toast({
        title: "Error",
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
    if (product?.description && typeof product.description !== 'string') {
      setEditorContent(product.description);
    }
    
    const theme = product.theme as { _id: string; name: string } | undefined;
    if (theme) {
      setSelectedTheme({
        key: theme._id || "",
        title: theme.name || "",
      });
    }
  }, [product]);

  const handleSubmit = async (data: ProductFormDataType) => {
    try {
      await updateCourseMutation.mutateAsync({
        id: product._id,
        data: {
          title: data.title,
          shortDescription: data.shortDescription,
          description: editorContent,
          themeId: data.themeId,
        },
      });
    } catch (error) {
      // Error handling is done in the mutation
    }
  };


  const updatePublishedStatus = async (published: boolean) => {
    try {
      await updateCourseMutation.mutateAsync({
        id: product._id,
        data: { published },
      });
    } catch (error) {
      console.error("Error updating published status:", error);
    }
  };

  const isSubmitting = form.formState.isSubmitting;
  const isSaving = updateCourseMutation.isPending;

  useEffect(() => {
    if (product.description) {
      try {
        const parsedDesc =
          typeof product.description === "string"
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

  const breadcrumbs = [
    { label: "Courses", href: "/dashboard/lms/courses" },
    {
      label: product.title || "Course",
      href: `/dashboard/lms/courses/${product._id}`,
    },
    { label: "Manage", href: "#" },
  ];

  return (
    <DashboardContent breadcrumbs={breadcrumbs}>
        <HeaderTopbar
          header={{
            title: "Manage",
            subtitle: " Manage your product settings",
          }}
        />

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6"
        >
          <FieldGroup>
            <Controller
              control={form.control}
              name="title"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel className="text-base font-semibold">
                    Title
                  </FieldLabel>
                  <Input {...field} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="shortDescription"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel className="text-base font-semibold">
                    Short Description
                  </FieldLabel>
                  <Textarea
                    {...field}
                    placeholder="Enter a brief description for your product (max 500 characters)..."
                    maxLength={500}
                    aria-invalid={fieldState.invalid}
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {field.value?.length || 0}/500
                  </div>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Field>
              <FieldLabel
                className="text-base font-semibold"
                onClick={() => {
                  editorRef.current!.commands.focus("end");
                }}
              >
                Description
              </FieldLabel>
              <DescriptionEditor
                placeholder="Enter a detailed description for your product..."
                onEditor={(editor, meta) => {
                  if (meta.reason === "create") {
                    editorRef.current = editor;
                    editorRef.current!.commands.setMyContent(editorContent);
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

            <Controller
              control={form.control}
              name="themeId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel className="text-base font-semibold">
                    Course Theme
                  </FieldLabel>
                  <ComboBox2<{ key: string; title: string }>
                    title="Select a theme"
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
                    onCreateClick={() => {
                      window.open(`/dashboard/lms/themes/new`, "_blank");
                    }}
                    onEditClick={(item) => {
                      window.open(
                        `/dashboard/lms/themes/${item.key}`,
                        "_blank",
                      );
                    }}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Button type="submit" disabled={isSaving || isSubmitting}>
              Save Changes
            </Button>
          </FieldGroup>
        </form>

        <Separator />

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Featured image</h2>
          <p className="text-sm text-muted-foreground">
            The hero image for your product
          </p>
          <MediaSelector
            media={featuredImage}
            onSelection={(media) => {
              if (media) {
                setFeaturedImage(media);
              }
            }}
            onRemove={() => {
              setFeaturedImage(null);
              refetchCourse();
            }}
            mimeTypesToShow={["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]}
            type="course"
            strings={{
              buttonCaption: "Upload Image",
              removeButtonCaption: "Remove",
            }}
            functions={{
              uploadFile: async (files: File[]) => {
                const formData = new FormData();
                files.forEach(file => formData.append("file", file));
                
                const result = await uploadFeaturedImage(product._id, formData);
                
                if (!result.success) {
                  throw new Error(result.error || "Upload failed");
                }
                
                const uploadedMedia = result.media?.[0];
                if (uploadedMedia) {
                  setFeaturedImage(uploadedMedia);
                }
                
                refetchCourse();
                
                toast({
                  title: "Success",
                  description: "Featured image uploaded successfully",
                });
                
                return result.media || [];
              },
              removeFile: async (mediaId: string) => {
                const result = await removeFeaturedImage(product._id);
                
                if (!result.success) {
                  throw new Error(result.error || "Failed to remove image");
                }
                
                toast({
                  title: "Success",
                  description: "Featured image removed successfully",
                });
              }
            }}
          />
        </div>

        <Separator />

        <div className="space-y-4 flex flex-col md:flex-row md:items-start md:justify-between w-full">
          <div className="space-y-2">
            <Label className="text-lg font-semibold">Pricing</Label>
            <p className="text-sm text-muted-foreground">
              Manage your product&apos;s pricing plans
            </p>
          </div>
          <PaymentPlanList
            paymentPlans={paymentPlans.map((plan) => ({
              ...plan,
              type: plan.type,
            }))}
            onPlanSubmit={async (values) => {
              try {
                await onPlanSubmitted(values);
              } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                toast({
                  title: "Error",
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
                  title: "Error",
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
            currencySymbol={getSymbolFromCurrency(
              siteInfo.currencyISOCode || "USD",
            )}
            currencyISOCode={siteInfo.currencyISOCode?.toUpperCase() || "USD"}
            onDefaultPlanChanged={async (id) => {
              try {
                await onDefaultPlanChanged(id);
              } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                toast({
                  title: "Error",
                  description: error.message,
                  variant: "destructive",
                });
              }
            }}
            defaultPaymentPlanId={defaultPaymentPlanId}
            paymentMethod={siteInfo.paymentMethod}
          />
        </div>

        <Separator />

        <div className="space-y-6" id="publish">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Published</Label>
              <p className="text-sm text-muted-foreground">
                Make this course available to users
              </p>
            </div>
            <Switch
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
            <Label className="text-base font-semibold">
              Allow enrollment
            </Label>
            <p className="text-sm text-muted-foreground">
              Automatically activate access when enrolling for free
            </p>
          </div>
          <Switch
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
            <Label className="text-base font-semibold">
              Allow self enrollment
            </Label>
            <p className="text-sm text-muted-foreground">
              Allow students to enroll themselves in this course
            </p>
          </div>
          <Switch
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
            Danger Zone
          </h2>
          <Button
            type="button"
            variant="destructive"
            disabled={isSaving}
            onClick={async () => {
              const result = await NiceModal.show(DeleteConfirmNiceDialog, {
                title: "Delete Course",
                message: `Are you sure you want to delete "${product.title}"? This action cannot be undone. This will permanently delete the course and remove all associated data from our servers.`,
              });

              if (result.reason === "confirm") {
                await deleteCourseMutation.mutateAsync({
                  id: product._id,
                });
              }
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Course
          </Button>
        </div>
    </DashboardContent>
  );
}
