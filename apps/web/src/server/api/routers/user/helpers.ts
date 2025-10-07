import constants from "@/config/constants";
import { checkForInvalidPermissions } from "@/lib/check-invalid-permissions";
import { recordActivity } from "@/lib/models/record-activity";
// import { triggerSequences } from "@/lib/models/trigger-sequences";
import DomainModel, { Domain } from "@/models/Domain";
import UserModel from "@/models/User";
import { UIConstants } from "@workspace/common-models";
import { checkPermission } from "@workspace/utils";
import {
  AuthorizationException,
  NotFoundException,
} from "../../core/exceptions";
import { MainContextType } from "../../core/procedures";

const { permissions } = UIConstants;

export async function createUser({
  domain,
  name,
  email,
  lead,
  superAdmin = false,
  subscribedToUpdates = true,
  invited,
  permissions = [],
  providerData,
}: {
  domain: Domain;
  name?: string;
  email: string;
  lead?:
  | typeof constants.leadWebsite
  | typeof constants.leadNewsletter
  | typeof constants.leadApi
  | typeof constants.leadDownload;
  superAdmin?: boolean;
  subscribedToUpdates?: boolean;
  invited?: boolean;
  permissions?: string[];
  providerData?: {
    provider: string;
    uid: string;
    name?: string;
  };
}) {
  if (permissions.length) {
    checkForInvalidPermissions(permissions);
  }

  const rawResult = await UserModel.findOneAndUpdate(
    { domain: domain._id, email },
    {
      $setOnInsert: {
        domain: domain._id,
        name,
        email: email.toLowerCase(),
        active: true,
        purchases: [],
        permissions: superAdmin
          ? [
            constants.permissions.manageCourse,
            constants.permissions.manageAnyCourse,
            constants.permissions.publishCourse,
            constants.permissions.manageMedia,
            constants.permissions.manageSite,
            constants.permissions.manageSettings,
            constants.permissions.manageUsers,
            constants.permissions.manageCommunity,
          ]
          : [
            constants.permissions.enrollInCourse,
            constants.permissions.manageMedia,
            ...permissions,
          ],
        lead: lead || constants.leadWebsite,
        subscribedToUpdates,
        invited,
        providerData,
      },
    },
    { upsert: true, new: true },
  );

  const createdUser = rawResult;
  const isNewUser = !rawResult.isModified();
  if (isNewUser) {
    // if (superAdmin) {
    //   await initMandatoryPages(domain, createdUser);
    //   await createInternalPaymentPlan(domain, createdUser.userId);
    // }

    await recordActivity({
      domain: domain._id,
      userId: createdUser.userId,
      type: "user_created",
    });

    if (createdUser.subscribedToUpdates) {
      // await triggerSequences({
      //   user: createdUser,
      //   event: Constants.EventType.SUBSCRIBER_ADDED,
      // });

      await recordActivity({
        domain: domain!._id,
        userId: createdUser.userId,
        type: "newsletter_subscribed",
      });
    }
  }

  return createdUser;
}

export const addTags = async (tags: string[], ctx: MainContextType) => {
  const domainObj = await DomainModel.findById(ctx.domainData.domainObj._id);
  if (!domainObj) {
    throw new NotFoundException("Domain not found");
  }
  if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
    throw new AuthorizationException();
  }
  for (let tag of tags) {
    if (!domainObj.tags.includes(tag)) {
      domainObj.tags.push(tag);
    }
  }
  await domainObj.save();

  return domainObj.tags;
};
