"use client";

import { ScrollAnimation } from "@/components/public/scroll-animation";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { sendPasswordResetEmail } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/auth/firebase";
import { getUserFriendlyErrorMessage } from "@/lib/auth/error-handler";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { t } = useTranslation("auth");

  const isFormValid = email.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    setAuthError(null);
    setIsSubmitting(true);

    try {
      const auth = getFirebaseAuth();
      await sendPasswordResetEmail(auth, email);
      setEmailSent(true);
    } catch (error) {
      const errorMessage = getUserFriendlyErrorMessage(error);
      setAuthError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center py-12">
        <div className="w-full max-w-sm px-4">
          <ScrollAnimation variant="fadeUp" delay={0.2}>
            <Card className="w-full shadow-lg border border-border">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="flex justify-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    {t("forgot_password.success_title")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("forgot_password.success_description")}
                  </p>
                </div>
                <Link href="/auth/sign-in">
                  <Button className="w-full bg-brand-primary hover:bg-brand-primary-hover">
                    {t("forgot_password.back_to_signin")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </ScrollAnimation>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen flex items-center justify-center py-12">
      <div className="w-full max-w-sm px-4">
        <ScrollAnimation variant="fadeUp" delay={0.2}>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t("forgot_password.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("forgot_password.subtitle")}
            </p>
          </div>

          <Card className="w-full shadow-lg border border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-center">
                {t("forgot_password.card_title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {authError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs">
                  {t(authError)}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label
                    htmlFor="email"
                    className="text-xs font-medium text-foreground mb-1 block"
                  >
                    {t("forgot_password.email_label")}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-background text-foreground"
                      placeholder={t("forgot_password.email_placeholder")}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="sm"
                  className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white h-9 text-sm font-medium"
                  disabled={!isFormValid || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      {t("forgot_password.sending")}
                    </>
                  ) : (
                    t("forgot_password.send_button")
                  )}
                </Button>
              </form>

              <div className="text-center text-xs text-muted-foreground">
                <Link
                  href="/auth/sign-in"
                  className="text-brand-primary hover:text-brand-primary-hover font-medium"
                >
                  {t("forgot_password.back_to_signin")}
                </Link>
              </div>
            </CardContent>
          </Card>
        </ScrollAnimation>
      </div>
    </div>
  );
}

