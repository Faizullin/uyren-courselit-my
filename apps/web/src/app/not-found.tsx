"use client";

import { ErrorComponent } from "@/components/error/error-component";
import { Button } from "@workspace/ui/components/button";
import { FileQuestion, Home } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation(["error"]);

  return (
    <ErrorComponent>
      <ErrorComponent.Card>
        <ErrorComponent.CardHeader>
          <ErrorComponent.Icon>
            <FileQuestion className="h-6 w-6 text-destructive" />
          </ErrorComponent.Icon>
          <ErrorComponent.Title>{t("error:error_404_title")}</ErrorComponent.Title>
          <ErrorComponent.Description>
            {t("error:error_404_description")}
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
