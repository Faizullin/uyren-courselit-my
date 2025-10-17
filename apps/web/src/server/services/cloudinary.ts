import { IAttachmentMedia, MediaAccessTypeEnum } from "@workspace/common-logic/models/media.types";
import { IDomainHydratedDocument } from "@workspace/common-logic/models/organization.model";
import { generateUniqueId } from "@workspace/utils";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadOptions {
  file: File | Buffer;
  userId: mongoose.Types.ObjectId;
  type: string;
  caption?: string;
  access?: string;
}

export interface CloudinaryUploadResult {
  media: IAttachmentMedia;
  mediaData: {
    userId: string;
    domain: string;
  };
}

export class CloudinaryService {
  static async uploadFile(options: CloudinaryUploadOptions, domain: IDomainHydratedDocument): Promise<IAttachmentMedia> {
    const { file, userId, type, caption, access } = options;

    if (!file) {
      throw new Error("No file provided");
    }

    try {
      // Generate unique filename
      const mediaId = generateUniqueId();

      // Get folder prefix from environment or use default
      const folderPrefix = process.env.UPLOAD_FOLDER_PREFIX;
      if (!folderPrefix) {
        throw new Error("UPLOAD_FOLDER_PREFIX is not set");
      }
      const folderPath = `${folderPrefix}/${domain.name}-${domain._id}/${type}`;

      let uploadResult: any;

      if (file instanceof Buffer) {
        // Upload buffer to Cloudinary
        uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                resource_type: "auto",
                folder: folderPath,
                transformation: [{ quality: "auto", fetch_format: "auto" }],
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              },
            )
            .end(file);
        });
      } else {
        // Upload File object to Cloudinary
        const bytes = await (file as File).arrayBuffer();
        const buffer = Buffer.from(bytes);

        uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                resource_type: "auto",
                folder: folderPath,
                transformation: [{ quality: "auto", fetch_format: "auto" }],
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              },
            )
            .end(buffer);
        });
      }

      // Create Media object
      const media: IAttachmentMedia = {
        orgId: domain.orgId,
        ownerId: userId,
        url: uploadResult.secure_url,
        originalFileName: file instanceof File ? file.name : "uploaded_file",
        mimeType:
          file instanceof File
            ? file.type
            : this.getMimeTypeFromFormat(uploadResult.format),
        size: uploadResult.bytes,
        access: (access as any) || MediaAccessTypeEnum.PUBLIC,
        thumbnail:
          uploadResult.resource_type === "image"
            ? cloudinary.url(uploadResult.public_id, {
              width: 200,
              height: 200,
              crop: "fill",
              quality: "auto",
              fetch_format: "auto",
            })
            : uploadResult.secure_url,
        caption: caption || "",
        storageProvider: "cloudinary",
        metadata: {
          public_id: uploadResult.public_id,
        },
        mediaId: mediaId,
      };

      return media;
    } catch (error: any) {
      console.error("Cloudinary upload error:", error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  static async deleteFile(item: IAttachmentMedia): Promise<boolean> {
    if (!item.metadata?.public_id) {
      throw new Error("Public ID not found for media");
    }
    try {
      const result = await cloudinary.uploader.destroy(item.metadata.public_id);
      if (result.result === "not found") {
        throw new Error("File not found for mediaId: " + item.metadata.public_id);
      }
      return result.result === "ok";
    } catch (error: any) {
      console.error("Cloudinary delete error:", error);
      throw new Error(`Delete failed for mediaId: ${item.metadata.public_id}: ${error.message}`);
    }
  }

  static generateSecureUrl(
    mediaId: string,
    transformation?: {
      width?: number;
      height?: number;
      crop?: string;
    },
  ): string {
    try {
      return cloudinary.url(mediaId, {
        sign_url: true,
        type: "authenticated",
        ...transformation,
      });
    } catch (error: any) {
      console.error("Cloudinary URL generation error:", error);
      throw new Error(`URL generation failed: ${error.message}`);
    }
  }

  static generatePublicUrl(
    mediaId: string,
    transformation?: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string;
    },
  ): string {
    try {
      return cloudinary.url(mediaId, {
        quality: "auto",
        fetch_format: "auto",
        ...transformation,
      });
    } catch (error: any) {
      console.error("Cloudinary URL generation error:", error);
      throw new Error(`URL generation failed: ${error.message}`);
    }
  }

  private static getMimeTypeFromFormat(format: string): string {
    const formatMappings: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      mp4: "video/mp4",
      webm: "video/webm",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    return formatMappings[format.toLowerCase()] || `application/${format}`;
  }
}
