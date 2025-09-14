import { Media } from "@workspace/common-models";

export async function deleteMedia(mediaId: string | Media): Promise<boolean> {
  // checkMediaLitAPIKeyOrThrow();

  const usedMediaId = typeof mediaId === "string" ? mediaId : mediaId.mediaId;
  const medialitServer = "";
  let response: any = await fetch(
    `${medialitServer}/api/services/media/${usedMediaId}`,
    {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        apikey: process.env.MEDIALIT_APIKEY,
      }),
    },
  );
  response = await response.json();

  if (response.error) {
    throw new Error(response.error);
  }

  if (response.message === "success") {
    return true;
  } else {
    throw new Error(response.message);
  }
}
