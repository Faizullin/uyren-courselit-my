import { AddressProvider } from "@/components/contexts/address-context";
import { defaultState } from "@/components/contexts/default-state";
import { ProfileProvider } from "@/components/contexts/profile-context";
import { ServerConfigProvider } from "@/components/contexts/server-config-context";
import { SiteInfoProvider } from "@/components/contexts/site-info-context";
import { ThemeProvider as NextThemesProvider } from "@/components/next-theme-provider";
import SessionWrapper from "@/components/layout/session-wrapper";
import { authOptions } from "@/lib/auth/options";
import { getAddressFromHeaders } from "@/lib/ui/lib/utils";
import { getSiteInfo as getServerSiteInfo } from "@/server/lib/site-info";
import { SiteInfo } from "@workspace/common-models";
import { Provider as NiceModalProvider } from "@workspace/components-library";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import React from "react";
import { Toaster } from "sonner";
import TranslationWrapper from "@/components/layout/translation-wrapper";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const address = await getAddressFromHeaders(headers);
  const siteInfo = await getServerSiteInfo();
  const formattedSiteInfo = formatInitialSiteInfo(siteInfo);
  return (
    <TranslationWrapper>
      <SessionWrapper session={session}>
        <AddressProvider
          initialAddress={{
            frontend: address,
            backend: address,
          }}
        >
          <SiteInfoProvider initialSiteInfo={formattedSiteInfo}>
            <ServerConfigProvider initialConfig={defaultState.config}>
              <NextThemesProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <ProfileProvider>
                  <NiceModalProvider>
                    <NuqsAdapter>{children}</NuqsAdapter>
                  </NiceModalProvider>
                </ProfileProvider>
              </NextThemesProvider>
            </ServerConfigProvider>
          </SiteInfoProvider>
          <Toaster />
        </AddressProvider>
      </SessionWrapper>
    </TranslationWrapper>
  );
}

const formatInitialSiteInfo = (siteInfo?: SiteInfo) => {
  return {
    title: siteInfo?.title || defaultState.siteinfo.title,
    subtitle: siteInfo?.subtitle || defaultState.siteinfo.subtitle,
    logo: siteInfo
      ? {
          mediaId:
            siteInfo.logo?.mediaId || defaultState.siteinfo.logo?.mediaId!,
          originalFileName: siteInfo.logo?.originalFileName!,
          size: siteInfo.logo?.size!,
          url: siteInfo.logo?.url || defaultState.siteinfo.logo?.url!,
          mimeType: siteInfo.logo?.mimeType!,
          access: siteInfo.logo?.access!,
          thumbnail: siteInfo.logo?.thumbnail!,
          storageProvider: siteInfo.logo?.storageProvider!,
        }
      : defaultState.siteinfo.logo!,
    currencyISOCode:
      siteInfo?.currencyISOCode || defaultState.siteinfo.currencyISOCode,
    paymentMethod:
      siteInfo?.paymentMethod || defaultState.siteinfo.paymentMethod,
    stripeKey: siteInfo?.stripeKey || defaultState.siteinfo.stripeKey,
    codeInjectionHead:
      siteInfo?.codeInjectionHead || defaultState.siteinfo.codeInjectionHead,
    codeInjectionBody:
      siteInfo?.codeInjectionBody || defaultState.siteinfo.codeInjectionBody,
    mailingAddress:
      siteInfo?.mailingAddress || defaultState.siteinfo.mailingAddress,
  };
};

// const formatSiteInfo = (siteinfo?: SiteInfo) => ({
//   title: siteinfo?.title || defaultState.siteinfo.title,
//   subtitle: siteinfo?.subtitle || defaultState.siteinfo.subtitle,
//   logo: siteinfo?.logo || defaultState.siteinfo.logo,
//   currencyISOCode:
//     siteinfo?.currencyISOCode || defaultState.siteinfo.currencyISOCode,
//   paymentMethod: siteinfo?.paymentMethod || defaultState.siteinfo.paymentMethod,
//   stripeKey: siteinfo?.stripeKey || defaultState.siteinfo.stripeKey,
//   // codeInjectionHead: siteinfo?.codeInjectionHead
//   //   ? decode(siteinfo.codeInjectionHead)
//   //   : defaultState.siteinfo.codeInjectionHead,
//   // codeInjectionBody: siteinfo?.codeInjectionBody
//   //   ? decode(siteinfo.codeInjectionBody)
//   //   : defaultState.siteinfo.codeInjectionBody,
//   mailingAddress:
//     siteinfo?.mailingAddress || defaultState.siteinfo.mailingAddress,
//   hideCourseLitBranding:
//     siteinfo?.hideCourseLitBranding ||
//     defaultState.siteinfo.hideCourseLitBranding,
// });
