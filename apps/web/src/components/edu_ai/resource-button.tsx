"use client";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Badge } from "@workspace/ui/components/badge";
import { BookOpen, Database, CheckCircle2, XCircle, Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ResourceStatus } from "./client";

interface CourseResourceButtonProps {
  courseId: string;
  apiKey: { publicKey: string; secretKey: string };
  label?: string;
}

export function CourseResourceButton({ courseId, apiKey, label }: CourseResourceButtonProps) {
  const { t } = useTranslation(["common"]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ResourceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const folder = await fetch("/api/services/external/edu_ai/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manage_rag",
          method: "read",
          resource_type: "course",
          resource_id: courseId,
        }),
      }).then(r => r.json());

      setStatus({
        exists: true,
        syncedAt: folder.data?.updated_at,
        metadata: {
          totalChunks: folder.data?.entry_count || 0,
          vectorCount: (folder.data?.entry_count || 0) * 10,
        },
      });
    } catch (error) {
      console.error("Failed to check status:", error);
      setStatus({ exists: false });
    } finally {
      setLoading(false);
    }
  };

  const handleAddResource = async () => {
    setAdding(true);
    try {
      const result = await fetch("/api/services/external/edu_ai/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manage_rag",
          method: "create",
          resource_type: "course",
          resource_id: courseId,
        }),
      }).then(r => r.json());

      if (result.success) {
        setStatus({
          exists: true,
          syncedAt: new Date(),
          metadata: { totalChunks: 0, vectorCount: 0 },
        });
      }
    } catch (error) {
      console.error("Failed to add resource:", error);
    } finally {
      setAdding(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      checkStatus();
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => handleOpen(true)}>
        <BookOpen className="h-4 w-4 mr-2" />
        {label || t("common:view")}
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {t("common:resource_status")}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : status ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {status.exists ? (
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                      ) : (
                        <XCircle className="h-8 w-8 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-semibold">
                          {status.exists ? t("common:synced") : t("common:not_synced")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {status.exists
                            ? t("common:resource_available_in_ai")
                            : t("common:resource_not_added_yet")}
                        </div>
                      </div>
                    </div>
                    <Badge variant={status.exists ? "default" : "secondary"}>
                      {status.exists ? t("common:active") : t("common:inactive")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {status.exists && status.metadata && (
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {status.metadata.totalChunks !== undefined && (
                        <div>
                          <div className="text-muted-foreground">{t("common:chunks")}</div>
                          <div className="font-semibold">{status.metadata.totalChunks}</div>
                        </div>
                      )}
                      {status.metadata.vectorCount !== undefined && (
                        <div>
                          <div className="text-muted-foreground">{t("common:vectors")}</div>
                          <div className="font-semibold">{status.metadata.vectorCount}</div>
                        </div>
                      )}
                    </div>
                    {status.syncedAt && (
                      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                        {t("common:last_synced")}: {new Date(status.syncedAt).toLocaleString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {!status.exists && (
                <Button
                  onClick={handleAddResource}
                  disabled={adding}
                  className="w-full"
                >
                  {adding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("common:adding")}
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("common:add_to_resource")}
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface LessonResourceButtonProps {
  lessonId: string;
  apiKey: { publicKey: string; secretKey: string };
  label?: string;
}

export function LessonResourceButton({ lessonId, apiKey, label }: LessonResourceButtonProps) {
  const { t } = useTranslation(["common"]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ResourceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const folder = await fetch("/api/services/external/edu_ai/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manage_rag",
          method: "read",
          resource_type: "lesson",
          resource_id: lessonId,
        }),
      }).then(r => r.json());

      setStatus({
        exists: true,
        syncedAt: folder.data?.updated_at,
        metadata: {
          totalChunks: folder.data?.entry_count || 0,
          vectorCount: (folder.data?.entry_count || 0) * 10,
        },
      });
    } catch (error) {
      console.error("Failed to check status:", error);
      setStatus({ exists: false });
    } finally {
      setLoading(false);
    }
  };

  const handleAddResource = async () => {
    setAdding(true);
    try {
      const result = await fetch("/api/services/external/edu_ai/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manage_rag",
          method: "create",
          resource_type: "lesson",
          resource_id: lessonId,
        }),
      }).then(r => r.json());

      if (result.success) {
        setStatus({
          exists: true,
          syncedAt: new Date(),
          metadata: { totalChunks: 0, vectorCount: 0 },
        });
      }
    } catch (error) {
      console.error("Failed to add resource:", error);
    } finally {
      setAdding(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      checkStatus();
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => handleOpen(true)}>
        <BookOpen className="h-4 w-4 mr-2" />
        {label || t("common:view")}
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {t("common:resource_status")}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : status ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {status.exists ? (
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                      ) : (
                        <XCircle className="h-8 w-8 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-semibold">
                          {status.exists ? t("common:synced") : t("common:not_synced")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {status.exists
                            ? t("common:resource_available_in_ai")
                            : t("common:resource_not_added_yet")}
                        </div>
                      </div>
                    </div>
                    <Badge variant={status.exists ? "default" : "secondary"}>
                      {status.exists ? t("common:active") : t("common:inactive")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {status.exists && status.metadata && (
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {status.metadata.totalChunks !== undefined && (
                        <div>
                          <div className="text-muted-foreground">{t("common:chunks")}</div>
                          <div className="font-semibold">{status.metadata.totalChunks}</div>
                        </div>
                      )}
                      {status.metadata.vectorCount !== undefined && (
                        <div>
                          <div className="text-muted-foreground">{t("common:vectors")}</div>
                          <div className="font-semibold">{status.metadata.vectorCount}</div>
                        </div>
                      )}
                    </div>
                    {status.syncedAt && (
                      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                        {t("common:last_synced")}: {new Date(status.syncedAt).toLocaleString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {!status.exists && (
                <Button
                  onClick={handleAddResource}
                  disabled={adding}
                  className="w-full"
                >
                  {adding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("common:adding")}
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("common:add_to_resource")}
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

