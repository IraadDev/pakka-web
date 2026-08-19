"use client";

/**
 * Dispute console (route /admin/disputes). FR-3.9 adjudication.
 *
 * Oldest first: the queue is ordered by how close each case is to breaching
 * the published 72-hour SLA, not by when someone happened to open it.
 */
import Link from "next/link";
import * as React from "react";
import { ApiError, api, ago, inr } from "@/lib/api";
import type { Dispute } from "@/lib/types";
import { useRequireAuth } from "@/lib/session";
import {
  Button, Card, Empty, Field, Input, Note, Page, Spinner, Textarea,
} from "@/components/ui";

export default function AdminDisputesPage() {
  const { user, loading } = useRequireAuth();
  const [disputes, setDisputes] = React.useState<Dispute[]>([]);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [note, setNote] = React.useState("");
  const [partial, setPartial] = React.useState("");

  // Pinned once per load rather than read during render: Date.now() in the
  // render body makes the output depend on when React happens to re-render,
  // which is exactly the kind of nondeterminism that breaks hydration.
  const [now, setNow] = React.useState(() => Date.now());

  const load = React.useCallback(async () => {
    try {
      const { disputes } = await api.adminDisputes();
      setDisputes(disputes);
      setNow(Date.now());
    } catch {
      setDisputes([]);
    }
  }, []);

  React.useEffect(() => { if (user?.role === "admin") void load(); }, [user, load]);

  if (loading) return <Page width="app"><Spinner /></Page>;
  if (!user) return null;
  if (user.role !== "admin") {
    return <Page width="app"><Note tone="danger">Admins only.</Note></Page>;
  }

  async function resolve(d: Dispute, outcome: "release" | "refund" | "partial") {
    setBusy(d.id);
    setError(null);
    try {
      await api.resolveDispute(d.deal_id, {
        outcome,
        release_paise: outcome === "partial" ? Math.round(Number(partial) * 100) : undefined,
        note: note || undefined,
      });
      setNote("");
      setPartial("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not resolve.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Page width="app">
      <h1 className="display-m">Disputes</h1>
      {error && <Note tone="danger">{error}</Note>}

      {disputes.length === 0 ? (
        <Empty title="Nothing waiting">No open disputes.</Empty>
      ) : (
        <div className="stack">
          {disputes.map((d) => {
            const hours = Math.floor((now - new Date(d.created_at).getTime()) / 3600000);
            const breaching = hours >= 72;
            return (
              <Card key={d.id}>
                <div className="dsc-row">
                  <strong>
                    <Link href={`/deals/${d.deal_id}`}>Deal {d.deal_id.slice(0, 8)}</Link>
                  </strong>
                  <span className={`pl-status ${breaching ? "pl-status-stock_out" : "pl-status-reserved"}`}>
                    {hours}h old{breaching ? " — past SLA" : ""}
                  </span>
                </div>

                <p className="text-2">{d.reason}</p>
                <div className="pl-statusline">Raised {ago(d.created_at)}</div>

                <Field label="Decision note" htmlFor={`n-${d.id}`}>
                  <Textarea id={`n-${d.id}`} rows={2} value={note}
                            onChange={(e) => setNote(e.target.value)} />
                </Field>

                <div className="pl-toolbar">
                  <Button size="sm" onClick={() => resolve(d, "release")} disabled={busy === d.id}>
                    Release to seller
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => resolve(d, "refund")} disabled={busy === d.id}>
                    Refund buyer
                  </Button>
                  <Input style={{ maxWidth: 140 }} type="number" placeholder="Partial ₹"
                         value={partial} onChange={(e) => setPartial(e.target.value)} />
                  <Button size="sm" variant="secondary" disabled={busy === d.id || !partial}
                          onClick={() => resolve(d, "partial")}>
                    Split
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Page>
  );
}
