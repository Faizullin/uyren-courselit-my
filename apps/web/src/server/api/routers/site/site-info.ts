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

    const domain = await DomainModel.findById(
      domainObj._id,
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

      const exclusionFields = {
        "siteInfo.paymentMethods.stripe.stripeSecret": 0,
        "siteInfo.paymentMethods.stripe.stripeWebhookSecret": 0,
      };

      const domain = await DomainModel.findById(
        domainObj._id,
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
      return jsonify(domain.siteInfo);
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
        codeInjectionHead: z.string().max(50000).optional(),
        codeInjectionBody: z.string().max(50000).optional(),
        mailingAddress: z.string().min(1).max(500).optional(),
        aiHelper: z.object({
          enabled: z.boolean().optional(),
        }).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const domain = await DomainModel.findById(ctx.domainData.domainObj._id);

      if (!domain) {
        throw new NotFoundException("Domain", "current");
      }

      const submitData = domain.toJSON();

      if (!submitData.siteInfo) {
        throw new ValidationException("Site info not found");
      }

      if(input.data.aiHelper) {
        submitData.siteInfo.aiHelper = { 
          enabled: input.data.aiHelper.enabled || false,
        };
      }

      if(input.data.title) {
        submitData.siteInfo.title = input.data.title;
      }

      if(input.data.subtitle) {
        submitData.siteInfo.subtitle = input.data.subtitle;
      }

      if(input.data.codeInjectionHead) {
        submitData.siteInfo.codeInjectionHead = input.data.codeInjectionHead;
      }

      if(input.data.codeInjectionBody) {
        submitData.siteInfo.codeInjectionBody = input.data.codeInjectionBody;
      }

      if(input.data.mailingAddress) {
        submitData.siteInfo.mailingAddress = input.data.mailingAddress;
      }
      await DomainManager.removeFromCache(submitData as any);
      const saved = await DomainModel.findByIdAndUpdate(ctx.domainData.domainObj._id, { siteInfo: submitData.siteInfo }, { new: true });
      if (!saved) {
        throw new NotFoundException("Domain", "current");
      }
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
      await DomainManager.removeFromCache(domain.toJSON());
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
