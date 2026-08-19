"use client";

/**
 * Product detail (route /i/[id]).
 *
 * Built to the design system's own Product Detail layout: a gallery with a
 * thumbnail strip and a sticky 300px buy rail, then stacked sections for
 * specs, verification and provenance. The pd-* classes come from that page.
 *
 * The screen does one job: let a buyer decide whether to trust the item and
 * the person. A blocking check is a banner, not a footnote.
 */
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { ApiError, api, ago, inr, listingStatusClass, listingStatusLabel } from "@/lib/api";
import { CONDITION_LABEL } from "@/lib/types";
import type { AssetCheck, Category, Condition, IMEIResult, Listing, RCResult } from "@/lib/types";
import { useSession } from "@/lib/session";
import { ListingCard } from "@/components/listing-card";
import { Icon } from "@/components/icon";
import { Avatar, Banner, Button, Empty, Note, Page, Spinner, Stars, Status, Verified, cx } from "@/components/ui";

export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSession();

  const [data, setData] = React.useState<{
    listing: Listing; checks: AssetCheck[]; similar: Listing[];
  } | null>(null);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [shot, setShot] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let live = true;
    api.listing(id)
      .then((d) => { if (live) setData(d); })
      .catch(() => { if (live) setData(null); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [id]);

  React.useEffect(() => {
    void api.categories().then((r) => setCategories(r.categories)).catch(() => {});
  }, []);

  async function contact() {
    if (!user) return router.push(`/login?next=/i/${id}`);
    setBusy(true);
    setError(null);
    try {
      const { thread } = await api.openThread(id, "Hi — is this still available?");
      router.push(`/messages/${thread.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start the conversation.");
      setBusy(false);
    }
  }

  if (loading) return <Page width="app"><Spinner /></Page>;
  if (!data) {
    return (
      <Page width="app">
        <Empty title="Listing not found" action={<Link className="pl-btn pl-btn-primary" href="/">Back to browse</Link>}>
          It may have been sold or taken down.
        </Empty>
      </Page>
    );
  }

  const { listing, checks, similar } = data;
  const photos = listing.photos ?? [];
  const blocking = checks.find((c) => c.blocking);
  const isMine = user?.id === listing.seller_id;
  const available = listing.status === "live";
  const category = categories.find((c) => c.id === listing.category_id);

  return (
    <Page width="app" className="pd-wrap">
      {blocking && (
        <Banner tone="danger">
          <span className="ic"><Icon name="info" size={16} /></span>
          <span>
            <b>This listing failed a verification check.</b>{" "}
            {describeBlocking(blocking)} It cannot be bought through PAKKA.
          </span>
        </Banner>
      )}

      <div className="pd-top">
        {/* ── gallery ───────────────────────────────────────────────────── */}
        <div>
          <div className="pd-media">
            <div className="pd-badges">
              <Status statusClass={listingStatusClass[listing.status]}>
                {listingStatusLabel[listing.status]}
              </Status>
              {/* .cat is scoped to .pl-sellcard-media in the DS; outside a
                  sell card the badge component is .pl-pill. */}
              {category && (
                <span className="pl-pill" style={{ ["--cat" as string]: category.colour }}>
                  <span className="sw" style={{ background: category.colour }} aria-hidden />
                  {category.label}
                </span>
              )}
            </div>

            <div className="pd-stage">
              {photos.length > 0
                ? <img src={photos[shot]?.url} alt={photos[shot]?.angle ?? listing.title} />
                : <div className="pl-ph" aria-hidden><Icon name="box" size={40} /></div>}
            </div>

            {photos.length > 1 && (
              <div className="pd-thumbs">
                {photos.map((p, i) => (
                  <button
                    key={p.id}
                    className={cx("pd-thumb", i === shot && "is-active")}
                    onClick={() => setShot(i)}
                    aria-label={p.angle ?? `Photo ${i + 1}`}
                    aria-current={i === shot}
                  >
                    {p.url ? <img src={p.url} alt="" /> : <Icon name="box" size={18} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <section className="pd-sec">
            <div className="pd-sec-cap">Description</div>
            <p className="pd-desc">
              {listing.description || "The seller has not written a description."}
            </p>
          </section>

          <section className="pd-sec">
            <div className="pd-sec-cap">Specifications</div>
            <dl className="pd-spec">
              <dt>Condition</dt>
              <dd>{CONDITION_LABEL[listing.condition as Condition] ?? listing.condition}</dd>
              <dt>Category</dt>
              <dd>{category?.label ?? listing.category_id}</dd>
              <dt>Location</dt>
              <dd>{listing.city}</dd>
              <dt>Listed</dt>
              <dd>{ago(listing.published_at ?? listing.created_at)}</dd>
            </dl>
          </section>

          {checks.length > 0 && (
            <section className="pd-sec">
              <div className="pd-sec-cap">Verification · government records</div>
              <div className="pd-prov">
                {checks.map((c) => (
                  <div key={c.id} className={cx("pd-prov-row", !c.blocking && "is-now")}>
                    <span className="pd-prov-dot" aria-hidden />
                    <div>
                      <div className="pd-prov-what">{describeCheck(c)}</div>
                      <div className="pd-prov-who">{c.kind.toUpperCase()} · {c.subject}</div>
                    </div>
                    <span className="pd-prov-when">
                      {c.blocking
                        ? <span className="pl-status pl-status-stock_out">Blocked</span>
                        : <span className="pl-status pl-status-available">Clear</span>}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── sticky buy rail ───────────────────────────────────────────── */}
        <aside className="pd-buy">
          <h1 className="pd-title">{listing.title}</h1>

          <div className="pd-price">
            <span className="now">{inr(listing.price_paise)}</span>
          </div>

          <div className="dsc-idrow">
            <Avatar name={listing.seller?.name} />
            <div>
              <div className="nm">
                {listing.seller?.handle
                  ? <Link href={`/u/${listing.seller.handle}`}>{listing.seller?.name ?? "Seller"}</Link>
                  : (listing.seller?.name ?? "Seller")}
                {listing.seller?.kyc_verified && <Verified />}
              </div>
              <div className="sub">
                {listing.seller?.deals_done ?? 0} deal
                {listing.seller?.deals_done === 1 ? "" : "s"} completed
              </div>
              <Stars value={listing.seller?.rating_avg ?? null} />
            </div>
          </div>

          {error && <Note tone="danger">{error}</Note>}

          <div className="pd-buy-actions">
            {isMine ? (
              <Link href="/sell" className="pl-btn pl-btn-secondary pl-btn-block">
                Manage this listing
              </Link>
            ) : available && !blocking ? (
              <Button block onClick={contact} disabled={busy}>
                {busy ? "Starting…" : "Message the seller"}
              </Button>
            ) : (
              <Button block disabled variant="secondary">
                {blocking ? "Unavailable" : listingStatusLabel[listing.status]}
              </Button>
            )}
          </div>

          {/* The reasons to trust this, stated where the decision is made. */}
          <div className="pd-trust">
            <div className="pd-trust-row">
              <Icon name="check" size={14} />
              Identity verified against government records
            </div>
            <div className="pd-trust-row">
              <Icon name="wallet" size={14} />
              Your money is held until you have the item
            </div>
            <div className="pd-trust-row">
              <Icon name="eye" size={14} />
              Condition documented before you commit
            </div>
            {checks.length > 0 && (
              <div className="pd-trust-row">
                <Icon name="info" size={14} />
                {checks.length} record{checks.length === 1 ? "" : "s"} checked
              </div>
            )}
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="pd-sec">
          <div className="pd-sec-cap">Similar listings</div>
          <div className="pd-rel">
            {similar.slice(0, 3).map((s) => (
              <ListingCard
                key={s.id}
                listing={s}
                category={categories.find((c) => c.id === s.category_id)}
              />
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}

function describeCheck(c: AssetCheck): string {
  const r = c.result as Partial<RCResult & IMEIResult> | null;
  if (!r) return c.subject;

  if (c.kind === "rc") {
    const bits = [r.make_model, r.registered_at && `registered ${r.registered_at}`].filter(Boolean);
    if (r.hypothecated) bits.push(`loan with ${r.financier ?? "a financier"}`);
    if (r.blacklisted) bits.push("blacklisted");
    return bits.join(" · ") || c.subject;
  }
  if (c.kind === "imei") {
    return [r.brand, r.model, r.status && `status: ${r.status}`].filter(Boolean).join(" · ");
  }
  return c.subject;
}

function describeBlocking(c: AssetCheck): string {
  const r = c.result as Partial<RCResult & IMEIResult> | null;
  if (c.kind === "imei" && r?.status === "stolen") return "This handset is reported stolen.";
  if (c.kind === "rc" && r?.hypothecated) {
    return `The vehicle still carries a loan with ${r.financier ?? "a financier"}, so the seller cannot legally transfer it.`;
  }
  if (c.kind === "rc" && r?.blacklisted) return "This vehicle is blacklisted.";
  return "";
}
