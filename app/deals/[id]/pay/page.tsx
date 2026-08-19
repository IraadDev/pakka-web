"use client";

/**
 * Payment (route /deals/[id]/pay). FR-3.4.
 *
 * The copy here does one job: make it unmistakable that the money is held and
 * not yet the seller's. A buyer who thinks they have already paid the seller
 * behaves very differently at handover.
 */
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { ApiError, api, inr } from "@/lib/api";
import type { DealDetail } from "@/lib/types";
import { useRequireAuth } from "@/lib/session";
import { Banner, Button, Card, Note, Page, Spinner, Stat } from "@/components/ui";

export default function PayPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();

  const [d, setD] = React.useState<DealDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [upiOnly, setUpiOnly] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    api.deal(id).then(setD).catch(() => setD(null)).finally(() => setLoading(false));
  }, [user, id]);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.fund(id, `${window.location.origin}/deals/${id}`);
      setUpiOnly(res.upi_only);
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
      } else {
        // No hosted checkout (stub provider) — the deal page shows what to do.
        router.push(`/deals/${id}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start the payment.");
      setBusy(false);
    }
  }

  if (authLoading || loading) return <Page width="narrow"><Spinner /></Page>;
  if (!user || !d) return null;

  return (
    <Page width="narrow">
      <h1 className="display-m">Pay for {d.deal.title}</h1>

      <Card>
        <div className="cs-grid-2">
          <Stat label="Item" value={inr(d.deal.amount_paise)} />
          <Stat label="Protection fee" value={inr(d.deal.fee_paise)} sub={`${d.deal.fee_payer} pays`} />
        </div>
        <div className="pl-section-rule" />
        <Stat label="You pay now" value={inr(d.buyer_total)} />
      </Card>

      <Banner tone="info">
        <strong>This money does not reach the seller yet.</strong> The payment
        provider holds it. It is released when you confirm you have the item —
        or automatically once the inspection window closes.
      </Banner>

      {upiOnly && (
        <Note tone="warn">
          Deals of this size are UPI-only. It settles instantly and cannot be
          reversed by mistake.
        </Note>
      )}

      {error && <Note tone="danger">{error}</Note>}

      <Button block onClick={pay} disabled={busy}>
        {busy ? "Starting…" : `Pay ${inr(d.buyer_total)}`}
      </Button>
    </Page>
  );
}
