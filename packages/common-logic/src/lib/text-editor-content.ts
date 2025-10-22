import { IAttachmentMedia } from "../models/media.types";

interface IAsset {
    url: string;
    caption?: string;
    media?: IAttachmentMedia;
};

interface ITextEditorContentWidget<TData = Record<string, unknown>> {
    type: string;
    objectId: string;
    title: string;
    data: TData;
};

export interface ITextEditorContent {
    type: "doc";
    assets: IAsset[];
    widgets: ITextEditorContentWidget[];
    content: string;
    config: {
        editorType: "tiptap" | "text";
    };
}