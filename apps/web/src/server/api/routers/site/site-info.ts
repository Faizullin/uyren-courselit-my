import constants from "@/config/constants";
import { responses } from "@/config/strings";
import ApikeyModel from "@/models/ApiKey";
import DomainModel, { Domain } from "@/models/Domain";

import {
  Constants,
  PaymentMethod,
  SiteInfo,
  UIConstants,
} from "@workspace/common-models";
import { capitalize, checkPermission } from "@workspace/utils";
import { z } from "zod";
import {
  ConflictException,
  NotFoundException,
  ValidationException,
} from "../../core/exceptions";
import {
  createDomainRequiredMiddleware,
  createPermissionMiddleware,
  protectedProcedure,
  publicProcedure,
} from "../../core/procedures";
import { getFormDataSchema } from "../../core/schema";
import { router } from "../../core/trpc";
import { mediaWrappedFieldValidator } from "../../core/validators";

import currencies from "@/data/currencies.json";
import DomainManager from "@/server/lib/domain";

const { permissions } = UIConstants;

function validateSiteInfo(domain: Domain) {
  if (!domain.settings.title || !domain.settings.title.trim()) {
    throw new ConflictException(responses.school_title_not_set);
  }

  if (
    domain.settings.mailingAddress &&
    domain.settings.mailingAddress.trim().length <
      constants.minMailingAddressLength
  ) {
    throw new ConflictException(responses.mailing_address_too_short);
  }
}

const currencyISOCodes = currencies.map((currency) =>
  currency.isoCode?.toLowerCase(),
);

const verifyCurrencyISOCode = (isoCode: string) => {
  if (!currencyISOCodes.includes(isoCode.toLowerCase())) {
    throw new Error(responses.unrecognised_currency_code);
  }
};

const verifyCurrencyISOCodeBasedOnSiteInfo = (siteInfo: SiteInfo) => {
  if (!siteInfo.paymentMethod) {
    if (siteInfo.currencyISOCode) {
      verifyCurrencyISOCode(siteInfo.currencyISOCode);
    }
  } else {
    if (!siteInfo.currencyISOCode) {
      throw new Error(responses.currency_iso_code_required);
    }

    verifyCurrencyISOCode(siteInfo.currencyISOCode);
  }
};

const checkForInvalidPaymentSettings = (
  siteInfo: SiteInfo,
): undefined | Error => {
  verifyCurrencyISOCodeBasedOnSiteInfo(siteInfo);

  if (!siteInfo.paymentMethod) {
    return;
  }

  if (!Constants.paymentMethods.includes(siteInfo.paymentMethod)) {
    return new Error(responses.invalid_payment_method);
  }
};

const checkForInvalidPaymentMethodSettings = (siteInfo: SiteInfo) => {
  if (!siteInfo.paymentMethod) {
    return;
  }

  let failedPaymentMethod: PaymentMethod | undefined = undefined;



  if (
    siteInfo.paymentMethod === UIConstants.PAYMENT_METHOD_STRIPE &&
    !(siteInfo.stripeSecret && siteInfo.stripeKey)
  ) {
    failedPaymentMethod = UIConstants.PAYMENT_METHOD_STRIPE;
  }

  return failedPaymentMethod;
};

const getPaymentInvalidException = (paymentMethod: string) =>
  new Error(
    `${capitalize(paymentMethod)} ${responses.payment_settings_invalid_suffix}`,
  );

export const siteInfoRouter = router({
  publicGetSettings: publicProcedure.query(async ({ ctx }) => {
    const { domainObj } = ctx.domainData || {};

    if (!domainObj) {
      throw new NotFoundException("Domain", "current");
    }

    return domainObj.settings;
  }),

  // Get complete site setup (settings + theme + page) - replaces getFullSiteSetup
  publicGetFullSiteSetup: publicProcedure
    .input(
      z.object({
        pageId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      console.log("[publicGetFullSiteSetup]");

      const { domainObj } = ctx.domainData || {};

      if (!domainObj) {
        throw new NotFoundException("Domain", "current");
      }

      const exclusionProjection: Record<string, 0> = {
        email: 0,
        deleted: 0,
        customDomain: 0,
        "settings.stripeSecret": 0,
        "settings.paytmSecret": 0,
        "settings.paypalSecret": 0,
        "settings.razorpaySecret": 0,
        "settings.razorpayWebhookSecret": 0,
        lastEditedThemeId: 0,
      };

      const theme = {
        id: domainObj.themeId || "default",
        name: "Default Theme",
      };

      // Return combined data
      return {
        settings: domainObj.settings,
        theme,
      };
    }),

  updateSiteInfo: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageSettings]))
    .input(
      getFormDataSchema({
        title: z.string().optional(),
        subtitle: z.string().optional(),
        hideCourseLitBranding: z.boolean().optional(),
        logo: mediaWrappedFieldValidator().nullable().optional(),
        codeInjectionHead: z.string().optional(),
        codeInjectionBody: z.string().optional(),
        codeInjectionFoot: z.string().optional(),
        mailingAddress: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const domain = await DomainModel.findOne({
        _id: ctx.domainData.domainObj._id,
      });
      if (!domain) {
        throw new NotFoundException("Domain", "current");
      }
      const siteData = input.data;

      if (!domain.settings) {
        domain.settings = {};
      }

      for (const key of Object.keys(siteData)) {
        (domain as any).settings[key] = (siteData as any)[key];
      }

      validateSiteInfo(domain);

      await DomainManager.removeFromCache(domain);
      await domain.save();
      await DomainManager.setDomainCache(domain);

      return domain;
    }),

  getSiteInfo: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .query(async ({ ctx }) => {
      const exclusionProjection: Record<string, 0> = {
        email: 0,
        deleted: 0,
        customDomain: 0,
        "settings.stripeSecret": 0,
        "settings.paytmSecret": 0,
        "settings.paypalSecret": 0,
        "settings.razorpaySecret": 0,
        "settings.razorpayWebhookSecret": 0,
      };
      const isSiteEditor =
        ctx.user &&
        checkPermission(ctx.user.permissions, [permissions.manageSite]);
      if (!isSiteEditor) {
        exclusionProjection.lastEditedThemeId = 0;
      }
      const domain = await DomainModel.findById(
        ctx.domainData.domainObj._id,
        exclusionProjection,
      );
      if (!domain) {
        throw new NotFoundException("Domain", "current");
      }
      return domain;
    }),

  listApiKeys: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageSettings]))
    .query(async ({ ctx }) => {
      const apikeys = (await ApikeyModel.find(
        { domain: ctx.domainData.domainObj._id },
        {
          name: 1,
          keyId: 1,
          createdAt: 1,
          purposeKey: 1,
        },
      ).lean()) as unknown as {
        name: string;
        keyId: string;
        createdAt: string;
        purposeKey: string;
      }[];
      return apikeys;
    }),

  addApiKey: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageSettings]))
    .input(
      getFormDataSchema({
        name: z.string().min(1).max(255),
        purposeKey: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const domain = await DomainModel.findById(ctx.domainData.domainObj._id);
      if (!domain) {
        throw new NotFoundException("Domain", "current");
      }
      const existingApikey = await ApikeyModel.findOne({
        name: input.data.name,
        domain: domain._id,
      });
      if (existingApikey) {
        throw new ConflictException(responses.apikey_already_exists);
      }
      const apikey = await ApikeyModel.create({
        name: input.data.name,
        domain: domain._id,
        purposeKey: input.data.purposeKey,
      });

      return {
        name: apikey.name,
        keyId: apikey.keyId,
        key: apikey.key,
        purposeKey: apikey.purposeKey,
      };
    }),

  removeApiKey: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageSettings]))
    .input(
      getFormDataSchema({
        keyId: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const domain = await DomainModel.findById(ctx.domainData.domainObj._id);
      if (!domain) {
        throw new NotFoundException("Domain", "current");
      }

      const apikey = await ApikeyModel.findOneAndDelete({
        keyId: input.data.keyId,
        domain: ctx.domainData.domainObj._id,
      });
      if (!apikey) {
        throw new NotFoundException("API Key", input.data.keyId);
      }

      return apikey;
    }),

  updatePaymentInfo: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageSettings]))
    .input(
      getFormDataSchema({
        currencyISOCode: z.string().min(1).max(3).optional(),
        paymentMethod: z.enum(Constants.paymentMethods).optional(),
        stripeKey: z.string().min(32).max(255).optional(),
        stripeSecret: z.string().min(32).max(255).optional(),
        // razorpayWebhookSecret: $razorpayWebhookSecret,
        // lemonsqueezyKey: $lemonsqueezyKey,
        // lemonsqueezyStoreId: $lemonsqueezyStoreId,
        // lemonsqueezyWebhookSecret: $lemonsqueezyWebhookSecret,
        // lemonsqueezyOneTimeVariantId: $lemonsqueezyOneTimeVariantId,
        // lemonsqueezySubscriptionMonthlyVariantId:
        //   $lemonsqueezySubscriptionMonthlyVariantId,
        // lemonsqueezySubscriptionYearlyVariantId:
        //   $lemonsqueezySubscriptionYearlyVariantId,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const domain = await DomainModel.findById(ctx.domainData.domainObj._id);
      if (!domain) {
        throw new NotFoundException("Domain", "current");
      }

      if (!domain.settings || !domain.settings.title) {
        throw new ValidationException(responses.school_title_not_set);
      }

      Object.assign(domain.settings, input.data);

      const invalidPaymentMethod = checkForInvalidPaymentSettings(
        domain.settings,
      );
      if (invalidPaymentMethod) {
        throw invalidPaymentMethod;
      }

      const failedPaymentMethod = checkForInvalidPaymentMethodSettings(
        domain.settings,
      );
      if (failedPaymentMethod) {
        throw getPaymentInvalidException(failedPaymentMethod);
      }

      if (domain.settings.paymentMethod) {
        domain.settings.currencyISOCode =
          domain.settings.currencyISOCode?.toLowerCase();
      }
      await domain.save();

      return domain;
    }),
});
