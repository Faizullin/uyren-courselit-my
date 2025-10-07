import { ObjectId } from "mongodb";

type SuperJSONSupportedTypes =
    | Date
    | Set<any>
    | Map<any, any>
    | RegExp
    | undefined
    | null
    | bigint

type Jsonify<T> = T extends ObjectId
    ? string
    : T extends SuperJSONSupportedTypes
    ? T
    : T extends object
    ? { [K in keyof T]: Jsonify<T[K]> }
    : T;

export const jsonify = <T>(data: T): Jsonify<T> => {
    return data as unknown as Jsonify<T>;
};