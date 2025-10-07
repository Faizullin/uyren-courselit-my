import { router } from "@/server/api/core/trpc";
import { activityRouter } from "./activity";
import { assignmentModuleRouter } from "./assignment";
import { cohortModuleRouter } from "./cohort/index";
import { courseModuleRouter } from "./course";
import { enrollmentRouter } from "./enrollment";
import { liveClassRouter } from "./live-class";
import { questionBankModuleRouter } from "./question-bank";
import { quizModuleRouter } from "./quiz";
import { reviewModuleRouter } from "./review";
import { scheduleRouter } from "./schedule";
import { themeModuleRouter } from "./theme";

export const lmsModuleRouter = router({
  activity: activityRouter,
  cohortModule: cohortModuleRouter,
  courseModule: courseModuleRouter,
  enrollment: enrollmentRouter,
  liveClass: liveClassRouter,
  quizModule: quizModuleRouter,
  assignmentModule: assignmentModuleRouter,
  questionBankModule: questionBankModuleRouter,
  reviewModule: reviewModuleRouter,
  schedule: scheduleRouter,
  themeModule: themeModuleRouter,
});
