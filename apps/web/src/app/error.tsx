"use client";

import NotSupportedPage from "@/components/error/not-supported-page";
import { ErrorComponent } from "@/components/error/error-component";
import { Button } from "@workspace/ui/components/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation(["error"]);

  if (error.name === "NotSupportedException") {
    return (
      <NotSupportedPage error={error} />
    );
  }

  return (
    <ErrorComponent>
      <ErrorComponent.Card>
        <ErrorComponent.CardHeader>
          <ErrorComponent.Icon>
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </ErrorComponent.Icon>
          <ErrorComponent.Title>{t("error:something_went_wrong_title")}</ErrorComponent.Title>
          <ErrorComponent.Description>
            {t("error:something_went_wrong_description")}
          </ErrorComponent.Description>
        </ErrorComponent.CardHeader>
        <ErrorComponent.CardBody>
          <Button onClick={() => reset()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t("error:try_again")}
          </Button>
        </ErrorComponent.CardBody>
      </ErrorComponent.Card>
    </ErrorComponent>
  );
}
