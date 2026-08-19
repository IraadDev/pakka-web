"use client";

/**
 * Listing card and row. Markup mirrors the design system's .pl-sellcard /
 * .pl-sellrow structure exactly — the classes carry all the styling.
 */
import Link from "next/link";
import * as React from "react";
import { api, inrShort, ago, listingStatusClass, listingStatusLabel } from "@/lib/api";
import type { Category, Listing } from "@/lib/types";
import { Avatar, Verified, cx } from "./ui";
import { Icon } from "./icon";

/**
 * Height for a photoless card's placeholder.
 *
 * `.pl-ph` carries a background but no intrinsic size — the design system's own
 * feed sets the height inline, because a masonry column wants varied heights
 * rather than a grid of identical boxes. Derived from the listing id so it is
 * stable across renders and identical on server and client; a random height
 * would flicker and break hydration.
 */
function placeholderHeight(id: string): number {
  const steps = [150, 180, 210, 240, 270];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return steps[hash % steps.length];
}

export function ListingCard({
  listing, saved, onToggleSave, category,
}: {
  listing: Listing;
  saved?: boolean;
  onToggleSave?: (id: string, next: boolean) => void;
  /** Colour and label come from the server so a new category needs no code. */
  category?: Category;
}) {
  const categoryColour = category?.colour ?? "var(--accent)";
  const categoryLabel = category?.label ?? listing.category_id.replace(/_/g, " ");

  // `override` holds an optimistic value only while a toggle is in flight;
  // otherwise the prop is the truth. Deriving beats mirroring the prop into
  // state and re-syncing it in an effect.
  const [override, setOverride] = React.useState<boolean | null>(null);
  const [busy, setBusy] = React.useState(false);
  const isSaved = override ?? !!saved;
  const cover = listing.photos?.[0]?.url;

  async function toggle(e: React.MouseEvent) {
    // The heart sits inside the card link, so stop it navigating.
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    const next = !isSaved;
    setOverride(next); // optimistic — a heart that lags feels broken
    setBusy(true);
    try {
      if (next) await api.save(listing.id);
      else await api.unsave(listing.id);
      onToggleSave?.(listing.id, next);
    } catch {
      setOverride(null); // failed — fall back to whatever the prop says
    } finally {
      setBusy(false);
    }
  }

  return (
    <Link href={`/i/${listing.id}`} className="pl-sellcard">
      <div className="pl-sellcard-media">
        {cover
          ? <img src={cover} alt="" loading="lazy" />
          : (
            <div className="pl-ph" style={{ height: placeholderHeight(listing.id) }} aria-hidden>
              <Icon name="box" size={30} />
            </div>
          )}
        <span className="cat">
          <span className="sw" style={{ background: categoryColour }} aria-hidden />
          {categoryLabel}
        </span>
        {onToggleSave && (
          <button
            className={cx("pl-sellcard-fav", isSaved && "is-on")}
            onClick={toggle}
            aria-pressed={isSaved}
            aria-label={isSaved ? "Remove from saved" : "Save this listing"}
          >
            <Icon name="heart" size={14} />
          </button>
        )}
      </div>

      <div className="pl-sellcard-body">
        <div className="pl-sellcard-price">{inrShort(listing.price_paise)}</div>
        <h3 className="pl-sellcard-title">{listing.title}</h3>

        <div className="pl-sellcard-foot">
          <Avatar name={listing.seller?.name ?? undefined} />
          <span className="pl-sellcard-seller">
            {listing.seller?.name ?? "Seller"}
            {listing.seller?.kyc_verified && <Verified>✓</Verified>}
          </span>
          <span className="pl-sellcard-time">{ago(listing.published_at)}</span>
        </div>
      </div>
    </Link>
  );
}

/** Dense row for inventory and search lists. */
export function ListingRow({ listing, href }: { listing: Listing; href?: string }) {
  const cover = listing.photos?.[0]?.url;
  return (
    <Link href={href ?? `/i/${listing.id}`} className="pl-sellrow">
      {/* The DS sizes .pl-sellrow-thumb and expects .pl-ph nested inside it. */}
      <div className="pl-sellrow-thumb">
        {cover
          ? <img src={cover} alt="" loading="lazy" />
          : <div className="pl-ph" aria-hidden><Icon name="box" size={20} /></div>}
      </div>

      <div className="pl-sellrow-main">
        <div className="pl-sellrow-title">{listing.title}</div>
        <div className="pl-sellrow-sub">
          {listing.city} · {ago(listing.published_at ?? listing.created_at)}
        </div>
      </div>

      <div className="pl-sellrow-meta">
        <div className="pl-sellrow-price">{inrShort(listing.price_paise)}</div>
        <span className={cx("pl-status", listingStatusClass[listing.status])}>
          {listingStatusLabel[listing.status]}
        </span>
      </div>
    </Link>
  );
}
