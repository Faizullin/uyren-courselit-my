"use client";

import { trpc } from "@/utils/trpc";
import { DeleteConfirmNiceDialog, NiceModal, useDialogControl, useToast } from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { OrganizationCreateDialog } from "./organization-create-dialog";

export default function OrganizationsList() {
  const { toast } = useToast();
  const createDialog = useDialogControl();
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const listOrganizationsQuery = trpc.siteModule.organization.list.useQuery({
    pagination: {
      skip: page * pageSize,
      take: pageSize,
    },
    orderBy: {
      field: "createdAt",
      direction: "desc",
    },
  });

  const deleteOrganizationMutation =
    trpc.siteModule.organization.delete.useMutation({
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Organization deleted successfully",
        });
        listOrganizationsQuery.refetch();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const handleDelete = (organization: any) => {
    NiceModal.show(DeleteConfirmNiceDialog, {
      title: "Delete Organization",
      data: organization,
      message: `Are you sure you want to delete "${organization.name}"? This action cannot be undone.`,
    }).then((result) => {
      if (result.reason === "confirm") {
        deleteOrganizationMutation.mutateAsync({
          id: organization._id,
        });
      }
    });
  };

  const isLoading = listOrganizationsQuery.isLoading;
  const isDeleting = deleteOrganizationMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Organizations</h2>
          <p className="text-sm text-muted-foreground">
            Manage all organizations in the system
          </p>
        </div>
        <Button onClick={() => createDialog.show()} disabled={isLoading}>
          <Plus className="w-4 h-4 mr-2" />
          New Organization
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <p className="text-muted-foreground">Loading organizations...</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listOrganizationsQuery.data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <p className="text-muted-foreground">
                        No organizations found. Create one to get started.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  listOrganizationsQuery.data?.items.map((org) => (
                    <TableRow key={org._id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>{org.email}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {org.slug}
                        </code>
                      </TableCell>
                      <TableCell>{org.phone || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isDeleting}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(org)}
                            disabled={isDeleting}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {listOrganizationsQuery.data && listOrganizationsQuery.data.total && listOrganizationsQuery.data.total > pageSize && (
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Showing {page * pageSize + 1} to{" "}
                {Math.min(
                  (page + 1) * pageSize,
                  listOrganizationsQuery.data.total,
                )}{" "}
                of {listOrganizationsQuery.data.total} organizations
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0 || isLoading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={
                    !listOrganizationsQuery.data?.total ||
                    (page + 1) * pageSize >=
                      listOrganizationsQuery.data.total ||
                    isLoading
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <OrganizationCreateDialog control={createDialog} />
    </div>
  );
}

