import { IAttachmentMedia } from "@workspace/common-logic/models/media.types";

const PdfViewer = (props: { media: IAttachmentMedia }) => {
  return <div>PdfViewer</div>;
};

const TextViewer = (props: { media: IAttachmentMedia }) => {
  return <div>TextViewer</div>;
};

const UnknownViewer = (props: { media: IAttachmentMedia }) => {
  return <div>UnknownViewer</div>;
};

const FileContentViewer = (media: IAttachmentMedia) => {
  switch (media.mimeType) {
    case "application/pdf":
      return <PdfViewer media={media} />;
    case "text/plain":
      return <TextViewer media={media} />;
    default:
      return <UnknownViewer media={media} />;
  }
};

export default FileContentViewer;
