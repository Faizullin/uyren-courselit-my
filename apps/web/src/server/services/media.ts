import { CloudinaryService } from "@/server/services/cloudinary";
import { IAttachmentMedia } from "@workspace/common-logic/models/media.types";

export async function deleteMedia(media: IAttachmentMedia): Promise<boolean> {
  // checkMediaLitAPIKeyOrThrow();
  
  const response = await CloudinaryService.deleteFile(media);

  return response;
}

// export async function deleteTargetedMedia(target_type: string) {
//   const response = await CloudinaryService.deleteTargetedMedia(target_type);
// }