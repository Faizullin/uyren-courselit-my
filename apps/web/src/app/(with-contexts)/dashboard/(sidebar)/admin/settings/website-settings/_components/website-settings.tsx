"use client";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Key } from "lucide-react";
import Link from "next/link";
import React from "react";
import MainPageSettings from "./main-page-settings";

export default function WebsiteSettings() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Website Configuration</h2>
        <p className="text-muted-foreground">
          Configure your website appearance and main page settings.
        </p>
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">External API Keys</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Manage third-party API credentials for external integrations
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/admin/settings/website-settings/external-api-keys">
                Manage API Keys
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <MainPageSettings />
    </div>
  );
}
