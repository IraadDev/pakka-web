"use client";

/**
 * RC transfer tracker (route /deals/[id]/rc). FR-4.
 *
 * This is the part of a used-vehicle sale that actually goes wrong in India:
 * until the RC transfers, the seller is still the registered owner and still
 * liable. The holdback is what gets the paperwork finished.
 */
import { useParams } from "next/navigation";
import * as React from "react";
import { ApiError, api, inr } from "@/lib/api";
import type { DealDetail, RCTransfer } from "@/lib/types";
import { useRequireAuth } from "@/lib/session";
import { Banner, Button, Card, Field, Input, Note, Page, Spinner } from "@/components/ui";

const STEPS = [
  { key: "pending", label: "Not started", who: "" },
  { key: "intimated", label: "Sale intimated to the RTO", who: "seller" },
  { key: "applied", label: "Transfer application filed", who: "buyer" },
  { key: "confirmed", label: "Ownership transferred", who: "" },
];

export default function RCPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useRequireAuth();

  const [d, setD] = React.useState<DealDetail | null>(null);
  const [t, setT] = React.useState<RCTransfer | null>(null);
  const [holdback, setHoldback] = React.useState(0);
  const [plate, setPlate] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const deal = await api.deal(id);
      setD(deal);
      try {
        const rc = await api.rc(id);
        setT(rc.transfer);
        setHoldback(rc.holdback_paise);
      } catch {
        setT(null); // not tracked yet
        setHoldback(deal.holdback);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => { if (user) void load(); }, [user, load]);

  async function act<T>(fn: () => Promise<T>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || loading) return <Page width="read"><Spinner /></Page>;
  if (!user || !d) return null;

  const isBuyer = user.id === d.deal.buyer_id;
  const stepIndex = STEPS.findIndex((s) => s.key === (t?.status ?? "pending"));

  return (
    <Page width="read">
      <h1 className="display-m">Ownership transfer</h1>

      {holdback > 0 && (
        <div className="pl-holdback">
          <span className="amt">{inr(holdback)}</span>
          <span>
            held until the RC shows the buyer as owner. Released to the seller
            automatically after 45 days either way.
          </span>
        </div>
      )}

      {!t ? (
        <Card>
          <h2>Start tracking</h2>
          <Field label="Registration number" htmlFor="plate">
            <Input id="plate" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())}
                   placeholder="MH12AB1234" />
          </Field>
          {error && <Note tone="danger">{error}</Note>}
          <Button onClick={() => act(() => api.startRC(id, plate))} disabled={busy || !plate}>
            Start tracking
          </Button>
        </Card>
      ) : (
        <>
          <Card>
            <h2>{t.plate}</h2>
            <ol className="pl-timeline">
              {STEPS.map((s, i) => (
                <li key={s.key}
                    className={`pl-timeline-item ${i < stepIndex ? "is-done" : i === stepIndex ? "is-now" : ""}`}>
                  {s.label}
                  {s.who && <span className="when">{s.who} files this</span>}
                </li>
              ))}
            </ol>
          </Card>

          {error && <Note tone="danger">{error}</Note>}
          {msg && <Banner tone="info">{msg}</Banner>}

          {t.status === "pending" && !isBuyer && (
            <Button onClick={() => act(() => api.advanceRC(id, "intimated"))} disabled={busy}>
              I have filed the intimation of sale
            </Button>
          )}

          {t.status === "intimated" && isBuyer && (
            <Button onClick={() => act(() => api.advanceRC(id, "applied"))} disabled={busy}>
              I have filed the transfer application
            </Button>
          )}

          {t.status === "applied" && (
            <Button
              onClick={() => act(async () => {
                const r = await api.confirmRC(id);
                setMsg(r.confirmed ? "Confirmed — the holdback has been released." : (r.message ?? null));
              })}
              disabled={busy}
            >
              Check VAHAN now
            </Button>
          )}

          {t.status === "confirmed" && (
            <Banner tone="ok">
              Ownership has transferred. The seller is no longer liable for this vehicle.
            </Banner>
          )}
        </>
      )}
    </Page>
  );
}
