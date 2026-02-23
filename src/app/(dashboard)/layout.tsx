import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="bg-glow flex min-h-screen bg-brand-base">
      <Sidebar user={user} />
      <main className="relative z-10 flex-1 overflow-auto p-6 lg:p-8">{children}</main>
    </div>
  );
}
