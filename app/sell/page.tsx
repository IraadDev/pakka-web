"use client";

/** My listings (route /sell). Inventory view for a seller. */
import Link from "next/link";
import * as React from "react";
import { api } from "@/lib/api";
import type { Listing } from "@/lib/types";
import { useRequireAuth } from "@/lib/session";
import { ListingRow } from "@/components/listing-card";
import { VerifyPrompt } from "@/components/shell";
import { Button, Empty, Page, Spinner } from "@/components/ui";

export default function SellPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [items, setItems] = React.useState<Listing[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;
    api.myListings()
      .then((p) => setItems(p.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || loading) return <Page width="app"><Spinner /></Page>;
  if (!user) return null;

  return (
    <Page width="app">
      <div className="pl-toolbar">
        <h1 className="display-m">Your listings</h1>
        <Link href="/sell/new" className="pl-btn pl-btn-primary">List something</Link>
      </div>

      <VerifyPrompt action="publish a listing" />

      {items.length === 0 ? (
        <Empty title="Nothing listed yet"
               action={<Link href="/sell/new" className="pl-btn pl-btn-primary">List your first item</Link>}>
          Turn something you are not using into cash.
        </Empty>
      ) : (
        <div className="stack">
          {items.map((l) => <ListingRow key={l.id} listing={l} />)}
        </div>
      )}
    </Page>
  );
}
