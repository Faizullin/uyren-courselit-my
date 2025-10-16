"use client";

import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormDialog, useDialogControl, useToast } from "@workspace/components-library";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { slugify } from "@workspace/utils";
import { useForm } from "react-hook-form";
import { z } from "zod";

const organizationSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email address"),
  description: z.string().max(1000).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

interface OrganizationCreateDialogProps {
  control: ReturnType<typeof useDialogControl>;
  onSuccess?: () => void;
}

export function OrganizationCreateDialog({
  control,
  onSuccess,
}: OrganizationCreateDialogProps) {
  const { toast } = useToast();
  const trpcUtils = trpc.useUtils();

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
      email: "",
      description: "",
      phone: "",
      address: "",
    },
  });

  const createOrganizationMutation =
    trpc.siteModule.organization.create.useMutation({
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Organization created successfully",
        });
        control.hide();
        form.reset();
        trpcUtils.siteModule.organization.list.invalidate();
        onSuccess?.();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const handleSubmit = async (data: OrganizationFormData) => {
    await createOrganizationMutation.mutateAsync({
      data: {
        name: data.name,
        slug: slugify(data.name),
        email: data.email,
        description: data.description,
        phone: data.phone,
        address: data.address,
      },
    });
  };

  return (
    <FormDialog
      open={control.isVisible}
      onOpenChange={(open) => {
        if (!open) {
          control.hide();
          form.reset();
        }
      }}
      title="Create New Organization"
      description="Add a new organization to the system"
      onSubmit={form.handleSubmit(handleSubmit)}
      onCancel={control.hide}
      isLoading={
        createOrganizationMutation.isPending || form.formState.isSubmitting
      }
      submitText="Create Organization"
      cancelText="Cancel"
      maxWidth="xl"
    >
      <Form {...form}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., Acme Corporation"
                    disabled={createOrganizationMutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="e.g., contact@acme.com"
                    disabled={createOrganizationMutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Brief description of the organization..."
                    rows={3}
                    disabled={createOrganizationMutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="tel"
                      placeholder="e.g., +1-555-0123"
                      disabled={createOrganizationMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., 123 Main St, City"
                      disabled={createOrganizationMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </Form>
    </FormDialog>
  );
}

