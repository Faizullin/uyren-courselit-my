import { AttachmentModel, IAttachmentHydratedDocument } from "@workspace/common-logic/models/media.model";
import { IAttachmentMedia, MediaAccessTypeEnum } from "@workspace/common-logic/models/media.types";
import { IDomainHydratedDocument } from "@workspace/common-logic/models/organization.model";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import mongoose from "mongoose";
import path from "path";

export interface LocalStorageUploadOptions {
    file: File | Buffer;
    userId: mongoose.Types.ObjectId;
    type: string;
    caption?: string;
    access?: string;
    entityType: string;
    entityId: mongoose.Types.ObjectId | string;
}

export class LocalStorageService {
    private static readonly BASE_UPLOAD_DIR = "./storage";
    private static readonly BASE_URL = "/api/media";

    /**
     * Ensure directory exists, create if it doesn't
     */
    private static async ensureDirectory(dirPath: string): Promise<void> {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error: any) {
            if (error.code !== "EEXIST") {
                throw error;
            }
        }
    }

    /**
     * Get file extension from filename or mime type
     */
    private static getFileExtension(filename: string, mimeType?: string): string {
        // Try to get extension from filename first
        const filenameExt = path.extname(filename);
        if (filenameExt) {
            return filenameExt;
        }

        // Fallback to mime type
        if (mimeType) {
            const mimeToExt: Record<string, string> = {
                "image/jpeg": ".jpg",
                "image/png": ".png",
                "image/gif": ".gif",
                "image/webp": ".webp",
                "image/svg+xml": ".svg",
                "video/mp4": ".mp4",
                "video/webm": ".webm",
                "application/pdf": ".pdf",
                "application/msword": ".doc",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
            };
            return mimeToExt[mimeType] || "";
        }

        return "";
    }

    /**
     * Upload file to local storage
     */
    static async uploadFile(
        options: LocalStorageUploadOptions,
        domain: IDomainHydratedDocument
    ): Promise<IAttachmentHydratedDocument> {
        const { file, userId, type, caption, access, entityType, entityId } = options;

        if (!file) {
            throw new Error("No file provided");
        }

        try {
            const folderPrefix = process.env.UPLOAD_FOLDER_PREFIX!;
            const folderPath = path.join(
                this.BASE_UPLOAD_DIR,
                folderPrefix,
                `${domain.name}-${domain._id}`,
                type
            );

            // Ensure upload directory exists
            await this.ensureDirectory(folderPath);

            // Generate unique filename
            const originalFileName = file instanceof File ? file.name : "uploaded_file";
            const mimeType = file instanceof File ? file.type : "application/octet-stream";
            const fileExt = this.getFileExtension(originalFileName, mimeType);
            const uniqueId = randomUUID();
            const fileName = `${uniqueId}${fileExt}`;
            const filePath = path.join(folderPath, fileName);

            // Get file buffer and size
            let buffer: Buffer;
            let fileSize: number;

            if (file instanceof Buffer) {
                buffer = file;
                fileSize = buffer.length;
            } else {
                const fileObj = file as File;
                const bytes = await fileObj.arrayBuffer();
                buffer = Buffer.from(bytes);
                fileSize = fileObj.size;
            }

            // Write file to disk
            await fs.writeFile(filePath, buffer);

            // Generate URL path (relative to BASE_URL)
            const relativePath = path
                .relative(this.BASE_UPLOAD_DIR, filePath)
                .split(path.sep)
                .join("/");
            const url = `${this.BASE_URL}/${relativePath}`;

            // For images, use the same URL as thumbnail (we could generate thumbnails here if needed)
            const isImage = mimeType.startsWith("image/");
            const thumbnail = isImage ? url : url;

            const attachment = new AttachmentModel({
                orgId: domain.orgId,
                ownerId: userId,
                url,
                originalFileName,
                mimeType,
                size: fileSize,
                access: (access as any) || MediaAccessTypeEnum.PUBLIC,
                thumbnail,
                caption: caption || "",
                storageProvider: "local",
                metadata: {
                    filePath: relativePath,
                    uniqueId,
                },
                entity: {
                    entityType,
                    entityIdStr: typeof entityId === 'string' ? entityId : entityId.toString(),
                    entityId: typeof entityId === 'string' ? new mongoose.Types.ObjectId(entityId) : entityId,
                },
            });

            attachment.mediaId = attachment._id.toString();
            await attachment.save();

            return attachment;
        } catch (error: any) {
            console.error("Local storage upload error:", error);
            throw new Error(`Upload failed: ${error.message}`);
        }
    }

    /**
     * Delete file from local storage
     */
    static async deleteFile(item: IAttachmentMedia): Promise<boolean> {
        if (!item.metadata?.filePath) {
            throw new Error("File path not found for media");
        }

        try {
            const filePath = path.join(this.BASE_UPLOAD_DIR, item.metadata.filePath);

            // Check if file exists before attempting to delete
            try {
                await fs.access(filePath);
                await fs.unlink(filePath);
            } catch (error: any) {
                if (error.code === "ENOENT") {
                    console.warn(`File not found: ${filePath}, proceeding with database cleanup`);
                } else {
                    throw error;
                }
            }

            // Delete from database
            await AttachmentModel.deleteOne({ mediaId: item.mediaId });

            return true;
        } catch (error: any) {
            console.error("Local storage delete error:", error);
            throw new Error(`Delete failed for mediaId: ${item.mediaId}: ${error.message}`);
        }
    }

    /**
     * Get file from local storage
     */
    static async getFile(filePath: string): Promise<Buffer> {
        try {
            const fullPath = path.join(this.BASE_UPLOAD_DIR, filePath);
            return await fs.readFile(fullPath);
        } catch (error: any) {
            console.error("Local storage read error:", error);
            throw new Error(`Read failed: ${error.message}`);
        }
    }

    /**
     * Check if file exists
     */
    static async fileExists(filePath: string): Promise<boolean> {
        try {
            const fullPath = path.join(this.BASE_UPLOAD_DIR, filePath);
            await fs.access(fullPath);
            return true;
        } catch {
            return false;
        }
    }
}

