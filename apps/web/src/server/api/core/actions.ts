"use server";

import { authOptions } from "@/lib/auth/options";
import { getDomainData } from "@/server/lib/domain";
import { connectToDatabase } from "@workspace/common-logic/lib/db";
import { IDomain } from "@workspace/common-logic/models/organization.types";
import { IUserHydratedDocument, UserModel } from "@workspace/common-logic/models/user.model";
import { getServerSession, Session } from "next-auth";
import {
  AuthenticationException,
  NotFoundException
} from "./exceptions";

/**
 * Action context type matching TRPC procedures
 */
export interface ActionContext {
  user: IUserHydratedDocument;
  session: Session;
  domainData: {
    domainObj: IDomain;
    headers: any;
  };
}

/**
 * Get authenticated action context with auto-checks
 * Throws exceptions if validation fails
 */
export async function getActionContext(): Promise<ActionContext> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new AuthenticationException();

  await connectToDatabase();

  const user = await UserModel.findById(session.user.id).lean() as IUserHydratedDocument;
  if (!user) throw new NotFoundException("User", session.user.id);

  const domainData = await getDomainData();
  if (!domainData.domainObj) throw new NotFoundException("Domain");

  return {
    user,
    session,
    domainData: { ...domainData, domainObj: domainData.domainObj },
  };
}

