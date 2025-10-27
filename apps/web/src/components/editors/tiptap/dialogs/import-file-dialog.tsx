"use client";

import { NiceModal, type NiceModalHocProps, useToast } from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { FileUp, Loader2, CheckCircle } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Progress } from "@workspace/ui/components/progress";

interface ImportFileDialogProps extends NiceModalHocProps {}

export const ImportFileNiceDialog = NiceModal.create<
  ImportFileDialogProps,
  { reason: "cancel" | "submit"; content?: any }
>(({}) => {
  const { visible, hide, resolve } = NiceModal.useModal();
  const { t } = useTranslation(["common"]);
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionStep, setConversionStep] = useState<string>("");
  const [label, setLabel] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [convertedContent, setConvertedContent] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const extension = selectedFile.name.split(".").pop()?.toLowerCase();
      if (extension === "pdf" || extension === "docx") {
        setFile(selectedFile);
      } else {
        toast({
          title: t("common:error"),
          description: "Only PDF and DOCX files are supported",
          variant: "destructive",
        });
      }
    }
  };

  const handleConvert = useCallback(async () => {
    if (!file) return;

    setIsConverting(true);
    setProgress(0);
    setConvertedContent(null);
    setMetadata(null);
    setConversionStep("");
    setLabel("");
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const enabledExtensions = [
        "paragraph",
        "heading",
        "bulletList",
        "orderedList",
        "table",
        "image",
        "bold",
        "italic",
        "blockquote",
        "codeBlock",
      ];
      formData.append("extensions", JSON.stringify(enabledExtensions));

      console.log("[FILE IMPORT] Starting:", file.name);

      const response = await fetch("/api/services/ai/editor/convert", {
        method: "POST",
        body: formData,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response reader");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line);

            if (data.error) {
              toast({
                title: t("common:error"),
                description: data.error,
                variant: "destructive",
              });
              setProgress(0);
              setConversionStep("");
              setLabel("");
            } else if (data.type === "progress") {
              setConversionStep(data.step);
              setProgress(data.progress);
              setLabel(data.label);
              console.log(`[FILE IMPORT] ${data.label}: ${data.step}`);
            } else if (data.type === "complete") {
              setConversionStep(data.step);
              setProgress(data.progress);
              setLabel(data.label);
              setConvertedContent(data.content);
              setMetadata(data.metadata);
              console.log("[FILE IMPORT] Complete:", data.metadata);
            }
          } catch (parseError) {
            console.error("[FILE IMPORT] Parse error:", parseError);
          }
        }
      }

    } catch (error) {
      console.error("[FILE IMPORT] Error:", error);
      toast({
        title: t("common:error"),
        description: "Failed to convert file",
        variant: "destructive",
      });
      setProgress(0);
      setConversionStep("");
      setLabel("");
    } finally {
      setIsConverting(false);
    }
  }, [file, toast, t]);

  const handleSave = useCallback(() => {
    if (convertedContent) {
      toast({
        title: t("common:success"),
        description: `Imported ${metadata.nodesCount} nodes, ${metadata.tablesFound} tables`,
      });
      resolve({ reason: "submit", content: convertedContent });
      hide();
    }
  }, [convertedContent, metadata, toast, t, resolve, hide]);

  const handleClose = useCallback(() => {
    resolve({ reason: "cancel" });
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            {t("common:import_file")}
          </DialogTitle>
          <DialogDescription>
            Upload a PDF or DOCX file to convert to editor content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Input
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileChange}
              disabled={isConverting || !!convertedContent}
            />
            {file && !isConverting && !convertedContent && (
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {(isConverting || convertedContent) && (
            <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  {progress === 100 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
                  )}
                  <span className="font-medium">{label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">{conversionStep}</p>
              
              {metadata && (
                <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <span>{metadata.nodesCount} nodes</span>
                  <span>{metadata.tablesFound} tables</span>
                  <span>{metadata.imagesFound} images</span>
                  <span>{(metadata.originalLength / 1000).toFixed(1)}K chars</span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isConverting}
            >
              {t("common:cancel")}
            </Button>
            {!convertedContent ? (
              <Button
                type="button"
                onClick={handleConvert}
                disabled={!file || isConverting}
              >
                {isConverting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isConverting ? t("common:converting") : "Convert"}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSave}
                disabled={!convertedContent}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Save to Editor
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

