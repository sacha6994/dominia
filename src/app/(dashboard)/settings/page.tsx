import { createClient } from "@/lib/supabase/server";
import WebhookSettings from "@/components/settings/webhook-settings";
import DownloadReport from "@/components/settings/download-report";
import type { UserSettings } from "@/types";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch existing webhook settings
  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user?.id)
    .maybeSingle();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Paramètres</h1>
      <p className="mt-1 text-sm text-slate-400">
        Gérez votre compte et vos préférences
      </p>

      <div className="mt-6 space-y-6">
        <div className="rounded-xl bg-[#0f1729] p-6 ring-1 ring-inset ring-slate-700/50">
          <h2 className="text-lg font-medium text-white">Profil</h2>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-400">
              Email
            </label>
            <p className="mt-1 text-white">{user?.email}</p>
          </div>
        </div>

        <div className="rounded-xl bg-[#0f1729] p-6 ring-1 ring-inset ring-slate-700/50">
          <h2 className="text-lg font-medium text-white">
            Notifications Email
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Les alertes email sont envoyées automatiquement quand un certificat
            SSL ou nom de domaine approche de son expiration (30, 14, 7 et 1
            jour avant).
          </p>
        </div>

        <WebhookSettings
          initialSettings={settings as UserSettings | null}
          userId={user?.id ?? ""}
        />

        <DownloadReport />
      </div>
    </div>
  );
}
