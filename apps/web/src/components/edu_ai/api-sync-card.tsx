"use client";

import { NiceModal } from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import { Database, RefreshCw } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { RagResourcesNiceDialog } from "./rag-resources-dialog";

interface ApiSyncCardProps {
  courseId: string;
}

export function ApiSyncCard({ courseId }: ApiSyncCardProps) {
  const { t } = useTranslation(["common"]);

  const handleViewResources = useCallback(async () => {
    await NiceModal.show(RagResourcesNiceDialog, { courseId });
  }, [courseId]);

  return (
    <div className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Database className="h-4 w-4" />
          {t("common:ai_sync")}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleViewResources}
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2`} />
          {t("common:view_resources")}
        </Button>
      </div>
    </div>
  );
}

