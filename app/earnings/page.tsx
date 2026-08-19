"use client";

/**
 * Payouts (route /earnings). FR-1.3–1.5.
 *
 * The name-match gate lives here in the UI as well as the API: an account in
 * somebody else's name is refused, and the reason is stated plainly rather
 * than shown as a generic validation error.
 */
import * as React from "react";
import { ApiError, api, inr } from "@/lib/api";
import type { PayoutAccount } from "@/lib/api";
import type { Deal } from "@/lib/types";
import { useRequireAuth } from "@/lib/session";
import {
  Banner, Button, Card, Field, Input, Note, Page, Select, Spinner, Stat,
} from "@/components/ui";

export default function EarningsPage() {
  const { user, loading } = useRequireAuth();
  const [accounts, setAccounts] = React.useState<PayoutAccount[]>([]);
  const [deals, setDeals] = React.useState<Deal[]>([]);
  const [kind, setKind] = React.useState<"vpa" | "bank">("vpa");
  const [value, setValue] = React.useState("");
  const [ifsc, setIfsc] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mismatch, setMismatch] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!user) return;
    const [a, d] = await Promise.all([
      api.payoutAccounts().catch(() => ({ accounts: [] })),
      api.deals("released").catch(() => ({ deals: [] })),
    ]);
    setAccounts(a.accounts);
    setDeals(d.deals.filter((x) => x.seller_id === user.id));
  }, [user]);

  React.useEffect(() => { void load(); }, [load]);

  if (loading) return <Page width="read"><Spinner /></Page>;
  if (!user) return null;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMismatch(null);
    try {
      await api.addPayoutAccount({ kind, value, ifsc: kind === "bank" ? ifsc : undefined });
      setValue("");
      setIfsc("");
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.code === "payout_name_mismatch") {
        setMismatch(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : "Could not add that account.");
      }
    } finally {
      setBusy(false);
    }
  }

  const earned = deals.reduce((sum, d) => sum + d.amount_paise, 0);

  return (
    <Page width="read">
      <h1 className="display-m">Earnings</h1>

      <div className="cs-grid-2">
        <Stat label="Deals completed" value={deals.length} />
        <Stat label="Total sold" value={inr(earned)} />
      </div>

      <Card>
        <h2>Where you get paid</h2>
        {accounts.length > 0 ? (
          <div className="stack">
            {accounts.map((a) => (
              <div key={a.id} className="dsc-row">
                <span className="mono">{a.masked_value}</span>
                <span className="pl-statusline">{a.verified_name}</span>
                {a.is_default
                  ? <span className="pl-status pl-status-available">Default</span>
                  : <Button size="sm" variant="ghost"
                            onClick={() => api.setDefaultPayout(a.id).then(load)}>
                      Make default
                    </Button>}
              </div>
            ))}
          </div>
        ) : (
          <Note>Add an account before selling — a buyer cannot pay you without one.</Note>
        )}
      </Card>

      <Card>
        <h2>Add an account</h2>
        <p className="text-2">
          We deposit ₹1 to confirm the account and read back the name on it. It
          is refunded automatically. The name must match your verified identity.
        </p>

        <form onSubmit={add}>
          <Field label="Type" htmlFor="kind">
            <Select id="kind" value={kind} onChange={(e) => setKind(e.target.value as "vpa" | "bank")}>
              <option value="vpa">UPI ID</option>
              <option value="bank">Bank account</option>
            </Select>
          </Field>

          <Field label={kind === "vpa" ? "UPI ID" : "Account number"} htmlFor="val">
            <Input id="val" value={value} onChange={(e) => setValue(e.target.value)}
                   placeholder={kind === "vpa" ? "name@okbank" : "50100123456789"} />
          </Field>

          {kind === "bank" && (
            <Field label="IFSC" htmlFor="ifsc">
              <Input id="ifsc" value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                     placeholder="HDFC0001234" />
            </Field>
          )}

          {mismatch && (
            <Banner tone="danger">
              <strong>That account is in a different name.</strong> {mismatch}{" "}
              Money can only be sent to an account in your own verified name.
            </Banner>
          )}
          {error && <Note tone="danger">{error}</Note>}

          <Button type="submit" disabled={busy || !value}>
            {busy ? "Verifying…" : "Verify and add"}
          </Button>
        </form>
      </Card>
    </Page>
  );
}
