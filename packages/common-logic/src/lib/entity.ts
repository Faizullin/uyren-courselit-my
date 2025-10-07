import mongoose from "mongoose";

export type IEntity<TEntityType = string> = {
    entityIdStr: string;
    entityId?: mongoose.Types.ObjectId;
    entityType: TEntityType;
}

export const entityField = <TEntityType = string>(props?: {
    entityType?: TEntityType;
    required?: boolean;
}) => {
    const useEntityType = props?.entityType ?? String;
    const useRequired = props?.required ?? true;
    return {
        entityIdStr: { type: String, required: useRequired },
        entityId: { type: mongoose.Schema.Types.ObjectId, required: useRequired },
        entityType: { type: useEntityType, required: useRequired, },
    }
}