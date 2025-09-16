"use client";

import DashboardContent from "@/components/admin/dashboard-content";
import { useAddress } from "@/components/contexts/address-context";
import Resources from "@/components/resources";
import { useActivities } from "@/hooks/use-activities";
import { TIME_RANGES } from "@/lib/ui/config/constants";
import {
  EDIT_CONTENT_MENU_ITEM,
  EDIT_PAGE_MENU_ITEM,
  MANAGE_COURSES_PAGE_HEADING,
  PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER,
  PRODUCT_UNPUBLISHED_WARNING,
  TOAST_TITLE_SUCCESS,
  VIEW_PAGE_MENU_ITEM,
} from "@/lib/ui/config/strings";
import { trpc } from "@/utils/trpc";
import { Constants } from "@workspace/common-models";
import { useToast } from "@workspace/components-library";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { capitalize, truncate } from "@workspace/utils";
import {
  BookOpen,
  ChevronDown,
  DollarSign,
  Download,
  Eye,
  GraduationCap,
  Settings,
  Share2,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import SalesCard from "./_components/sales-card";
import MetricCard from "./_components/metric-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
const { ActivityType } = Constants;

export default function ProductPage() {
  const [timeRange, setTimeRange] = useState("7d");
  const params = useParams();
  const productId = params.id as string;
  const { address } = useAddress();
  const { toast } = useToast();

  const { data: product, isLoading: productLoading } =
    trpc.lmsModule.courseModule.course.getByCourseDetailed.useQuery({
      courseId: productId,
    });

  const breadcrumbs = [
    { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard/products" },
    {
      label: product ? truncate(product.title || "", 20) || "..." : "...",
      href: "#",
    },
  ];

  const { data: salesData, loading: salesLoading } = useActivities(
    ActivityType.PURCHASED,
    timeRange,
    productId,
    true,
  );

  const handleShareClick = () => {
    if (product?.pageId) {
      navigator.clipboard.writeText(`${address.frontend}/p/${product.pageId}`);
      toast({
        title: TOAST_TITLE_SUCCESS,
        description: "Product URL copied to clipboard!",
      });
    }
  };

  if (productLoading) {
    return (
      <DashboardContent breadcrumbs={breadcrumbs}>
        <div className="space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </DashboardContent>
    );
  }

  if (!product) {
    return (
      <DashboardContent breadcrumbs={breadcrumbs}>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Product not found</p>
        </div>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent breadcrumbs={breadcrumbs}>
      {!product?.published && (
        <div className="bg-red-400 p-2 mb-4 text-sm text-white rounded-md">
          {PRODUCT_UNPUBLISHED_WARNING}{" "}
          <Link
            href={`/dashboard/products/${product.courseId}/manage#publish`}
            className="underline"
          >
            Manage
          </Link>
        </div>
      )}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-semibold flex items-center gap-2">
              {product?.title || <Skeleton className="h-9 w-64" />}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" onClick={handleShareClick} size="sm">
                    <Share2 className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share product</TooltipContent>
              </Tooltip>
            </h1>
            <div className="flex items-center gap-2">
              {product ? (
                <>
                  <Badge variant="secondary">
                    {capitalize(product.type!) === "Course" ? (
                      <BookOpen className="h-4 w-4 mr-1" />
                    ) : (
                      <Download className="h-4 w-4 mr-1" />
                    )}
                    {capitalize(product.type!)}
                  </Badge>
                  <Badge variant="outline">
                    {product.published ? "Published" : "Draft"}
                  </Badge>
                </>
              ) : (
                <Skeleton className="h-5 w-48" />
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={timeRange} onValueChange={setTimeRange} >
              <SelectTrigger className="w-[140px]" size="sm">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/products/${product.courseId}/content`}>
                {EDIT_CONTENT_MENU_ITEM}
              </Link>
            </Button>
            <DropdownMenu >
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Actions
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href={`/dashboard/products/${product.courseId}/customers/new`}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    {PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/products/${product.courseId}/manage`}>
                    <Settings className="mr-2 h-4 w-4" />
                    Manage
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href={`/dashboard/products/${product.courseId}/customers`}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Customers
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="Sales"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          type={ActivityType.PURCHASED}
          duration={timeRange}
          entityId={productId}
        />

        <Link href={`/dashboard/products/${productId}/customers`}>
          <MetricCard
            title="Customers"
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            type={ActivityType.ENROLLED}
            duration={timeRange}
            entityId={productId}
          />
        </Link>
        {product?.type?.toLowerCase() === "course" ? (
          <>
            <MetricCard
              title="People who completed the course"
              icon={<GraduationCap className="h-4 w-4 text-muted-foreground" />}
              type={ActivityType.COURSE_COMPLETED}
              duration={timeRange}
              entityId={productId}
            />
          </>
        ) : (
          <MetricCard
            title="Downloads"
            icon={<Download className="h-4 w-4 text-muted-foreground" />}
            type={ActivityType.DOWNLOADED}
            duration={timeRange}
            entityId={productId}
          />
        )}
      </div>

      <SalesCard data={salesData} loading={salesLoading} />

      {/* <Resources
        links={[
          {
            href: "https://docs.courselit.app/en/products/overview",
            text: "Product Management Guide",
          },
          {
            href: "https://docs.courselit.app/en/products/content",
            text: "Content Management",
          },
        ]}
      /> */}
    </DashboardContent>
  );
}
