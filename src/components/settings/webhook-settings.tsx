"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserSettings } from "@/types";

interface Props {
  initialSettings: UserSettings | null;
  userId: string;
}

export default function WebhookSettings({ initialSettings, userId }: Props) {
  const [webhookUrl, setWebhookUrl] = useState(
    initialSettings?.webhook_url ?? ""
  );
  const [enabled, setEnabled] = useState(
    initialSettings?.webhook_enabled ?? false
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const supabase = createClient();

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const payload = {
      user_id: userId,
      webhook_url: webhookUrl.trim() || null,
      webhook_enabled: enabled,
      updated_at: new Date().toISOString(),
    };

    // Upsert: insert if no row exists, update if it does
    const { error } = initialSettings
      ? await supabase
          .from("user_settings")
          .update(payload)
          .eq("user_id", userId)
      : await supabase.from("user_settings").insert(payload);

    setSaving(false);

    if (error) {
      setMessage({ type: "error", text: `Erreur : ${error.message}` });
    } else {
      setMessage({ type: "success", text: "Paramètres sauvegardés" });
    }
  };

  const handleTest = async () => {
    if (!webhookUrl.trim()) {
      setMessage({ type: "error", text: "Entrez une URL de webhook d'abord" });
      return;
    }

    setTesting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/webhook/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({
          type: "error",
          text: data.error || `Erreur HTTP ${res.status}`,
        });
      } else {
        setMessage({
          type: "success",
          text: "Message de test envoyé avec succes !",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur reseau" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="rounded-xl bg-[#0f1729] p-6 ring-1 ring-inset ring-slate-700/50">
      <h2 className="text-lg font-medium text-white">
        Notifications Webhook
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        Recevez les alertes d&apos;expiration sur Slack, Discord, ou tout
        webhook HTTP.
      </p>

      {/* Toggle */}
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((e) => !e)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            enabled ? "bg-blue-600" : "bg-slate-600"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <span className="text-sm text-slate-300">
          {enabled ? "Activé" : "Désactivé"}
        </span>
      </div>

      {/* URL input */}
      <div className="mt-4">
        <label
          htmlFor="webhook-url"
          className="block text-sm font-medium text-slate-400"
        >
          URL du webhook
        </label>
        <input
          id="webhook-url"
          type="url"
          placeholder="https://hooks.slack.com/services/..."
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0b1120] px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Compatible Slack (Incoming Webhooks), Discord (Webhooks), ou tout
          endpoint POST acceptant du JSON.
        </p>
      </div>

      {/* Actions */}
      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </button>
        <button
          onClick={handleTest}
          disabled={testing || !webhookUrl.trim()}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-40"
        >
          {testing ? "Envoi..." : "Tester"}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mt-4 rounded-lg px-4 py-2.5 text-sm ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
