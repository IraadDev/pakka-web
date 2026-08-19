"use client";

/** Public storefront (route /u/[handle]). Trust surface for a seller. */
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { api, ago } from "@/lib/api";
import type { Listing, PublicUser, Review, ReviewSummary } from "@/lib/types";
import { ListingCard } from "@/components/listing-card";
import {
  Avatar, Card, Empty, Page, Spinner, Stars, Stat, Verified,
} from "@/components/ui";

export default function StorefrontPage() {
  const { handle } = useParams<{ handle: string }>();
  const [user, setUser] = React.useState<PublicUser | null>(null);
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [summary, setSummary] = React.useState<ReviewSummary | null>(null);
  const [listings, setListings] = React.useState<Listing[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let live = true;
    api.userReviews(handle)
      .then((r) => {
        if (!live) return;
        setUser(r.user);
        setReviews(r.reviews);
        setSummary(r.summary);
        return api.listings({ seller: r.user.id } as never);
      })
      .then((p) => { if (live && p) setListings(p.items); })
      .catch(() => { if (live) setUser(null); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [handle]);

  if (loading) return <Page width="app"><Spinner /></Page>;
  if (!user) return <Page width="app"><Empty title="No such seller" /></Page>;

  return (
    <Page width="app">
      <Card>
        <div className="dsc-idrow">
          <Avatar name={user.name} />
          <div>
            <h1 className="display-m">
              {user.name ?? handle} {user.kyc_verified && <Verified />}
            </h1>
            <div className="pl-statusline">
              {user.city && `${user.city} · `}member since {ago(user.member_since)}
            </div>
            <Stars value={summary?.average ?? user.rating_avg} count={summary?.count} />
          </div>
        </div>

        <div className="cs-grid-3">
          <Stat label="Deals completed" value={user.deals_done} />
          <Stat label="Disputes lost" value={user.disputes_lost} />
          <Stat label="Rating" value={summary?.average?.toFixed(1) ?? "—"} />
        </div>
      </Card>

      {listings.length > 0 && (
        <section>
          <div className="pl-section-rule"><h2>Listings</h2></div>
          <div className="pl-masonry">
            {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        </section>
      )}

      <section style={{ marginTop: 28 }}>
        <div className="pl-section-rule"><h2>Reviews</h2></div>
        {reviews.length === 0 ? (
          <Empty title="No reviews yet">Reviews appear after a completed deal.</Empty>
        ) : (
          <div className="stack">
            {reviews.map((r) => (
              <Card key={r.id}>
                <Stars value={r.stars} />
                {r.body && <p className="text-2">{r.body}</p>}
                <div className="pl-statusline">
                  {r.rater_name ?? "A buyer"} · {r.deal_title} · {ago(r.created_at)}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </Page>
  );
}
