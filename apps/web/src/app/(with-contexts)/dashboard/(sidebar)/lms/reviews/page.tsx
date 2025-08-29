"use client";

import DashboardContent from "@/components/admin/dashboard-content";
import HeaderTopbar from "@/components/admin/layout/header-topbar";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { useDataTable } from "@/components/data-table/use-data-table";
import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
import { type ColumnDef } from "@tanstack/react-table";
import { NiceModal } from "@workspace/components-library";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { useDebounce } from "@workspace/ui/hooks/use-debounce";
import { Archive, Edit, MoreHorizontal, Plus, Star, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ReviewFormDialog } from "./_components/review-form-dialog";

const breadcrumbs = [
  { label: "LMS", href: "#" },
  { label: "Reviews", href: "#" },
];

type ItemType =
  GeneralRouterOutputs["lmsModule"]["reviewModule"]["review"]["list"]["items"][number];
type QueryParams = Parameters<
  typeof trpc.lmsModule.reviewModule.review.list.useQuery
>[0];

export default function Page() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [parsedData, setParsedData] = useState<Array<ItemType>>([]);
  const [parsedPageination, setParsedPagination] = useState({
    pageCount: 1,
  });

  const deleteMutation = trpc.lmsModule.reviewModule.review.delete.useMutation({
    onSuccess: () => {
      loadListQuery.refetch();
    },
  });

  const handleDelete = useCallback(
    (review: ItemType) => {
      if (confirm("Are you sure you want to delete this review? This action cannot be undone.")) {
        deleteMutation.mutate({ reviewId: review.reviewId });
      }
    },
    [deleteMutation],
  );

  const handleCreateReview = useCallback(async () => {
    const result = await NiceModal.show(ReviewFormDialog, {
      mode: "create",
    });
    if (result.reason === "submit") {
      loadListQuery.refetch();
    }
  }, []);

  const handleEditReview = useCallback(async (review: ItemType) => {
    const result = await NiceModal.show(ReviewFormDialog, {
      mode: "edit",
      reviewId: review.reviewId,
    });
    if (result.reason === "submit") {
      loadListQuery.refetch();
    }
  }, []);

  const columns: ColumnDef<ItemType>[] = useMemo(() => {
    return [
      {
        accessorKey: "title",
        header: "Review Title",
                cell: ({ row }) => {
          const review = row.original;
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={
                    review.author?.avatar?.thumbnail ||
                    "/courselit_backdrop_square.webp"
                  }
                  alt={review.author?.name || review.author?.userId}
                />
                <AvatarFallback>
                  {(review.author?.name || " ").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{review.title}</div>
                <div className="text-sm text-muted-foreground">
                  {review.author?.name || review.authorId || "Anonymous"}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "rating",
        header: "Rating",
        cell: ({ row }) => {
          const rating = row.original.rating;
          return (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <span className="font-medium">{rating}/10</span>
            </div>
          );
        },
      },
      {
        accessorKey: "targetType",
        header: "Target Type",
        cell: ({ row }) => {
          const targetType = row.original.targetType;
          return (
            <Badge variant="outline">
              {targetType.charAt(0).toUpperCase() + targetType.slice(1)}
            </Badge>
          );
        },
        meta: {
          label: "Target Type",
          variant: "select",
          options: [
            { label: "Website", value: "website" },
            { label: "Course", value: "course" },
            { label: "Product", value: "product" },
            { label: "Blog", value: "blog" },
          ],
        },
        enableColumnFilter: true,
      },
      {
        accessorKey: "published",
        header: "Status",
        cell: ({ row }) => {
          const published = row.original.published;
          const isFeatured = row.original.isFeatured;
          
          if (isFeatured) {
            return <Badge variant="default">Featured</Badge>;
          }
          
          return (
            <Badge variant={published ? "default" : "secondary"}>
              {published ? "Published" : "Draft"}
            </Badge>
          );
        },
        meta: {
          label: "Status",
          variant: "select",
          options: [
            { label: "Published", value: "true" },
            { label: "Draft", value: "false" },
          ],
        },
        enableColumnFilter: true,
      },
             {
         accessorKey: "authorId",
         header: "Linked User",
         cell: ({ row }) => {
           const authorId = row.original.authorId;
           if (!authorId) {
             return <span className="text-muted-foreground">Not linked</span>;
           }
           return (
             <div className="flex items-center gap-2">
               <User className="h-4 w-4 text-blue-500" />
               <span className="text-sm font-medium">{authorId}</span>
             </div>
           );
         },
       },
       {
         accessorKey: "tags",
         header: "Tags",
         cell: ({ row }) => {
           const tags = row.original.tags || [];
           if (tags.length === 0) {
             return <span className="text-muted-foreground">No tags</span>;
           }
           return (
             <div className="flex flex-wrap gap-1">
               {tags.slice(0, 3).map((tag, index) => (
                 <Badge key={index} variant="outline" className="text-xs">
                   {tag}
                 </Badge>
               ))}
               {tags.length > 3 && (
                 <Badge variant="outline" className="text-xs">
                   +{tags.length - 3}
                 </Badge>
               )}
             </div>
           );
         },
       },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => {
          const date = row.getValue("createdAt") as string;
          return (
            <div className="text-sm text-muted-foreground">
              {new Date(date).toLocaleDateString()}
            </div>
          );
        },
        meta: {
          label: "Created Date",
          variant: "date",
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const review = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditReview(review)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Review
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(review)}
                  className="text-red-600"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Delete Review
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ];
  }, [handleDelete, handleEditReview]);

  const { table } = useDataTable({
    columns,
    data: parsedData,
    pageCount: parsedPageination.pageCount,
    enableGlobalFilter: true,
    initialState: {
      sorting: [{ id: "createdAt", desc: true }],
    },
  });

  const tableState = table.getState();
  const queryParams = useMemo(() => {
    const parsed: QueryParams = {
      pagination: {
        skip: tableState.pagination.pageIndex * tableState.pagination.pageSize,
        take: tableState.pagination.pageSize,
      },
      filter: {
        published: Array.isArray(
          tableState.columnFilters.find((filter) => filter.id === "published")
            ?.value,
        )
          ? (tableState.columnFilters.find((filter) => filter.id === "published")
              ?.value as string[])[0] === "true"
          : undefined,
        targetType: Array.isArray(
          tableState.columnFilters.find((filter) => filter.id === "targetType")
            ?.value,
        )
          ? (tableState.columnFilters.find((filter) => filter.id === "targetType")
              ?.value as string[])[0]
          : undefined,
      },
    };

    if (tableState.sorting[0]) {
      parsed.orderBy = {
        field: tableState.sorting[0].id as any,
        direction: tableState.sorting[0].desc ? "desc" : "asc",
      };
    }

    if (debouncedSearchQuery) {
      parsed.search = {
        q: debouncedSearchQuery,
      };
    }

    return parsed;
  }, [
    tableState.sorting,
    tableState.pagination,
    tableState.columnFilters,
    tableState.globalFilter,
    debouncedSearchQuery,
  ]);

  const loadListQuery =
    trpc.lmsModule.reviewModule.review.list.useQuery(queryParams);

  useEffect(() => {
    if (!loadListQuery.data) return;
    const parsed = loadListQuery.data.items || [];
    setParsedData(parsed);
    setParsedPagination({
      pageCount: Math.ceil(
        (loadListQuery.data.total || 0) / loadListQuery.data.meta.take,
      ),
    });
  }, [loadListQuery.data]);

  return (
    <DashboardContent breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-4">
        <HeaderTopbar
          header={{
            title: "Reviews",
            subtitle: "Manage customer reviews and testimonials",
          }}
          rightAction={
            <Button onClick={handleCreateReview} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Review
            </Button>
          }
        />
        <Card>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Input
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-8 w-40 lg:w-56"
              />
              <DataTable table={table}>
                <DataTableToolbar table={table} />
              </DataTable>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardContent>
  );
}
