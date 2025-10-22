"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { Archive, Plus, Star, X } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
  plan: IPaymentPlan,
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

function getPlanTypeLabel(plan: IPaymentPlan): string {
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

type IPaymentPlanWithId = IPaymentPlan & { _id: string };
export default function PaymentPlanList({
  paymentPlans = [],
  onPlanSubmit,
  onPlanArchived,
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
}: {
    paymentPlans: Array<IPaymentPlanWithId>;
  onPlanSubmit: (values: z.infer<typeof formSchema>) => void;
  onPlanArchived: (plan: IPaymentPlanWithId) => void;
  allowedPlanTypes: PaymentPlanTypeEnum[];
  currencySymbol?: string;
  currencyISOCode?: string;
  onDefaultPlanChanged?: (plan: IPaymentPlanWithId) => void;
  defaultPaymentPlanId?: string;
}) {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [planType, setPlanType] = useState<PaymentPlanTypeEnum>(
    PaymentPlanTypeEnum.FREE,
  );
  const [subscriptionType, setSubscriptionType] = useState<
    "monthly" | "yearly"
  >("monthly");

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
    <div className="w-full max-w-md mx-auto p-2 space-y-2">
      <div className="space-y-2">
        {paymentPlans.map((plan, index) => (
          <div
            key={index}
            className="p-2 border rounded-md bg-background hover:border-primary/50 transition-colors"
          >
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-sm font-medium">{plan.name}</h3>
              <div className="flex items-center space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onDefaultPlanChanged?.(plan)}
                        disabled={defaultPaymentPlanId === plan._id}
                      >
                        <Star
                          className={`h-3 w-3`}
                          color={
                            defaultPaymentPlanId === plan._id
                              ? "black"
                              : "#d3d3d3"
                          }
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Make default</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleArchive(plan)}
                      >
                        <Archive className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Archive plan</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs">
                {(() => {
                  const planAmount = getPlanAmount(plan, currencySymbol);
                  if (typeof planAmount === "string") {
                    return planAmount;
                  } else {
                    return `${planAmount.amount} × ${planAmount.installments}`;
                  }
                })()}
              </span>
              <Badge
                variant="secondary"
                className="rounded-full px-1.5 py-0.5 text-[10px]"
              >
                {getPlanTypeLabel(plan)}
              </Badge>
            </div>
          </div>
        ))}
        {!isFormVisible ? (
          <div
            onClick={() => handleFormVisibility(true)}
            className="p-2 border border-dashed rounded-md bg-background hover:border-primary/50 transition-colors group cursor-pointer mt-4"
          >
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-sm font-medium text-muted-foreground group-hover:text-primary">
                New Plan
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">
                {currencySymbol}0.00
              </span>
              <Badge
                variant="secondary"
                className="rounded-full px-1.5 py-0.5 text-[10px]"
              >
                Payment frequency
              </Badge>
            </div>
          </div>
        ) : (
          <div className="p-4 border rounded-md bg-background mt-4">
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
    </div>
  );
}
