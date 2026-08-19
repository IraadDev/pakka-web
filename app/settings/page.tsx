"use client";

/** Settings (route /settings): profile, payouts, notifications. */
import Link from "next/link";
import * as React from "react";
import { ApiError, api } from "@/lib/api";
import type { PayoutAccount } from "@/lib/api";
import type { NotificationPrefs } from "@/lib/types";
import { useRequireAuth, useSession } from "@/lib/session";
import {
  Button, Card, Field, Input, Note, Page, Spinner, Verified,
} from "@/components/ui";

export default function SettingsPage() {
  const { user, loading } = useRequireAuth();
  const { refresh } = useSession();

  // null means "not yet edited" — the stored value shows until the user types.
  const [nameEdit, setName] = React.useState<string | null>(null);
  const [cityEdit, setCity] = React.useState<string | null>(null);
  const [handleEdit, setHandle] = React.useState<string | null>(null);
  const name = nameEdit ?? user?.name ?? "";
  const city = cityEdit ?? user?.city ?? "";
  const handle = handleEdit ?? user?.handle ?? "";
  const [accounts, setAccounts] = React.useState<PayoutAccount[]>([]);
  const [prefs, setPrefs] = React.useState<NotificationPrefs | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    void api.payoutAccounts().then((r) => setAccounts(r.accounts)).catch(() => {});
    void api.prefs().then((r) => setPrefs(r.preferences)).catch(() => {});
  }, [user]);

  if (loading) return <Page width="read"><Spinner /></Page>;
  if (!user) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api.updateMe({ name, city, handle: handle || undefined });
      await refresh();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function togglePref(k: keyof NotificationPrefs) {
    if (!prefs) return;
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(next);
    await api.setPrefs(next).catch(() => setPrefs(prefs));
  }

  return (
    <Page width="read">
      <h1 className="display-m">Settings</h1>

      <Card>
        <h2>Profile</h2>
        <form onSubmit={save}>
          <Field label="Name" htmlFor="name">
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="City" htmlFor="city">
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field label="Handle" hint="Your public storefront address" htmlFor="handle">
            <Input id="handle" value={handle}
                   onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
          </Field>
          {error && <Note tone="danger">{error}</Note>}
          {saved && <Note tone="ok">Saved.</Note>}
          <Button type="submit" disabled={busy}>Save</Button>
        </form>
      </Card>

      <Card>
        <h2>Identity</h2>
        {user.kyc_status === "verified" ? (
          <p className="text-2">Verified <Verified /> — payouts must match your legal name.</p>
        ) : (
          <>
            <p className="text-2">Not verified. You cannot publish or transact until you are.</p>
            <Link href="/kyc" className="pl-btn pl-btn-primary">Verify identity</Link>
          </>
        )}
      </Card>

      <Card>
        <h2>Payout accounts</h2>
        {accounts.length === 0 ? (
          <p className="text-2">
            None yet. You need one before a buyer can pay you.
          </p>
        ) : (
          <div className="stack">
            {accounts.map((a) => (
              <div key={a.id} className="dsc-row">
                <span className="mono">{a.masked_value}</span>
                <span className="pl-statusline">{a.verified_name}</span>
                {a.is_default && <span className="pl-status pl-status-available">Default</span>}
              </div>
            ))}
          </div>
        )}
        <Link href="/earnings" className="pl-btn pl-btn-secondary">Manage payouts</Link>
      </Card>

      {prefs && (
        <Card>
          <h2>Notifications</h2>
          <div className="stack">
            {([
              ["push", "Push notifications", "Reaches you when the app is closed"],
              ["sms", "SMS", "Deal and handover codes"],
              ["watch", "Saved-search alerts", "When something matching is listed"],
            ] as const).map(([k, label, hint]) => (
              <label key={k} className="dsc-row">
                <input type="checkbox" className="pl-check" checked={prefs[k]}
                       onChange={() => togglePref(k)} />
                <span>
                  <strong>{label}</strong>
                  <div className="pl-statusline">{hint}</div>
                </span>
              </label>
            ))}
          </div>
        </Card>
      )}
    </Page>
  );
}
