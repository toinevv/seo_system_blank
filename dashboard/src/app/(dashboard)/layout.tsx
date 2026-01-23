import { Sidebar } from "@/components/dashboard/sidebar";

// Force dynamic rendering to prevent build-time Supabase client initialization
export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-background">{children}</main>
    </div>
  );
}
