"use client";

import DashboardContent from "@/components/admin/dashboard-content";
import {
  BTN_INVITE,
  TOAST_TITLE_ERROR,
  TOAST_TITLE_SUCCESS
} from "@/lib/ui/config/strings";
import { formattedLocaleDate } from "@/lib/ui/lib/utils";
import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
import { Constants } from "@workspace/common-models";
import { useToast } from "@workspace/components-library";
import { CheckCircled } from "@workspace/icons";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { truncate } from "@workspace/utils";
import {
  ArrowLeft,
  Circle,
  Copy,
  Eye,
  MoreHorizontal,
  Search,
  UserPlus
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type MemberType =
  GeneralRouterOutputs["lmsModule"]["courseModule"]["course"]["getMembers"]["items"][number] & {
    progressInPercentage?: number;
  };

interface ProductCustomersClientProps {
  product: any;
}

interface CustomerFormData {
  email: string;
  tags: string[];
}

export default function ProductCustomersClient({
  product,
}: ProductCustomersClientProps) {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerFormData, setCustomerFormData] = useState<CustomerFormData>({
    email: "",
    tags: [],
  });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [members, setMembers] = useState<MemberType[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const breadcrumbs = [
    { label: "Products", href: "/dashboard/products" },
    {
      label: product.title || "Product",
      href: `/dashboard/products/${product.courseId}`,
    },
    { label: "Customers", href: "#" },
  ];

  const loadMembersQuery =
    trpc.lmsModule.courseModule.course.getMembers.useQuery(
      {
        filter: {
          courseId: productId,
        },
        pagination: {
          take: 1000,
          skip: 0,
        },
      },
      { enabled: !!product },
    );

  const loadTagsQuery = trpc.userModule.tag.list.useQuery();
  const systemTags = useMemo(
    () => loadTagsQuery.data || [],
    [loadTagsQuery.data],
  );

  const inviteCustomerMutation =
    trpc.userModule.user.inviteCustomer.useMutation();

  useEffect(() => {
    setLoading(loadMembersQuery.isLoading);
  }, [loadMembersQuery.isLoading]);

  useEffect(() => {
    if (!loadMembersQuery.data) return;
    const computed = loadMembersQuery.data.items.map((member) => ({
      ...member,
      progressInPercentage:
        product?.type === Constants.CourseType.COURSE &&
          product?.lessons?.length! > 0
          ? Math.round(
            ((member.completedLessons?.length || 0) /
              (product?.lessons?.length || 0)) *
            100,
          )
          : undefined,
    }));
    setMembers(computed);
  }, [loadMembersQuery.data, product]);

  const filteredMembers = members.filter(
    (member) =>
      member.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.user?.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerFormData.email.trim()) {
      toast({
        title: TOAST_TITLE_ERROR,
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingCustomer(true);
      const response = await inviteCustomerMutation.mutateAsync({
        data: {
          email: customerFormData.email,
          tags: customerFormData.tags,
          courseId: productId,
        },
      });

      if (response) {
        setCustomerFormData({ email: "", tags: [] });
        setCustomerDialogOpen(false);
        const message = `${response.email} has been invited.`;
        toast({
          title: TOAST_TITLE_SUCCESS,
          description: message,
        });
        // Refetch members to show the new customer
        loadMembersQuery.refetch();
      }
    } catch (err: any) {
      toast({
        title: TOAST_TITLE_ERROR,
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Success",
      description: "Subscription ID is copied to clipboard",
    });
  };

  return (
    <DashboardContent breadcrumbs={breadcrumbs}>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-semibold">Customers</h1>
            <p className="text-muted-foreground mt-2">
              Manage customers for {product.title}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog
              open={customerDialogOpen}
              onOpenChange={setCustomerDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Customer</DialogTitle>
                  <DialogDescription>
                    Invite a new customer to this product by entering their
                    email address and optional tags.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCustomerSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="customer@example.com"
                      value={customerFormData.email}
                      onChange={(e) =>
                        setCustomerFormData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  {/* <div className="space-y-2">
                    <Label>{USER_TAGS_SUBHEADER}</Label>
                    <ComboBox2
                      key={
                        JSON.stringify(systemTags) +
                        JSON.stringify(customerFormData.tags)
                      }
                      side="bottom"
                      options={systemTags}
                      selectedOptions={new Set(customerFormData.tags)}
                      onChange={(values: string[]) =>
                        setCustomerFormData((prev) => ({
                          ...prev,
                          tags: values,
                        }))
                      }
                    />
                  </div> */}
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCustomerDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        savingCustomer || !customerFormData.email.trim()
                      }
                    >
                      {savingCustomer ? "Inviting..." : BTN_INVITE}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/dashboard/products/${product.courseId}`)
              }
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Product
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    {product?.type?.toLowerCase() ===
                      Constants.CourseType.COURSE
                      ? "Progress"
                      : "Downloaded"}
                  </TableHead>
                  <TableHead>Signed Up</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(5)
                    .fill(0)
                    .map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                            <div className="h-4 w-[200px] bg-muted animate-pulse rounded" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-[100px] bg-muted animate-pulse rounded" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-[100px] bg-muted animate-pulse rounded" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-[100px] bg-muted animate-pulse rounded" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-[100px] bg-muted animate-pulse rounded" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-[80px] bg-muted animate-pulse rounded" />
                        </TableCell>
                      </TableRow>
                    ))
                ) : filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {member.user && (
                          <Link href={`/dashboard/users/${member.user.userId}`}>
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={
                                    member.user.avatar?.thumbnail ||
                                    "/courselit_backdrop_square.webp"
                                  }
                                  alt={member.user.name || member.user.email}
                                />
                                <AvatarFallback>
                                  {(
                                    member.user.name || member.user.email
                                  ).charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span>
                                {member.user.name || member.user.email}
                              </span>
                            </div>
                          </Link>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.status.toLowerCase() === "pending"
                              ? "secondary"
                              : member.status.toLowerCase() === "active"
                                ? "default"
                                : "destructive"
                          }
                        >
                          {member.status.charAt(0).toUpperCase() +
                            member.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {product?.type?.toLowerCase() ===
                          Constants.CourseType.COURSE ? (
                          <>
                            {product?.lessons?.length! > 0 && (
                              <div className="flex items-center space-x-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2.5">
                                  <div
                                    className="bg-primary h-2.5 rounded-full"
                                    style={{
                                      width: `${member.progressInPercentage}%`,
                                    }}
                                  ></div>
                                </div>
                                <span>{member.progressInPercentage}%</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center space-x-2">
                            {!!member.downloaded ? (
                              <CheckCircled className="h-4 w-4 text-green-600" />
                            ) : (
                              <Circle className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {formattedLocaleDate(member.createdAt)}
                      </TableCell>
                      <TableCell>
                        {formattedLocaleDate(member.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {member.subscriptionId
                              ? truncate(member.subscriptionId, 10)
                              : "-"}
                          </span>
                          {member.subscriptionId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleCopyToClipboard(
                                  member.subscriptionId || "",
                                )
                              }
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/dashboard/users/${member.user?.userId}`}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Profile
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardContent>
  );
}
