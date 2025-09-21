import * as fonts from "@/lib/fonts";
import { SITE_SETTINGS_DEFAULT_TITLE } from "@/lib/ui/config/strings";
import { getSiteInfo as getServerSiteInfo } from "@/server/lib/site-info";
import { TRPCReactProvider } from "@/server/provider";
import { TRPCError } from "@trpc/server";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import NoSubdomainPage from "./_components/no-subdomain-page";
import { getT } from "./i18n/server";
import NextTopLoader from "nextjs-toploader";

import "@/lib/global-client";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

// export async function generateStaticParams() {
//   return languages.map((lng) => ({ lng }))
// }

export async function generateMetadata(): Promise<Metadata> {
  const siteInfo = await getServerSiteInfo();
  // const { t } = await getT();

  return {
    title: `${siteInfo?.title || SITE_SETTINGS_DEFAULT_TITLE}`,
    description: siteInfo?.subtitle || "",
    openGraph: {
      title: `${siteInfo?.title || SITE_SETTINGS_DEFAULT_TITLE}`,
      description: siteInfo?.subtitle || "",
      images: [
        {
          url: siteInfo?.logo?.file as any,
          alt: siteInfo?.logo?.caption || "",
        },
      ],
    },
    twitter: {
      title: `${siteInfo?.title || SITE_SETTINGS_DEFAULT_TITLE}`,
      description: siteInfo?.subtitle || "",
      images: [
        {
          url: siteInfo?.logo?.file as any,
          alt: siteInfo?.logo?.caption || "",
        },
      ],
    },
    generator: "CourseLit",
    applicationName: "CourseLit",
  };
}

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  let hasError = false;
  let serverSiteInfo: any = null;
  try {
    serverSiteInfo = await getServerSiteInfo();
  } catch (error) {
    if (error instanceof TRPCError) {
      hasError = true;
    }
  }

  const { i18n } = await getT();
  const cls = `${fonts.openSans.variable} ${fonts.montserrat.variable} ${fonts.lato.variable} ${fonts.poppins.variable} ${fonts.raleway.variable} ${fonts.notoSans.variable} ${fonts.merriweather.variable} ${fonts.inter.variable} ${fonts.alegreya.variable} ${fonts.roboto.variable} ${fonts.mulish.variable} ${fonts.nunito.variable} ${fonts.rubik.variable} ${fonts.playfairDisplay.variable} ${fonts.oswald.variable} ${fonts.ptSans.variable} ${fonts.workSans.variable} ${fonts.robotoSlab.variable} ${fonts.bebasNeue.variable} ${fonts.quicksand.variable} font-sans ${inter.className}`;
  if (hasError || !serverSiteInfo) {
    return (
      <html lang={i18n.language} suppressHydrationWarning>
        <head>{/* <style>{themeStyles}</style> */}</head>
        <body className={cls}>
          <NextTopLoader showSpinner={false} />
          <TRPCReactProvider>
            <NoSubdomainPage />
          </TRPCReactProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang={i18n.language} suppressHydrationWarning>
      <head>{/* <style>{themeStyles}</style> */}</head>
      <body className={cls}>
        <NextTopLoader showSpinner={false} />
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
