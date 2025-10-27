import { AppSidebar } from "@/components/dashboard/dashboard-skeleton/app-sidebar";
import { LayoutContextProvider } from "@/components/dashboard/layout/layout-context";
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LayoutContextProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </LayoutContextProvider>
  );
}
