"use client";

import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import CustomizationsSettings from "./customizations-settings";
import DomainManagement from "./domain-management";
import GeneralSettings from "./general-settings";
import MailsSettings from "./mails-settings";
import PaymentSettings from "./payment-settings";

interface SettingsProps {
  selectedTab: string;
}

export default function Settings({ selectedTab }: SettingsProps) {
  const { t } = useTranslation(["dashboard", "common"]);
  const router = useRouter();

  const tabs = [
    { value: "General", label: "General" },
    { value: "Payment", label: "Payment" },
    { value: "Mails", label: "Mails" },
    { value: "Customizations", label: "Customizations" },
    { value: "Domain Management", label: "Domain Management" },
  ];

  const selectedTabValue = tabs.find(t => t.value === selectedTab)?.value || "General";

  return (
    <div className="space-y-6">
      <HeaderTopbar
        header={{
          title: t("sidebar.settings"),
          subtitle: "Manage platform settings and configuration",
        }}
      />
      
      <Tabs
        value={selectedTabValue}
        onValueChange={(tab: string) => {
          router.replace(`/dashboard/admin/settings?tab=${tab}`);
        }}
        className="w-full"
      >
        <TabsList className="flex flex-wrap gap-2 w-fit h-auto justify-start">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex-none">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="General" className="mt-6">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="Payment" className="mt-6">
          <PaymentSettings />
        </TabsContent>

        <TabsContent value="Mails" className="mt-6">
          <MailsSettings />
        </TabsContent>

        <TabsContent value="Customizations" className="mt-6">
          <CustomizationsSettings />
        </TabsContent>

        <TabsContent value="Domain Management" className="mt-6">
          <DomainManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
