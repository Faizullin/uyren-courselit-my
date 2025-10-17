import { GeneralRouterOutputs } from "@/server/api/types";

/**
 * Serialized course type from tRPC getById
 * All ObjectIds are converted to strings for client-side usage
 */
export type SerializedCourse = GeneralRouterOutputs["lmsModule"]["courseModule"]["course"]["getById"];

/**
 * Course chapter with serialized IDs
 */
export type SerializedChapter = NonNullable<SerializedCourse>["chapters"][number];

/**
 * Course instructor with serialized IDs
 */
export type SerializedInstructor = NonNullable<SerializedCourse>["instructors"][number];

/**
 * Course stats from getStats endpoint
 */
export type CourseStats = GeneralRouterOutputs["lmsModule"]["courseModule"]["course"]["getStats"];

