import React from "react";

const FileIcon: React.FC<{ mimeType?: string; className?: string }> = ({ mimeType, className = "h-8 w-8 text-muted-foreground" }) => {
  const [Icons, setIcons] = React.useState<any>(null);

  React.useEffect(() => {
    import("lucide-react").then((module) => setIcons(module));
  }, []);

  if (!Icons) return null; // Wait for dynamic import

  const { File, FileImage, FileText } = Icons;

  if (!mimeType) return <File className={className} />;

  if (mimeType.startsWith("image/")) {
    return <FileImage className={className} />;
  } else if (mimeType === "application/pdf") {
    return <File className={className} />; // Generic File icon for PDFs
  } else if (mimeType.startsWith("text/")) {
    return <FileText className={className} />;
  }

  return <File className={className} />;
};

export default FileIcon;