import mammoth from "mammoth";
import PDFParser from 'pdf2json';

const TEXT_EXTENSIONS = [
  "txt", "md", "json", "csv", "xml", "html", "css", "scss", "yaml", "yml",
  "js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "cs", "php", "rb", "go",
  "rs", "swift", "kt", "scala", "sh", "bash", "sql", "r", "m", "pl", "lua",
];

export async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  try {
    const fileBuffer = Buffer.from(buffer);
    
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser(null, true);
      
      pdfParser.on("pdfParser_dataError", (errData) => {
        reject(errData instanceof Error ? errData : new Error(errData.parserError as any));
      });
      
      pdfParser.on("pdfParser_dataReady", () => {
        const text = pdfParser.getRawTextContent();
        resolve(text || "");
      });
      
      pdfParser.parseBuffer(fileBuffer);
    });
  } catch (error) {
    console.error("[PDF EXTRACT] Error:", error);
    return "";
  }
}

export async function extractTextFromDOCX(buffer: ArrayBuffer): Promise<string> {
  try {
    const nodeBuffer = Buffer.from(buffer);
    const result = await mammoth.extractRawText({ buffer: nodeBuffer });
    return result.value || "";
  } catch (error) {
    console.error("[DOCX EXTRACT] Error:", error);
    return "";
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  
  if (!extension) {
    return "";
  }

  if (TEXT_EXTENSIONS.includes(extension)) {
    return await file.text();
  }

  const buffer = await file.arrayBuffer();

  if (extension === "pdf") {
    return await extractTextFromPDF(buffer);
  }

  if (extension === "docx") {
    return await extractTextFromDOCX(buffer);
  }

  return "";
}

export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

export function isTextFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return TEXT_EXTENSIONS.includes(ext);
}

export function isProgrammingFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  const programmingExts = [
    "js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "cs", "php", "rb", "go",
    "rs", "swift", "kt", "scala", "sh", "bash", "sql", "r", "m", "pl", "lua",
  ];
  return programmingExts.includes(ext);
}

export async function extractSubmissionContent(submission: any): Promise<{
  text: string;
  files: { name: string; content: string; type: string }[];
  hasAttachments: boolean;
}> {
  const result = {
    text: "",
    files: [] as { name: string; content: string; type: string }[],
    hasAttachments: false,
  };

  if (submission.content) {
    result.text = typeof submission.content === "string" 
      ? submission.content 
      : JSON.stringify(submission.content, null, 2);
  }

  if (submission.attachments && Array.isArray(submission.attachments)) {
    result.hasAttachments = true;
    
    for (const attachment of submission.attachments) {
      const fileName = attachment.originalFileName || attachment.file?.split('/').pop() || "file";
      const ext = getFileExtension(fileName);
      
      console.log(`[EXTRACT] Processing attachment: ${fileName}`);

      if (attachment.file && (isTextFile(fileName) || ext === "pdf" || ext === "docx")) {
        try {
          const response = await fetch(attachment.file);
          const blob = await response.blob();
          const file = new File([blob], fileName, { type: attachment.mimeType });
          const content = await extractTextFromFile(file);
          
          if (content) {
            result.files.push({
              name: fileName,
              content,
              type: isProgrammingFile(fileName) ? "code" : ext === "pdf" || ext === "docx" ? "document" : "text",
            });
            console.log(`[EXTRACT] Extracted ${content.length} chars from ${fileName}`);
          }
        } catch (error) {
          console.error(`[EXTRACT] Failed to extract ${fileName}:`, error);
        }
      }
    }
  }

  return result;
}

