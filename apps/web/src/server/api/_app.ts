import { createTRPCContext, router, t } from "./core/trpc";
import { communityModuleRouter } from "./routers/community";
import { lmsModuleRouter } from "./routers/lms";
import { siteModuleRouter } from "./routers/site";
import { userModuleRouter } from "./routers/user";
import { agentModuleRouter } from "./routers/agent";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = router({
  // auth: authRouter,
  userModule: userModuleRouter,
  // post: postRouter,
  // attachment: attachmentRouter,
  // project: projectRouter,
  siteModule: siteModuleRouter,
  communityModule: communityModuleRouter,
  agentModule: agentModuleRouter,
  // organizationModule: organizationModuleRouter,
  lmsModule: lmsModuleRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;



const createCaller = t.createCallerFactory(appRouter);

export const trpcCaller = createCaller(createTRPCContext);
