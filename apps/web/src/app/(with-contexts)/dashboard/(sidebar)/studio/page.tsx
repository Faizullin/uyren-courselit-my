"use client";

import DashboardContent from "@/components/admin/dashboard-content";
import { useProfile } from "@/components/contexts/profile-context";
import LoadingScreen from "@/components/admin/loading-screen";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Database, ArrowRightLeft } from "lucide-react";
import Link from "next/link";

export default function StudioPage() {
  const { profile } = useProfile();

  if (!profile) {
    return <LoadingScreen />;
  }

  if (!profile.roles?.includes("admin")) {
    return (
      <DashboardContent breadcrumbs={[{ label: "Studio", href: "#" }]}>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <h2 className="text-xl font-semibold text-muted-foreground">Access Denied</h2>
          <p className="text-muted-foreground">You need admin privileges to access Studio.</p>
        </div>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent breadcrumbs={[{ label: "Studio", href: "#" }]}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Studio</h1>
          <p className="text-muted-foreground">Manage your application data and perform migrations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Main Database
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Manage and view all database records including users, courses, quizzes, assignments, and more. 
                Full CRUD operations with JSON editor support.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>• View and search all data models</div>
                <div>• Create, update, and delete records</div>
                <div>• JSON editor for advanced operations</div>
                <div>• Real-time data management</div>
              </div>
              <div className="mt-6">
                <Link href="/dashboard/studio/db">
                  <Button className="w-full">
                    Open Database Manager
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-secondary" />
                Migration Tool
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Run database migrations, data transformations, and system updates. 
                Handle schema changes and data imports/exports safely.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>• Database schema migrations</div>
                <div>• Data import/export operations</div>
                <div>• Backup and restore functionality</div>
                <div>• System maintenance tools</div>
              </div>
              <div className="mt-6">
                <Button variant="secondary" className="w-full" disabled>
                  Coming Soon
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-medium mb-2">Studio Overview</h3>
          <p className="text-sm text-muted-foreground">
            The Studio provides administrative tools for managing your application's data and performing 
            system operations. Use the Main Database tool for everyday data management and the Migration 
            tool for system-level operations and data transformations.
          </p>
        </div>
      </div>
    </DashboardContent>
  );
}
