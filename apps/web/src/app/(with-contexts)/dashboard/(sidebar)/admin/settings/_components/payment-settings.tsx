"use client";

import currencies from "@/data/currencies.json";
import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { PaymentMethodEnum } from "@workspace/common-logic/models/payment/payment.types";
import { useToast } from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { capitalize } from "@workspace/utils";
import { Copy, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useSettingsContext } from "./settings-context";

const paymentSchema = z.object({
  currencyISOCode: z.string().min(1, "Currency is required"),
  paymentMethod: z.literal(PaymentMethodEnum.STRIPE),
});

const stripeSchema = z.object({
  stripeKey: z.string().min(1, "Publishable key is required"),
  stripeSecret: z.string().min(1, "Secret key is required"),
});

type PaymentFormData = z.infer<typeof paymentSchema>;
type StripeFormData = z.infer<typeof stripeSchema>;

export default function PaymentSettings() {
  const { settings, loadSettingsQuery } = useSettingsContext();
  const { toast } = useToast();

  const updatePaymentMutation = trpc.siteModule.siteInfo.updatePaymentInfo.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Payment settings saved" });
      loadSettingsQuery.refetch();
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateStripeMutation = trpc.siteModule.siteInfo.updateStripeSettings.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Stripe settings saved" });
      loadSettingsQuery.refetch();
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { currencyISOCode: "", paymentMethod: PaymentMethodEnum.STRIPE },
  });

  const stripeForm = useForm<StripeFormData>({
    resolver: zodResolver(stripeSchema),
    defaultValues: { stripeKey: "", stripeSecret: "" },
  });

  useEffect(() => {
    if (settings) {
      paymentForm.reset({
        currencyISOCode: settings.currencyISOCode || "",
        paymentMethod: PaymentMethodEnum.STRIPE,
      });
      stripeForm.reset({
        stripeKey: settings.paymentMethods?.stripe?.stripeKey || "",
        stripeSecret: "",
      });
    }
  }, [settings, paymentForm, stripeForm]);

  const onSubmitPayment = async (data: PaymentFormData) => {
    await updatePaymentMutation.mutateAsync({ data: { currencyISOCode: data.currencyISOCode } });
  };

  const onSubmitStripe = async (data: StripeFormData) => {
    await updateStripeMutation.mutateAsync({
      data: { stripeKey: data.stripeKey, stripeSecret: data.stripeSecret },
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Success", description: "Webhook URL copied to clipboard" });
  };

  const isLoading = loadSettingsQuery.isLoading;

  return (
    <div className="space-y-8">
      <form onSubmit={paymentForm.handleSubmit(onSubmitPayment)} className="space-y-6">
        <FieldGroup>
          <Controller
            control={paymentForm.control}
            name="currencyISOCode"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="currency-select">Currency</FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isLoading}
                >
                  <SelectTrigger id="currency-select" aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.isoCode} value={currency.isoCode}>
                        {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={paymentForm.control}
            name="paymentMethod"
            render={({ field }) => (
              <Field>
                <FieldLabel>Payment Method</FieldLabel>
                <div className="flex items-center gap-2 p-3 border rounded-md bg-muted">
                  <span className="text-sm font-medium">
                    {capitalize(PaymentMethodEnum.STRIPE.toLowerCase())}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (Only payment method available)
                  </span>
                </div>
                <input type="hidden" {...field} value={PaymentMethodEnum.STRIPE} />
              </Field>
            )}
          />

        <div>
          <Button
              type="submit"
              disabled={updatePaymentMutation.isPending || isLoading}
              className="w-full sm:w-auto"
            >
              {updatePaymentMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </FieldGroup>
      </form>

      <form onSubmit={stripeForm.handleSubmit(onSubmitStripe)} className="space-y-6">
        <h3 className="text-lg font-semibold">Stripe Settings</h3>
        <FieldGroup>
          <Controller
            control={stripeForm.control}
            name="stripeKey"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Stripe Publishable Key</FieldLabel>
                <Input {...field} disabled={isLoading} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            control={stripeForm.control}
            name="stripeSecret"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Stripe Secret</FieldLabel>
                <Input
                  {...field}
                  type="password"
                  autoComplete="off"
                  disabled={isLoading}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <div>
          <Button
            type="submit"
            disabled={updateStripeMutation.isPending || isLoading}
            className="w-full sm:w-auto"
          >
            {updateStripeMutation.isPending ? "Saving..." : "Save Stripe Settings"}
          </Button>
          </div>
        </FieldGroup>
      </form>

      {/* Webhook Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Payment Confirmation Webhook
          </CardTitle>
          <CardDescription>
            Payment Confirmation Webhook{" "}
            <a
              className="underline"
              href="https://docs.courselit.app/en/schools/set-up-payments"
              target="_blank"
              rel="noreferrer"
            >
              Documentation
            </a>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>New Payment Plans Webhook</Label>
            <div className="flex gap-2">
              <Input readOnly value={`${window.location.origin}/api/payment/webhook`} disabled={isLoading} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(`${window.location.origin}/api/payment/webhook`)}
                disabled={isLoading}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Old Payment Webhook (Required for products but will be phased out soon)</Label>
            <div className="flex gap-2">
              <Input readOnly value={`${window.location.origin}/api/payment/webhook-old`} disabled={isLoading} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(`${window.location.origin}/api/payment/webhook-old`)}
                disabled={isLoading}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* <Resources
        links={[
          {
            href: "https://docs.courselit.app/en/schools/set-up-payments/",
            text: "Payment",
          },
        ]}
      /> */}
    </div>
  );
}
