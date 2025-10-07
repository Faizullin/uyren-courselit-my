import { connectToDatabase, IDomain, IUser, UIConstants, UserModel } from "@workspace/common-logic";
import { checkPermission } from "@workspace/utils";
import { HydratedDocument } from "mongoose";
import { Session } from "next-auth";
import { AuthenticationException, AuthorizationException } from "./exceptions";
import { assertDomainExist } from "./permissions";
import { rootProcedure, t } from "./trpc";

type IDomainInstance = HydratedDocument<IDomain>;
type IUserInstance = HydratedDocument<IUser>;

// Base middleware for role-based access control
export const createPermissionMiddleware = <T = any>(
  allowedPermissions: string[],
) => {
  return async ({
    ctx,
    next,
  }: {
    ctx: T;
    next: (opts: { ctx: T }) => Promise<any>;
  }) => {
    const userPermissions = (ctx as any).user!.permissions;
    if (!checkPermission(userPermissions, allowedPermissions)) {
      throw new AuthorizationException(
        `Access denied. Required permissions: ${allowedPermissions.join(", ")}`,
      );
    }
    return next({
      ctx,
    });
  };
};

const createRoleMiddleware = (allowedRoles: string[]) => {
  return t.middleware(async ({ ctx, next }) => {
    const userRoles = ctx.session!.user.roles;
    if (!checkPermission(userRoles, allowedRoles)) {
      throw new AuthorizationException(
        `Access denied. Required roles: ${allowedRoles.join(", ")}`,
      );
    }
    return next({
      ctx,
    });
  });
};

export const createDomainRequiredMiddleware = <T = any>() => {
  return t.middleware(async ({ ctx, next }) => {
    const domainObj = await assertDomainExist(ctx as MainContextType);
    return next({
      ctx: {
        ...ctx,
        domainData: {
          ...ctx.domainData,
          domainObj,
        },
      } as MainContextType,
    });
  });
};

export const publicProcedure = rootProcedure;
export const protectedProcedure = rootProcedure.use(
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new AuthenticationException("User not authenticated");
    }
    await connectToDatabase();
    const user = await UserModel.findOne({
      userId: ctx.session.user.userId,
    }).lean();
    if (!user) {
      throw new AuthenticationException("User not found");
    }
    return await next({
      ctx: {
        ...ctx,
        session: ctx.session!,
        user,
      },
    });
  }),
);
export const adminProcedure = protectedProcedure.use(
  createRoleMiddleware([UIConstants.roles.admin]),
);
export const teacherProcedure = protectedProcedure.use(
  createRoleMiddleware([UIConstants.roles.admin, UIConstants.roles.instructor]),
);

export type MainContextType = {
  user: IUserInstance;
  session: Session | null;
  domainData: {
    domainObj: IDomainInstance;
    headers: any;
  };
};
