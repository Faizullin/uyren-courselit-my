"use client";

import DashboardContent from "@/components/admin/dashboard-content";
import { ProductCard, ProductSkeletonCard } from "@/components/products/product-card";
import Resources from "@/components/resources";
import { useDialogControl } from "@/hooks/use-dialog-control";
import {
  BTN_NEW_PRODUCT,
  MANAGE_COURSES_PAGE_HEADING,
} from "@/lib/ui/config/strings";
import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { Constants, CourseType, UIConstants } from "@workspace/common-models";
import {
  useToast
} from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { capitalize } from "@workspace/utils";
import {
  Plus
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import z from "zod";

const ITEMS_PER_PAGE = 9;

const { permissions } = UIConstants;

const breadcrumbs = [{ label: MANAGE_COURSES_PAGE_HEADING, href: "#" }];
const ProductSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be less than 255 characters"),
  type: z.enum([Constants.CourseType.COURSE, Constants.CourseType.DOWNLOAD]),
});
type ProductFormDataType = z.infer<typeof ProductSchema>;

function CreateProductDialog() {
  const { toast } = useToast();
  const router = useRouter();
  const dialogControl = useDialogControl();

  const form = useForm<ProductFormDataType>({
    resolver: zodResolver(ProductSchema),
    defaultValues: {
      title: "",
      type: Constants.CourseType.COURSE,
    },
  });

  const createCourseMutation =
    trpc.lmsModule.courseModule.course.create.useMutation({
      onSuccess: (response) => {
        toast({
          title: "Success",
          description: "Product created successfully",
        });
        dialogControl.close();
        router.push(`/dashboard/products/${response.courseId}`);
      },
      onError: (err: any) => {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      },
    });

  const handleSubmit = async (data: ProductFormDataType) => {
    try {
      await createCourseMutation.mutateAsync({
        data: {
          title: data.title,
          type: data.type,
        },
      });
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const isSubmitting = form.formState.isSubmitting;
  const isSaving = createCourseMutation.isPending;

  return (
    <Dialog
      open={dialogControl.visible}
      onOpenChange={dialogControl.setVisible}
    >
      <DialogTrigger asChild>
        <Button onClick={() => dialogControl.open()}>
          <Plus className="h-4 w-4 mr-2" />
          {BTN_NEW_PRODUCT}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter product title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl className="w-full">
                      <SelectTrigger>
                        <SelectValue>
                          {field.value === Constants.CourseType.COURSE
                            ? "Course"
                            : "Download"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={Constants.CourseType.COURSE}>
                        <div>
                          <div className="font-medium">Course</div>
                          <div className="text-sm text-muted-foreground">
                            Interactive learning experience
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value={Constants.CourseType.DOWNLOAD}>
                        <div>
                          <div className="font-medium">Download</div>
                          <div className="text-sm text-muted-foreground">
                            Digital file or resource
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={dialogControl.close}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || isSubmitting}>
                {isSaving || isSubmitting ? "Creating..." : "Create Product"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Page() {
  const searchParams = useSearchParams();
  const page = parseInt(searchParams?.get("page") || "1");
  const filter: "all" | CourseType =
    (searchParams?.get("filter") as "all" | CourseType) || "all";
  // const [page, setPage] = useState(parseInt(searchParams?.get("page") || "1") || 1);
  // const [filter, setFilter] = useState<"all" | CourseType>(searchParams?.get("filter") as "all" | CourseType || "all");
  const router = useRouter();

  const filterArray = useMemo(
    () => (filter === "all" ? undefined : [filter]),
    [filter],
  );

  const listQuery = trpc.lmsModule.product.list.useQuery({
    pagination: {
      take: ITEMS_PER_PAGE,
      skip: (page - 1) * ITEMS_PER_PAGE,
    },
    filter: {
      filterBy: filterArray as any,
      publicView: false,
    },
  });
  const totalPages = useMemo(() => {
    if (!listQuery.data?.total || !ITEMS_PER_PAGE) return 1;
    return Math.ceil(listQuery.data.total / ITEMS_PER_PAGE);
  }, [listQuery.data, ITEMS_PER_PAGE]);
  const products = useMemo(() => listQuery.data?.items || [], [listQuery.data]);

  const handleFilterChange = useCallback((value: "all" | CourseType) => {
    router.push(
      `/dashboard/products?${value !== "all" ? `filter=${value}` : ""}`,
    );
  }, []);

  return (
    <DashboardContent
      breadcrumbs={breadcrumbs}
      permissions={[permissions.manageAnyCourse, permissions.manageCourse]}
    >
      {/* <Products address={address} loading={false} siteinfo={siteinfo} /> */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-semibold mb-4">
          {MANAGE_COURSES_PAGE_HEADING}
        </h1>
        <div>
          <CreateProductDialog />
        </div>
      </div>
      {totalPages > 0 && (
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <Select value={filter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {[Constants.CourseType.COURSE, Constants.CourseType.DOWNLOAD].map(
                (status) => (
                  <SelectItem value={status} key={status}>
                    {capitalize(status)}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listQuery.isLoading ? (
          <>
            {[...Array(6)].map((_, index) => (
              <ProductSkeletonCard key={index} />
            ))}
          </>
        ) : (
          <>
            {totalPages > 0 && (
              <>
                {products.map((product, index) => (
                  <Link key={index} href={`/dashboard/products/${product.courseId}`}>
                    <ProductCard product={product as any} />
                  </Link>
                ))}
              </>
            )}
          </>
        )}
      </div>
      {/* <Resources
        links={[
          {
            href: "https://docs.courselit.app/en/courses/introduction/",
            text: "Create a course",
          },
          {
            href: "https://docs.courselit.app/en/downloads/introduction/",
            text: "Create a digital download",
          },
        ]}
      /> */}
    </DashboardContent>
  );
}
