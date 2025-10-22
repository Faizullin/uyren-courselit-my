import {
  NotFoundException,
  ValidationException
} from "@/server/api/core/exceptions";
import {
  createDomainRequiredMiddleware,
  createPermissionMiddleware,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/core/procedures";
import { getFormDataSchema } from "@/server/api/core/schema";
import { router } from "@/server/api/core/trpc";
import { mediaWrappedFieldValidator } from "@/server/api/core/validators";
import DomainManager from "@/server/lib/domain";
import { jsonify } from "@workspace/common-logic/lib/response";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import {
  DomainModel,
} from "@workspace/common-logic/models/organization.model";
import { IDomain, ISiteInfo } from "@workspace/common-logic/models/organization.types";
import { checkPermission } from "@workspace/utils";
import { z } from "zod";

import currencies from "@/data/currencies.json";

const currencyISOCodes = currencies.map((currency) =>
  currency.isoCode,
);

export const siteInfoRouter = router({
  publicGetSettings: publicProcedure.query(async ({ ctx }) => {
    const { domainObj } = ctx.domainData || {};

    if (!domainObj) {
      throw new NotFoundException("Domain", "current");
    }

    const exclusionFields = {
      "siteInfo.paymentMethods.stripe.stripeSecret": 0,
      "siteInfo.paymentMethods.stripe.stripeWebhookSecret": 0,
    };

    const typedDomainObj = domainObj as IDomain & { _id: string };

    const domain = await DomainModel.findById(
      typedDomainObj._id,
      exclusionFields,
    ).lean();

    if (!domain) {
      throw new NotFoundException("Domain", "current");
    }

    return jsonify(domain.siteInfo);
  }),

  publicGetFullSiteSetup: publicProcedure
    .input(
      z.object({
        pageId: z.string().optional(),
      }),
    )
    .query(async ({ ctx }) => {
      const { domainObj } = ctx.domainData || {};

      if (!domainObj) {
        throw new NotFoundException("Domain", "current");
      }

      const typedDomainObj = domainObj as IDomain & { _id: string };

      const exclusionFields = {
        "siteInfo.paymentMethods.stripe.stripeSecret": 0,
        "siteInfo.paymentMethods.stripe.stripeWebhookSecret": 0,
      };

      const domain = await DomainModel.findById(
        typedDomainObj._id,
        exclusionFields,
      ).lean();

      if (!domain) {
        throw new NotFoundException("Domain", "current");
      }

      const theme = {
        id: "default",
        name: "Default Theme",
      };

      return jsonify({
        settings: domain.siteInfo,
        theme,
      });
    }),

  getSiteInfo: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .query(async ({ ctx }) => {
      const isSiteEditor =
        ctx.user &&
        checkPermission(ctx.user.permissions, [
          UIConstants.permissions.manageSite,
        ]);

      const exclusionFields: any = {
        "siteInfo.paymentMethods.stripe.stripeSecret": 0,
      };

      if (!isSiteEditor) {
        exclusionFields["siteInfo.paymentMethods.stripe.stripeWebhookSecret"] = 0;
      }

      const domain = await DomainModel.findById(
        ctx.domainData.domainObj._id,
        exclusionFields,
      ).lean();

      if (!domain) {
        throw new NotFoundException("Domain", "current");
      }

      // Return only siteInfo to match frontend expectations
      return jsonify(domain.siteInfo || {});
    }),

  updateSiteInfo: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(
      createPermissionMiddleware([UIConstants.permissions.manageSettings]),
    )
    .input(
      getFormDataSchema({
        title: z.string().min(1).max(120).optional(),
        subtitle: z.string().min(1).max(200).optional(),
        logo: mediaWrappedFieldValidator().nullable().optional(),
        codeInjectionHead: z.string().max(50000).optional(),
        codeInjectionBody: z.string().max(50000).optional(),
        mailingAddress: z.string().min(1).max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const domain = await DomainModel.findById(ctx.domainData.domainObj._id);

      if (!domain) {
        throw new NotFoundException("Domain", "current");
      }

      if (!domain.siteInfo) {
        domain.siteInfo = {} as ISiteInfo;
      }

      Object.keys(input.data).forEach((key) => {
        (domain.siteInfo as any)[key] = (input.data as any)[key];
      });

      await DomainManager.removeFromCache(domain.toJSON() as any);
      const saved = await domain.save();

      return jsonify(saved.toObject().siteInfo);
    }),

  updatePaymentInfo: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([UIConstants.permissions.manageSettings]))
    .input(
      getFormDataSchema({
        currencyISOCode: z.string().length(3),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const domain = await DomainModel.findById(ctx.domainData.domainObj._id);
      if (!domain) throw new NotFoundException("Domain", "current");
      if (!domain.siteInfo || !domain.siteInfo.title) throw new ValidationException("School title is not set");

      domain.siteInfo.currencyISOCode = input.data.currencyISOCode;
      
      const saved = await domain.save();
      await DomainManager.removeFromCache(domain.toJSON() as any);
      return jsonify(saved.toObject().siteInfo);
    }),

  updateStripeSettings: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([UIConstants.permissions.manageSettings]))
    .input(
      getFormDataSchema({
        stripeKey: z.string().min(32).max(255),
        stripeSecret: z.string().min(32).max(255),
        stripeWebhookSecret: z.string().min(32).max(255).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const domain = await DomainModel.findById(ctx.domainData.domainObj._id);
      if (!domain) throw new NotFoundException("Domain", "current");
      if (!domain.siteInfo) throw new ValidationException("Site info not found");

      if (!domain.siteInfo.paymentMethods) {
        domain.siteInfo.paymentMethods = { stripe: { type: "stripe" } };
      }
      if (!domain.siteInfo.paymentMethods.stripe) {
        domain.siteInfo.paymentMethods.stripe = { type: "stripe" };
      }

      domain.siteInfo.paymentMethods.stripe.stripeKey = input.data.stripeKey;
      domain.siteInfo.paymentMethods.stripe.stripeSecret = input.data.stripeSecret;
      if (input.data.stripeWebhookSecret) {
        domain.siteInfo.paymentMethods.stripe.stripeWebhookSecret = input.data.stripeWebhookSecret;
      }
      
      const saved = await domain.save();
      await DomainManager.removeFromCache(domain.toJSON() as any);
      return jsonify(saved.toObject().siteInfo);
    }),
});
