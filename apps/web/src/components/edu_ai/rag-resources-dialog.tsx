"use client";

import { deleteRagResource, getResourcesByTarget, syncCourseToRAG, type RagResource } from "@/server/actions/rag-sync";
import { NiceModal, type NiceModalHocProps, DeleteConfirmNiceDialog, useToast } from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Badge } from "@workspace/ui/components/badge";
import { FileText, Trash2, RefreshCw, Database } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface RagResourcesDialogProps extends NiceModalHocProps {
  courseId: string;
}

export const RagResourcesNiceDialog = NiceModal.create<
  RagResourcesDialogProps,
  { reason: "cancel" | "close" }
>(({ courseId }) => {
  const { visible, hide, resolve } = NiceModal.useModal();
  const { t } = useTranslation(["common", "dashboard"]);
  const { toast } = useToast();
  const [resources, setResources] = useState<RagResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadResources = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getResourcesByTarget("course", courseId);
      setResources(data);
    } catch (error) {
      console.error("Error loading resources:", error);
      toast({
        title: t("common:error"),
        description: t("common:failed_to_load_resources"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [courseId, toast, t]);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await syncCourseToRAG(courseId);
      
      if (result.success) {
        toast({
          title: t("common:success"),
          description: `Synced: ${result.lessonsSynced} lessons added, ${result.lessonsDeleted} removed`,
        });
        loadResources();
      } else {
        toast({
          title: t("common:error"),
          description: result.error || t("common:sync_failed"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast({
        title: t("common:error"),
        description: t("common:sync_failed"),
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  }, [courseId, toast, t, loadResources]);

  useEffect(() => {
    if (visible) {
      loadResources();
    }
  }, [visible, loadResources]);

  const handleDelete = useCallback(async (resource: RagResource) => {
    const result = await NiceModal.show(DeleteConfirmNiceDialog, {
      title: t("common:delete_resource"),
      message: `${t("common:delete_resource_confirm")} "${resource.path}"?`,
    });

    if (result.reason === "confirm") {
      try {
        const success = await deleteRagResource(resource.id);
        if (success) {
          toast({
            title: t("common:success"),
            description: t("common:resource_deleted"),
          });
          loadResources();
        } else {
          toast({
            title: t("common:error"),
            description: t("common:failed_to_delete"),
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: t("common:error"),
          description: t("common:failed_to_delete"),
          variant: "destructive",
        });
      }
    }
  }, [toast, t, loadResources]);

  const handleClose = useCallback(() => {
    resolve({ reason: "close" });
    hide();
  }, [resolve, hide]);

  return (
    <Dialog
      open={visible}
      onOpenChange={(open) => {
        if (!open) {
          resolve({ reason: "cancel" });
          hide();
        }
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("common:rag_resources")}
          </DialogTitle>
          <DialogDescription>
            {t("common:rag_resources_description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-muted-foreground">
            {resources.length} {t("common:resources_found")}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing || isLoading}
            >
              <Database className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? t("common:syncing") : t("common:sync")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadResources}
              disabled={isLoading || isSyncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              {t("common:refresh")}
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading && resources.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              {t("common:loading")}
            </div>
          ) : resources.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              {t("common:no_resources_found")}
            </div>
          ) : (
            <div className="space-y-3">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <p className="font-medium truncate">{resource.path}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {resource.type && (
                          <Badge variant="secondary">{resource.type}</Badge>
                        )}
                        {resource.source && (
                          <Badge variant="outline">{resource.source}</Badge>
                        )}
                        {resource.sectionsCount !== undefined && (
                          <Badge variant="outline">
                            {resource.sectionsCount} {t("common:sections")}
                          </Badge>
                        )}
                      </div>
                      {resource.checksum && (
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {resource.checksum.slice(0, 16)}...
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(resource)}
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            {t("common:close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

