"use client";

import { Serialized } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { IPaymentPlan, PaymentPlanTypeEnum } from "@workspace/common-logic/models/payment/payment-plan.types";
import { DeleteConfirmNiceDialog, NiceModal } from "@workspace/components-library";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { capitalize } from "@workspace/utils";
import { Archive, ArchiveRestore, Plus, Star, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";

const formSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    type: z.enum([
      PaymentPlanTypeEnum.FREE,
      PaymentPlanTypeEnum.ONE_TIME,
      PaymentPlanTypeEnum.SUBSCRIPTION,
      PaymentPlanTypeEnum.EMI,
    ]),
    oneTimeAmount: z.number().min(0, "Amount cannot be negative").optional(),
    emiAmount: z.number().min(0, "Amount cannot be negative").optional(),
    emiTotalInstallments: z
      .number()
      .min(0, "Installments cannot be negative")
      .optional(),
    subscriptionMonthlyAmount: z
      .number()
      .min(0, "Amount cannot be negative")
      .optional(),
    subscriptionYearlyAmount: z
      .number()
      .min(0, "Amount cannot be negative")
      .optional(),
    subscriptionType: z.enum(["monthly", "yearly"] as const).optional(),
  })
  .refine(
    (data) => {
      if (data.type === PaymentPlanTypeEnum.SUBSCRIPTION) {
        if (data.subscriptionType === "monthly") {
          return (
            data.subscriptionMonthlyAmount !== undefined &&
            data.subscriptionMonthlyAmount > 0
          );
        }
        if (data.subscriptionType === "yearly") {
          return (
            data.subscriptionYearlyAmount !== undefined &&
            data.subscriptionYearlyAmount > 0
          );
        }
      }
      if (data.type === PaymentPlanTypeEnum.ONE_TIME) {
        return data.oneTimeAmount !== undefined && data.oneTimeAmount > 0;
      }
      if (data.type === PaymentPlanTypeEnum.EMI) {
        return (
          data.emiAmount !== undefined &&
          data.emiAmount > 0 &&
          data.emiTotalInstallments !== undefined &&
          data.emiTotalInstallments > 0
        );
      }
      return true;
    },
    {
      message: "Please fill in all required fields for the selected plan type",
      path: ["type"],
    },
  );

function formatAmount(
  amount: number | undefined,
  currencySymbol: string,
): string {
  return amount ? `${currencySymbol}${amount.toFixed(2)}` : "Free";
}

function getPlanAmount(
  plan: Serialized<IPaymentPlan>,
  currencySymbol: string,
): string | { amount: string; installments: number } {
  switch (plan.type) {
    case PaymentPlanTypeEnum.FREE:
      return capitalize(PaymentPlanTypeEnum.FREE);
    case PaymentPlanTypeEnum.ONE_TIME:
      return formatAmount(plan.oneTimeAmount, currencySymbol);
    case PaymentPlanTypeEnum.SUBSCRIPTION:
      return formatAmount(
        plan.subscriptionMonthlyAmount || plan.subscriptionYearlyAmount,
        currencySymbol,
      );
    case PaymentPlanTypeEnum.EMI:
      return {
        amount: formatAmount(plan.emiAmount, currencySymbol),
        installments: plan.emiTotalInstallments || 0,
      };
    default:
      return "N/A";
  }
}

function getPlanTypeLabel(plan: Serialized<IPaymentPlan>): string {
  const { type } = plan;

  switch (type) {
    case PaymentPlanTypeEnum.ONE_TIME:
      return "One time";
    case PaymentPlanTypeEnum.SUBSCRIPTION:
      return plan.subscriptionYearlyAmount ? "Yearly" : "Monthly";
    case PaymentPlanTypeEnum.EMI:
      return "EMI";
    case PaymentPlanTypeEnum.FREE:
      return "Free";
    default:
      return type;
  }
}

type IPaymentPlanWithId = Serialized<IPaymentPlan & { _id: string }>;

interface PaymentPlanListProps {
  paymentPlans: Array<IPaymentPlanWithId>;
  archivedPlans?: Array<IPaymentPlanWithId>;
  onPlanSubmit: (values: z.infer<typeof formSchema>) => void;
  onPlanArchived: (plan: IPaymentPlanWithId) => void;
  onPlanRestored?: (plan: IPaymentPlanWithId) => void;
  onPlanDeleted?: (plan: IPaymentPlanWithId) => void;
  allowedPlanTypes?: PaymentPlanTypeEnum[];
  currencySymbol?: string;
  currencyISOCode?: string;
  onDefaultPlanChanged?: (plan: IPaymentPlanWithId) => void;
  defaultPaymentPlanId?: string;
  userRoles?: string[];
}

export default function PaymentPlanList({
  paymentPlans = [],
  archivedPlans = [],
  onPlanSubmit,
  onPlanArchived,
  onPlanRestored,
  onPlanDeleted,
  allowedPlanTypes = [
    PaymentPlanTypeEnum.FREE,
    PaymentPlanTypeEnum.ONE_TIME,
    PaymentPlanTypeEnum.SUBSCRIPTION,
    PaymentPlanTypeEnum.EMI,
  ],
  currencySymbol = "$",
  currencyISOCode = "USD",
  onDefaultPlanChanged,
  defaultPaymentPlanId,
  userRoles = [],
}: PaymentPlanListProps) {
  const { t } = useTranslation(["payment", "common"]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [planType, setPlanType] = useState<PaymentPlanTypeEnum>(
    PaymentPlanTypeEnum.FREE,
  );
  const [subscriptionType, setSubscriptionType] = useState<
    "monthly" | "yearly"
  >("monthly");

  const isAdmin = userRoles.includes(UIConstants.roles.admin);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: PaymentPlanTypeEnum.FREE,
      oneTimeAmount: 0,
      emiAmount: 0,
      emiTotalInstallments: 0,
      subscriptionMonthlyAmount: 0,
      subscriptionYearlyAmount: 0,
      subscriptionType: "monthly",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onPlanSubmit(values);
    handleFormVisibility(false);
  }

  async function handleArchive(plan: IPaymentPlanWithId) {
    const result = await NiceModal.show(DeleteConfirmNiceDialog, {
      title: "Archive Payment Plan",
      message: `Are you sure you want to archive "${plan.name}"? This action cannot be undone.`,
    });

    if (result.reason === "confirm") {
      onPlanArchived(plan);
    }
  }

  function handleFormVisibility(visible: boolean) {
    setIsFormVisible(visible);
    if (!visible) {
      setPlanType(PaymentPlanTypeEnum.FREE);
      setSubscriptionType("monthly");
      form.reset();
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {paymentPlans.map((plan, index) => (
          <div
            key={index}
            className="p-4 border rounded-lg bg-background hover:border-primary/50 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-base font-semibold">{plan.name}</h3>
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onDefaultPlanChanged?.(plan)}
                        disabled={defaultPaymentPlanId === plan._id}
                      >
                        <Star
                          className="h-4 w-4"
                          fill={defaultPaymentPlanId === plan._id ? "currentColor" : "none"}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Make default</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleArchive(plan)}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Archive plan</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium">
                {(() => {
                  const planAmount = getPlanAmount(plan, currencySymbol);
                  if (typeof planAmount === "string") {
                    return planAmount;
                  }
                  return `${planAmount.amount} × ${planAmount.installments}`;
                })()}
              </span>
              <Badge variant="secondary" className="rounded-full">
                {getPlanTypeLabel(plan)}
              </Badge>
            </div>
          </div>
        ))}
        {!isFormVisible ? (
          <div
            onClick={() => handleFormVisibility(true)}
            className="p-4 border border-dashed rounded-lg bg-background hover:border-primary/50 transition-colors group cursor-pointer"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-base font-medium text-muted-foreground group-hover:text-primary">
                New Plan
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-50 group-hover:opacity-100"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg text-muted-foreground">
                {currencySymbol}0.00
              </span>
              <Badge variant="secondary" className="rounded-full">
                Payment frequency
              </Badge>
            </div>
          </div>
        ) : (
          <div className="p-4 border rounded-lg bg-background">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Create New Plan</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleFormVisibility(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FieldGroup>
                <Controller
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Plan Name</FieldLabel>
                      <Input 
                        placeholder="Enter plan name" 
                        {...field} 
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="type"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Plan Type</FieldLabel>
                      <Select
                        name={field.name}
                        value={field.value}
                        onValueChange={(value: PaymentPlanTypeEnum) => {
                          field.onChange(value);
                          setPlanType(value);
                        }}
                      >
                        <SelectTrigger aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder="Select a plan type" />
                        </SelectTrigger>
                        <SelectContent>
                          {allowedPlanTypes.includes(PaymentPlanTypeEnum.FREE) && (
                            <SelectItem value={PaymentPlanTypeEnum.FREE}>
                              Free
                            </SelectItem>
                          )}
                          {allowedPlanTypes.includes(PaymentPlanTypeEnum.EMI) && (
                            <SelectItem
                              value={PaymentPlanTypeEnum.EMI}
                            >
                              EMI
                            </SelectItem>
                          )}
                          {allowedPlanTypes.includes(
                              PaymentPlanTypeEnum.SUBSCRIPTION,
                          ) && (
                            <SelectItem
                              value={PaymentPlanTypeEnum.SUBSCRIPTION}
                            >
                              Subscription
                            </SelectItem>
                          )}
                          {allowedPlanTypes.includes(
                            PaymentPlanTypeEnum.ONE_TIME,
                          ) && (
                            <SelectItem
                              value={PaymentPlanTypeEnum.ONE_TIME}
                            >
                              One-time
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                {planType === PaymentPlanTypeEnum.ONE_TIME && (
                  <Controller
                    control={form.control}
                    name="oneTimeAmount"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>One-time Amount (Required)</FieldLabel>
                        <div className="flex items-center border rounded-md">
                          <span className="text-muted-foreground text-sm pl-2">
                            {currencySymbol}
                          </span>
                          <Input
                            type="number"
                            className="border-0 focus-visible:ring-0 focus:outline-none"
                            placeholder="Enter amount"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value))
                            }
                            aria-invalid={fieldState.invalid}
                          />
                          <span className="text-muted-foreground text-sm pr-2">
                            {currencyISOCode}
                          </span>
                        </div>
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                )}
                {planType === PaymentPlanTypeEnum.EMI && (
                  <Field>
                    <FieldLabel>
                      Monthly payments (All fields required)
                    </FieldLabel>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Controller
                          control={form.control}
                          name="emiTotalInstallments"
                          render={({ field, fieldState }) => (
                            <div>
                              <div className="flex items-center border rounded-md">
                                <Input
                                  type="number"
                                  className="border-0 focus-visible:ring-0 focus:outline-none"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseInt(e.target.value),
                                    )
                                  }
                                  placeholder="Enter number"
                                  aria-invalid={fieldState.invalid}
                                />
                                <span className="text-muted-foreground text-sm pr-2">
                                  payments
                                </span>
                              </div>
                              {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                              )}
                            </div>
                          )}
                        />
                      </div>
                      <span className="text-muted-foreground">×</span>
                      <div className="flex-1">
                        <Controller
                          control={form.control}
                          name="emiAmount"
                          render={({ field, fieldState }) => (
                            <div>
                              <div className="flex items-center border rounded-md">
                                <span className="text-muted-foreground text-sm pl-2">
                                  {currencySymbol}
                                </span>
                                <Input
                                  type="number"
                                  className="border-0 focus-visible:ring-0 focus:outline-none"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseFloat(e.target.value),
                                    )
                                  }
                                  placeholder="Enter amount"
                                  aria-invalid={fieldState.invalid}
                                />
                                <span className="text-muted-foreground text-sm pr-2">
                                  {currencyISOCode}
                                </span>
                              </div>
                              {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                              )}
                            </div>
                          )}
                        />
                      </div>
                    </div>
                    <div className="flex items-center mt-2">
                      <span className="text-muted-foreground text-sm mr-1">
                        Total:
                      </span>
                      <span className="font-medium">
                        {currencySymbol}
                        {(form.watch("emiAmount") || 0) *
                          (form.watch("emiTotalInstallments") || 0)}
                      </span>
                    </div>
                  </Field>
                )}
                  {planType === PaymentPlanTypeEnum.SUBSCRIPTION && (
                  <>
                    <Controller
                      control={form.control}
                      name="subscriptionType"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Subscription Type</FieldLabel>
                          <Select
                            name={field.name}
                            value={field.value}
                            onValueChange={(value: "monthly" | "yearly") => {
                              field.onChange(value);
                              setSubscriptionType(value);
                            }}
                          >
                            <SelectTrigger aria-invalid={fieldState.invalid}>
                              <SelectValue placeholder="Select subscription type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                    {subscriptionType && (
                      <>
                        {subscriptionType === "monthly" && (
                          <Controller
                            control={form.control}
                            name="subscriptionMonthlyAmount"
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>
                                  Monthly Subscription Amount
                                </FieldLabel>
                                <div className="flex items-center border rounded-md">
                                  <span className="text-muted-foreground text-sm pl-2">
                                    {currencySymbol}
                                  </span>
                                  <Input
                                    type="number"
                                    className="border-0 focus-visible:ring-0 focus:outline-none"
                                    placeholder="Enter monthly amount"
                                    {...field}
                                    value={field.value || ""}
                                    onChange={(e) =>
                                      field.onChange(
                                        parseFloat(e.target.value),
                                      )
                                    }
                                    aria-invalid={fieldState.invalid}
                                  />
                                  <span className="text-muted-foreground text-sm pr-2">
                                    {currencyISOCode}
                                  </span>
                                </div>
                                {fieldState.invalid && (
                                  <FieldError errors={[fieldState.error]} />
                                )}
                              </Field>
                            )}
                          />
                        )}
                        {subscriptionType === "yearly" && (
                          <Controller
                            control={form.control}
                            name="subscriptionYearlyAmount"
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>
                                  Yearly Subscription Amount
                                </FieldLabel>
                                <div className="flex items-center border rounded-md">
                                  <span className="text-muted-foreground text-sm pl-2">
                                    {currencySymbol}
                                  </span>
                                  <Input
                                    type="number"
                                    className="border-0 focus-visible:ring-0 focus:outline-none"
                                    placeholder="Enter yearly amount"
                                    {...field}
                                    value={field.value || ""}
                                    onChange={(e) =>
                                      field.onChange(
                                        parseFloat(e.target.value),
                                      )
                                    }
                                    aria-invalid={fieldState.invalid}
                                  />
                                  <span className="text-muted-foreground text-sm pr-2">
                                    {currencyISOCode}
                                  </span>
                                </div>
                                {fieldState.invalid && (
                                  <FieldError errors={[fieldState.error]} />
                                )}
                              </Field>
                            )}
                          />
                        )}
                      </>
                    )}
                  </>
                )}
              </FieldGroup>
              <Button type="submit">Create Payment Plan</Button>
            </form>
          </div>
        )}
      </div>

      {archivedPlans.length > 0 && (
        <div className="pt-6 border-t space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t("payment:archived_plans")}</h3>
          <div className="space-y-2">
            {archivedPlans.map((plan) => (
              <div key={plan._id} className="p-3 border border-dashed rounded-lg bg-muted/30">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{plan.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const amount = getPlanAmount(plan, currencySymbol);
                          return typeof amount === "object" ? `${amount.amount} × ${amount.installments}` : amount;
                        })()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {getPlanTypeLabel(plan)}
                    </Badge>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      {onPlanRestored && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => onPlanRestored(plan)}
                              >
                                <ArchiveRestore className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("payment:restore_plan")}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {onPlanDeleted && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={async () => {
                                  const result = await NiceModal.show(DeleteConfirmNiceDialog, {
                                    title: t("payment:delete_plan"),
                                    message: t("payment:delete_plan_message", { name: plan.name }),
                                  });
                                  if (result.reason === "confirm") {
                                    await onPlanDeleted(plan);
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("common:delete")}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
