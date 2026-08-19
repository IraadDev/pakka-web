"use client";

/**
 * Product detail (route /i/[id]).
 *
 * This screen does one job: let a buyer decide whether to trust the item and
 * the person. Verification state, asset checks and seller history are shown
 * above the fold — a blocking check is a banner, not a footnote.
 */
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { ApiError, api, ago, inr, listingStatusClass, listingStatusLabel } from "@/lib/api";
import { CONDITION_LABEL } from "@/lib/types";
import type { AssetCheck, Condition, IMEIResult, Listing, RCResult } from "@/lib/types";
import { useSession } from "@/lib/session";
import { ListingCard } from "@/components/listing-card";
import {
  Avatar, Banner, Button, Card, Empty, Note, Page, Spinner, Stars, Status, Verified,
} from "@/components/ui";

export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSession();

  const [data, setData] = React.useState<{
    listing: Listing; checks: AssetCheck[]; similar: Listing[];
  } | null>(null);
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

  return (
    <Page width="app">
      {blocking && (
        <Banner tone="danger">
          <strong>This listing failed a verification check.</strong>{" "}
          {describeBlocking(blocking)} It cannot be bought through PAKKA.
        </Banner>
      )}

      <div className="cs-grid-2">
        {/* ── gallery ─────────────────────────────────────────────────── */}
        <div>
          <div className="pl-card-media">
            {photos.length > 0
              ? <img src={photos[shot]?.url} alt={photos[shot]?.angle ?? listing.title} />
              : <div className="pl-ph" aria-hidden />}
          </div>

          {photos.length > 1 && (
            <div className="mc-chiprow" style={{ marginTop: 8 }}>
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  className={`pl-chip ${i === shot ? "is-active" : ""}`}
                  onClick={() => setShot(i)}
                  aria-label={p.angle ?? `Photo ${i + 1}`}
                  aria-current={i === shot}
                >
                  {p.angle ?? i + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── facts and action ────────────────────────────────────────── */}
        <div className="stack">
          <div>
            <Status statusClass={listingStatusClass[listing.status]}>
              {listingStatusLabel[listing.status]}
            </Status>
            <h1 className="display-m">{listing.title}</h1>
            <div className="pl-card-price">{inr(listing.price_paise)}</div>
            <div className="pl-statusline">
              {CONDITION_LABEL[listing.condition as Condition] ?? listing.condition}
              {" · "}{listing.city}
              {" · listed "}{ago(listing.published_at ?? listing.created_at)}
            </div>
          </div>

          {listing.description && <p className="text-2">{listing.description}</p>}

          <ChecksPanel checks={checks} />

          {/* seller trust */}
          <Card>
            <div className="dsc-idrow">
              <Avatar name={listing.seller?.name} />
              <div>
                <div>
                  {listing.seller?.handle
                    ? <Link href={`/u/${listing.seller.handle}`}>{listing.seller?.name ?? "Seller"}</Link>
                    : (listing.seller?.name ?? "Seller")}
                  {listing.seller?.kyc_verified && <Verified />}
                </div>
                <div className="pl-statusline">
                  {listing.seller?.deals_done ?? 0} deal
                  {listing.seller?.deals_done === 1 ? "" : "s"} completed
                </div>
                <Stars value={listing.seller?.rating_avg ?? null} />
              </div>
            </div>
          </Card>

          {error && <Note tone="danger">{error}</Note>}

          {isMine ? (
            <Link href="/sell" className="pl-btn pl-btn-secondary pl-btn-block">
              This is your listing — manage it
            </Link>
          ) : available && !blocking ? (
            <>
              <Button block onClick={contact} disabled={busy}>
                {busy ? "Starting…" : "Message the seller"}
              </Button>
              <Note>
                Agree a price in chat. When you both accept, PAKKA holds the money
                until you have the item.
              </Note>
            </>
          ) : (
            <Button block disabled variant="secondary">
              {blocking ? "Unavailable" : listingStatusLabel[listing.status]}
            </Button>
          )}
        </div>
      </div>

      {similar.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <div className="pl-section-rule"><h2>Similar listings</h2></div>
          <div className="pl-masonry">
            {similar.map((s) => <ListingCard key={s.id} listing={s} />)}
          </div>
        </section>
      )}
    </Page>
  );
}

/** Renders the government checks so a buyer can read them without expanding. */
function ChecksPanel({ checks }: { checks: AssetCheck[] }) {
  if (!checks.length) return null;

  return (
    <Card>
      <h3>Verification</h3>
      <table className="pl-table">
        <tbody>
          {checks.map((c) => (
            <tr key={c.id}>
              <th scope="row">{c.kind.toUpperCase()}</th>
              <td>{describeCheck(c)}</td>
              <td className="pl-td-num">
                {c.blocking
                  ? <span className="pl-status pl-status-stock_out">Blocked</span>
                  : <span className="pl-status pl-status-available">Clear</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Note>Checked against government records at the time shown.</Note>
    </Card>
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
