"use client";

import { Button } from "@workspace/ui/components/button";
import { AlertCircle, Home } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ErrorComponent } from "./error-component";

export default function NotSupportedPage({ error }: { error: Error }) {
  const { t } = useTranslation(["error"]);

  return (
    <ErrorComponent>
      <ErrorComponent.Card>
        <ErrorComponent.CardHeader>
          <ErrorComponent.Icon>
            <AlertCircle className="h-6 w-6 text-destructive" />
          </ErrorComponent.Icon>
          <ErrorComponent.Title>{t("error:page_not_supported_title")}</ErrorComponent.Title>
          <ErrorComponent.Description>
            {t("error:page_not_supported_description")}
          </ErrorComponent.Description>
        </ErrorComponent.CardHeader>
        <ErrorComponent.CardBody>
          <Link href="/">
            <Button className="gap-2">
              <Home className="h-4 w-4" />
              {t("error:go_to_home")}
            </Button>
          </Link>
        </ErrorComponent.CardBody>
      </ErrorComponent.Card>
    </ErrorComponent>
  );
}

