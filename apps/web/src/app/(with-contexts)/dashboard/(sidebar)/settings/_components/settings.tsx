"use client";

import {
  SITE_APIKEYS_SETTING_HEADER,
  SITE_CUSTOMISATIONS_SETTING_HEADER,
  SITE_MAILS_HEADER,
  SITE_SETTINGS_PAGE_HEADING,
  SITE_SETTINGS_SECTION_GENERAL,
  SITE_SETTINGS_SECTION_PAYMENT,
} from "@/lib/ui/config/strings";
import { UIConstants } from "@workspace/common-models";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { checkPermission } from "@workspace/utils";
import { useRouter } from "next/navigation";

import ApiKeysSettings from "./api-keys-settings";
import CustomizationsSettings from "./customizations-settings";
import DatabaseManagement from "./database-management";
import DomainManagement from "./domain-management";
import GeneralSettings from "./general-settings";
import MailsSettings from "./mails-settings";
import PaymentSettings from "./payment-settings";

import { useProfile } from "@/components/contexts/profile-context";

interface SettingsProps {
  selectedTab: string;
}

export default function Settings({ selectedTab }: SettingsProps) {
  const { profile } = useProfile();
  const selectedTabValue = [
    SITE_SETTINGS_SECTION_GENERAL,
    SITE_SETTINGS_SECTION_PAYMENT,
    SITE_MAILS_HEADER,
    SITE_CUSTOMISATIONS_SETTING_HEADER,
    SITE_APIKEYS_SETTING_HEADER,
    "Domain Management",
    "Database Management",
  ].includes(selectedTab)
    ? selectedTab
    : SITE_SETTINGS_SECTION_GENERAL;
  const router = useRouter();

  const items = [
    SITE_SETTINGS_SECTION_GENERAL,
    SITE_SETTINGS_SECTION_PAYMENT,
    SITE_MAILS_HEADER,
    SITE_CUSTOMISATIONS_SETTING_HEADER,
    SITE_APIKEYS_SETTING_HEADER,
    "Domain Management",
    "Database Management",
  ];

  return (
    <div>
      <div className="flex justify-between items-baseline">
        <h1 className="text-4xl font-semibold mb-4">
          {SITE_SETTINGS_PAGE_HEADING}
        </h1>
      </div>
      <Tabs
        value={selectedTabValue}
        onValueChange={(tab: string) => {
          router.replace(`/dashboard/settings?tab=${tab}`);
        }}
        className="w-full gap-4 md:gap-8"
      >
        <TabsList className="flex flex-wrap gap-2 w-fit h-auto justify-start">
          {items.map((item) => (
            <TabsTrigger key={item} value={item} className="flex-none">
              {item}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent
          value={SITE_SETTINGS_SECTION_GENERAL}
          className="flex flex-col gap-8"
        >
          <GeneralSettings />
        </TabsContent>

        <TabsContent
          value={SITE_SETTINGS_SECTION_PAYMENT}
          className="flex flex-col gap-8"
        >
          <PaymentSettings />
        </TabsContent>

        <TabsContent value={SITE_MAILS_HEADER} className="flex flex-col gap-8">
          <MailsSettings />
        </TabsContent>

        <TabsContent
          value={SITE_CUSTOMISATIONS_SETTING_HEADER}
          className="flex flex-col gap-8"
        >
          <CustomizationsSettings />
        </TabsContent>

        <TabsContent
          value={SITE_APIKEYS_SETTING_HEADER}
          className="flex flex-col gap-8"
        >
          <ApiKeysSettings />
        </TabsContent>

        <TabsContent value="Domain Management" className="flex flex-col gap-8">
          {checkPermission(profile.permissions, [
            UIConstants.permissions.manageSettings,
          ]) && <DomainManagement />}
        </TabsContent>

        <TabsContent
          value="Database Management"
          className="flex flex-col gap-8"
        >
          {checkPermission(profile.permissions, [
            UIConstants.permissions.manageSettings,
          ]) && <DatabaseManagement />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
