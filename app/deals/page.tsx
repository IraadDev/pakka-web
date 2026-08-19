"use client";

/** My deals (route /deals). */
import Link from "next/link";
import * as React from "react";
import { api, ago, inr, dealStateClass, dealStateLabel } from "@/lib/api";
import type { Deal } from "@/lib/types";
import { useRequireAuth } from "@/lib/session";
import { useInboxStream } from "@/lib/realtime";
import { Empty, Page, Spinner, Status } from "@/components/ui";

export default function DealsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [deals, setDeals] = React.useState<Deal[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!user) return;
    try {
      setDeals((await api.deals()).deals);
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => { void load(); }, [load]);

  // A deal moving on the other side updates this list live.
  useInboxStream(React.useCallback((e) => {
    if (e.type.startsWith("deal.") || e.type.startsWith("dispute.")) void load();
  }, [load]));

  if (authLoading || loading) return <Page width="app"><Spinner /></Page>;
  if (!user) return null;

  return (
    <Page width="app">
      <h1 className="display-m">Your deals</h1>

      {deals.length === 0 ? (
        <Empty title="No deals yet"
               action={<Link href="/" className="pl-btn pl-btn-primary">Browse listings</Link>}>
          When you agree a price with someone, the deal shows up here.
        </Empty>
      ) : (
        <div className="stack">
          {deals.map((d) => (
            <Link key={d.id} href={`/deals/${d.id}`} className="pl-sellrow">
              <div className="pl-sellrow-main">
                <div className="pl-sellrow-title">{d.title}</div>
                <div className="pl-sellrow-sub">
                  {d.buyer_id === user.id ? "Buying" : "Selling"} ·
                  {d.mode === "meet" ? " in person" : " shipped"} · {ago(d.created_at)}
                </div>
              </div>
              <div className="pl-sellrow-meta">
                <div className="pl-sellrow-price">{inr(d.amount_paise)}</div>
                <Status statusClass={dealStateClass[d.state]}>{dealStateLabel[d.state]}</Status>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}
