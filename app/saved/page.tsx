"use client";

/** Saved listings and saved searches (route /saved). FR-2.9. */
import Link from "next/link";
import * as React from "react";
import { api, inr } from "@/lib/api";
import type { Watch } from "@/lib/types";
import { useRequireAuth } from "@/lib/session";
import { Button, Card, Empty, Note, Page, Spinner } from "@/components/ui";

export default function SavedPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [saved, setSaved] = React.useState<Watch[]>([]);
  const [searches, setSearches] = React.useState<Watch[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!user) return;
    try {
      const [a, b] = await Promise.all([api.saved(), api.searches()]);
      setSaved(a.saved);
      setSearches(b.searches);
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => { void load(); }, [load]);

  if (authLoading || loading) return <Page width="app"><Spinner /></Page>;
  if (!user) return null;

  return (
    <Page width="app">
      <h1 className="display-m">Saved</h1>

      <section>
        <div className="pl-section-rule"><h2>Listings</h2></div>
        {saved.length === 0 ? (
          <Empty title="Nothing saved yet"
                 action={<Link href="/" className="pl-btn pl-btn-primary">Browse</Link>}>
            Tap the heart on a listing to keep it here.
          </Empty>
        ) : (
          <div className="stack">
            {saved.map((w) => (
              <Link key={w.id} href={`/i/${w.listing_id}`} className="pl-sellrow">
                <div className="pl-sellrow-thumb">
                  {w.photo_url
                    ? <img src={w.photo_url} alt="" />
                    : <div className="pl-ph" aria-hidden />}
                </div>
                <div className="pl-sellrow-main">
                  <div className="pl-sellrow-title">{w.title}</div>
                  <div className="pl-sellrow-sub">{w.status}</div>
                </div>
                <div className="pl-sellrow-meta">
                  <div className="pl-sellrow-price">{w.price_paise != null ? inr(w.price_paise) : ""}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <div className="pl-section-rule"><h2>Saved searches</h2></div>
        {searches.length === 0 ? (
          <Note>
            Save a search from the browse page and we will tell you when
            something matching is listed.
          </Note>
        ) : (
          <div className="stack">
            {searches.map((w) => (
              <Card key={w.id}>
                <div className="dsc-row">
                  <div>
                    <strong>{w.saved_query?.label || w.saved_query?.text || "Search"}</strong>
                    <div className="pl-statusline">
                      {[w.saved_query?.category_id, w.saved_query?.city,
                        w.saved_query?.max_paise ? `under ${inr(w.saved_query.max_paise)}` : null]
                        .filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm"
                          onClick={() => api.deleteWatch(w.id).then(load)}>
                    Remove
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </Page>
  );
}
