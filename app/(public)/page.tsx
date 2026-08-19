"use client";

/**
 * Home / browse feed. The marketplace's front door (route /).
 *
 * Browsing never requires an account — that is a stated non-goal in the spec,
 * and a marketplace that demands a login before showing anything reads as
 * empty to a first-time visitor.
 */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { api, inr } from "@/lib/api";
import type { Category, Listing, Stats } from "@/lib/types";
import { ListingCard } from "@/components/listing-card";
import { Button, Empty, Input, Page, SkeletonCard, Spinner, Stat } from "@/components/ui";
import { CategoryStrip } from "@/components/category-strip";
import { FilterBar } from "@/components/filter-bar";

function HomePageInner() {
  const params = useSearchParams();
  const router = useRouter();

  const [listings, setListings] = React.useState<Listing[]>([]);
  const [total, setTotal] = React.useState(0);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState(params.get("q") ?? "");

  const filter = React.useMemo(() => ({
    q: params.get("q") ?? undefined,
    category: params.get("category") ?? undefined,
    city: params.get("city") ?? undefined,
    condition: params.get("condition") ?? undefined,
    min_paise: params.get("min_paise") ? Number(params.get("min_paise")) : undefined,
    max_paise: params.get("max_paise") ? Number(params.get("max_paise")) : undefined,
    verified: params.get("verified") === "true" || undefined,
    sort: (params.get("sort") as "recent" | "price_asc" | "price_desc" | "relevant") ?? undefined,
  }), [params]);

  React.useEffect(() => {
    let live = true;
    setLoading(true);
    api.listings(filter)
      .then((page) => { if (live) { setListings(page.items); setTotal(page.total); } })
      .catch(() => { if (live) setListings([]); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [filter]);

  React.useEffect(() => {
    void api.categories().then((r) => setCategories(r.categories)).catch(() => {});
    void api.stats().then(setStats).catch(() => {});
  }, []);

  function search(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (q) next.set("q", q); else next.delete("q");
    router.push(`/?${next.toString()}`);
  }

  const hasFilters = [...params.keys()].length > 0;

  return (
    <Page width="wide">
      {!hasFilters && (
        <section>
          <h1 className="display-l">Buy and sell used, without the risk.</h1>
          <p className="text-2">
            Verified identities on both sides. Condition documented before you commit.
            Your money is held until you have the item in your hands.
          </p>

          {stats && (
            <div className="cs-grid-4">
              <Stat label="Live listings" value={stats.live_listings.toLocaleString("en-IN")} />
              <Stat label="Deals completed" value={stats.deals_completed.toLocaleString("en-IN")} />
              <Stat label="Value protected" value={inr(stats.value_protected)} />
              <Stat label="Verified people" value={stats.verified_users.toLocaleString("en-IN")} />
            </div>
          )}
        </section>
      )}

      <form className="pl-search" onSubmit={search} role="search">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search bikes, phones, laptops…"
          aria-label="Search listings"
        />
        <Button type="submit">Search</Button>
      </form>

      <CategoryStrip categories={categories} />
      <FilterBar />

      <div className="pl-statusline">
        {loading ? "Loading…" : `${total.toLocaleString("en-IN")} listing${total === 1 ? "" : "s"}`}
      </div>

      {loading ? (
        <div className="pl-masonry">
          {Array.from({ length: 8 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : listings.length === 0 ? (
        <Empty
          title="Nothing here yet"
          action={<Link href="/sell/new" className="pl-btn pl-btn-primary">List something</Link>}
        >
          {hasFilters
            ? "No listings match those filters. Try widening them."
            : "Be the first to list in this category."}
        </Empty>
      ) : (
        <div className="pl-masonry">
          {listings.map((l) => <ListingCard key={l.id} listing={l} onToggleSave={() => {}} />)}
        </div>
      )}
    </Page>
  );
}

/**
 * useSearchParams() forces client-side rendering, so Next needs an explicit
 * boundary to prerender the shell around it.
 */
export default function HomePage() {
  return (
    <React.Suspense fallback={<Page width="app"><Spinner /></Page>}>
      <HomePageInner />
    </React.Suspense>
  );
}
