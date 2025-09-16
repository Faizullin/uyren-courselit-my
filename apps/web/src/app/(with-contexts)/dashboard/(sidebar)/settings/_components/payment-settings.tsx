"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import Resources from "@/components/resources";
import currencies from "@/data/currencies.json";
import {
  APP_MESSAGE_SETTINGS_SAVED,
  BUTTON_SAVE,
  DOCUMENTATION_LINK_LABEL,
  HEADER_SECTION_PAYMENT_CONFIRMATION_WEBHOOK,
  SETTINGS_RESOURCE_PAYMENT,
  SITE_ADMIN_SETTINGS_PAYMENT_METHOD,
  SITE_ADMIN_SETTINGS_STRIPE_SECRET,
  SITE_SETTINGS_CURRENCY,
  SITE_SETTINGS_STRIPE_PUBLISHABLE_KEY_TEXT,
  SUBHEADER_SECTION_PAYMENT_CONFIRMATION_WEBHOOK,
  TOAST_TITLE_ERROR,
  TOAST_TITLE_SUCCESS,
} from "@/lib/ui/config/strings";
import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { UIConstants } from "@workspace/common-models";
import { useToast } from "@workspace/components-library";
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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSettingsContext } from "./settings-context";

const { PAYMENT_METHOD_STRIPE } = UIConstants;

const paymentSchema = z.object({
  currencyISOCode: z.string().min(1, "Currency is required"),
  paymentMethod: z.literal(PAYMENT_METHOD_STRIPE),
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
  const [newSettings, setNewSettings] = useState(settings);

  const updatePaymentMutation =
    trpc.siteModule.siteInfo.updatePaymentInfo.useMutation({
      onSuccess: () => {
        toast({
          title: TOAST_TITLE_SUCCESS,
          description: APP_MESSAGE_SETTINGS_SAVED,
        });
      },
      onError: (error: any) => {
        toast({
          title: TOAST_TITLE_ERROR,
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      currencyISOCode: "",
      paymentMethod: PAYMENT_METHOD_STRIPE,
    },
  });

  const stripeForm = useForm<StripeFormData>({
    resolver: zodResolver(stripeSchema),
    defaultValues: {
      stripeKey: "",
      stripeSecret: "",
    },
  });

  useEffect(() => {
    if (settings) {
      setNewSettings(settings);
      paymentForm.reset({
        currencyISOCode: (settings.currencyISOCode || "").toUpperCase(),
        paymentMethod: PAYMENT_METHOD_STRIPE,
      });
      stripeForm.reset({
        stripeKey: settings.stripeKey || "",
        stripeSecret: "",
      });
    }
  }, [settings, paymentForm, stripeForm]);

  const onSubmitPayment = async (data: PaymentFormData) => {
    try {
      await updatePaymentMutation.mutateAsync({
        data: {
          currencyISOCode: data.currencyISOCode,
          paymentMethod: data.paymentMethod,
        },
      });
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const onSubmitStripe = async (data: StripeFormData) => {
    try {
      await updatePaymentMutation.mutateAsync({
        data: {
          stripeKey: data.stripeKey,
          stripeSecret: data.stripeSecret,
        },
      });
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: TOAST_TITLE_SUCCESS,
      description: "Webhook URL copied to clipboard",
    });
  };

  const isSaving = updatePaymentMutation.isPending;
  const isLoading = loadSettingsQuery.isLoading;
  const isDisabled = isLoading || isSaving;

  return (
    <div className="space-y-8">
      <Form {...paymentForm}>
        <form
          onSubmit={paymentForm.handleSubmit(onSubmitPayment)}
          className="space-y-6"
        >
          <FormField
            control={paymentForm.control}
            name="currencyISOCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{SITE_SETTINGS_CURRENCY}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isDisabled}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem
                        key={currency.isoCode}
                        value={currency.isoCode}
                      >
                        {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={paymentForm.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{SITE_ADMIN_SETTINGS_PAYMENT_METHOD}</FormLabel>
                <div className="flex items-center gap-2 p-3 border rounded-md bg-muted">
                  <span className="text-sm font-medium">
                    {capitalize(PAYMENT_METHOD_STRIPE.toLowerCase())}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (Only payment method available)
                  </span>
                </div>
                <input type="hidden" {...field} value={PAYMENT_METHOD_STRIPE} />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={!paymentForm.formState.isDirty || isDisabled}
            className="w-full sm:w-auto"
          >
            {isSaving ? "Saving..." : BUTTON_SAVE}
          </Button>
        </form>
      </Form>

      {/* Stripe Settings */}
      <div>
        <Form {...stripeForm}>
          <form
            onSubmit={stripeForm.handleSubmit(onSubmitStripe)}
            className="space-y-6"
          >
            <h3 className="text-lg font-semibold">Stripe Settings</h3>
            <FormField
              control={stripeForm.control}
              name="stripeKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {SITE_SETTINGS_STRIPE_PUBLISHABLE_KEY_TEXT}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isDisabled} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={stripeForm.control}
              name="stripeSecret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{SITE_ADMIN_SETTINGS_STRIPE_SECRET}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      autoComplete="off"
                      disabled={isDisabled}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={!stripeForm.formState.isDirty || isDisabled}
              className="w-full sm:w-auto"
            >
              {isSaving ? "Saving..." : BUTTON_SAVE}
            </Button>
          </form>
        </Form>
      </div>

      {/* Webhook Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            {HEADER_SECTION_PAYMENT_CONFIRMATION_WEBHOOK}
          </CardTitle>
          <CardDescription>
            {SUBHEADER_SECTION_PAYMENT_CONFIRMATION_WEBHOOK}{" "}
            <a
              className="underline"
              href="https://docs.courselit.app/en/schools/set-up-payments"
              target="_blank"
              rel="noreferrer"
            >
              {DOCUMENTATION_LINK_LABEL}
            </a>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>New Payment Plans Webhook</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/api/payment/webhook`}
                disabled={isDisabled}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    `${window.location.origin}/api/payment/webhook`,
                  )
                }
                disabled={isDisabled}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>
              Old Payment Webhook (Required for products but will be phased out
              soon)
            </Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/api/payment/webhook-old`}
                disabled={isDisabled}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    `${window.location.origin}/api/payment/webhook-old`,
                  )
                }
                disabled={isDisabled}
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
            text: SETTINGS_RESOURCE_PAYMENT,
          },
        ]}
      /> */}
    </div>
  );
}
