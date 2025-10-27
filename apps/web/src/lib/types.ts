import type { ObjectId } from "mongodb";
import type mongoose from "mongoose";

export type Serialized<T> = {
  [K in keyof T]: [undefined] extends [T[K]]
    ? T[K] extends mongoose.Types.ObjectId | undefined
      ? string | undefined
      : T[K] extends ObjectId | undefined
        ? string | undefined
        : T[K] extends Date | undefined
          ? string | undefined
          : T[K] extends object
            ? Serialized<Exclude<T[K], undefined>> | undefined
            : T[K]
    : T[K] extends mongoose.Types.ObjectId
      ? string
      : T[K] extends ObjectId
        ? string
        : T[K] extends Date
          ? string
          : T[K] extends object
            ? Serialized<T[K]>
            : T[K];
};