"use client";

/**
 * Deal tracker (route /deals/[id]). The screen that walks both parties
 * through the state machine.
 *
 * The rule this page follows: show exactly one next action, addressed to the
 * party whose turn it is. Everything else is context. A deal screen offering
 * six buttons is how someone taps the wrong one with money on the table.
 */
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { ApiError, api, inr, until, dealStateClass, dealStateLabel } from "@/lib/api";
import type { DealDetail } from "@/lib/types";
import { useRequireAuth } from "@/lib/session";
import { useStream } from "@/lib/realtime";
import { DealTimeline } from "@/components/deal-timeline";
import { OTPInput } from "@/components/otp-input";
import { SignaturePad } from "@/components/signature-pad";
import { PhotoCapture, type Captured } from "@/components/photo-capture";
import {
  Banner, Button, Card, Field, Input, Note, Page, Spinner, Stat, Status, Textarea,
} from "@/components/ui";

export default function DealPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();

  const [d, setD] = React.useState<DealDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setD(await api.deal(id));
    } catch {
      setD(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => { if (user) void load(); }, [user, load]);

  // Live: the other party's actions move this screen without a refresh.
  useStream(user ? `/v1/deals/${id}/stream` : null, React.useCallback(() => { void load(); }, [load]));

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
  if (!user) return null;
  if (!d) return <Page width="read"><Note tone="danger">Deal not found.</Note></Page>;

  const { deal, payment, handover, agreement, dispute, buyer_total, seller_amount, holdback } = d;
  const isBuyer = user.id === deal.buyer_id;
  const role = isBuyer ? "buyer" : "seller";

  return (
    <Page width="read">
      <div className="dsc-crumbs"><Link href="/deals">Deals</Link></div>

      <header>
        <Status statusClass={dealStateClass[deal.state]}>{dealStateLabel[deal.state]}</Status>
        <h1 className="display-m">{deal.title}</h1>
        <div className="pl-statusline">
          {deal.mode === "meet" ? "Meeting in person" : "Shipping"} ·
          You are the {role}
        </div>
      </header>

      <div className="cs-grid-3">
        <Stat label={isBuyer ? "You pay" : "Sale price"} value={inr(isBuyer ? buyer_total : deal.amount_paise)} />
        <Stat label={isBuyer ? "Item price" : "You receive"} value={inr(isBuyer ? deal.amount_paise : seller_amount)} />
        <Stat label="PAKKA fee" value={inr(deal.fee_paise)} sub={`${deal.fee_payer} pays`} />
      </div>

      {holdback > 0 && (
        <div className="pl-holdback">
          <span className="amt">{inr(holdback)}</span>
          <span>
            held back until the RC transfers to the buyer. Released automatically
            after 45 days if the transfer has not completed.
          </span>
        </div>
      )}

      {error && <Note tone="danger">{error}</Note>}

      <NextAction
        d={d} isBuyer={isBuyer} busy={busy} act={act}
        onGoto={(p) => router.push(p)}
      />

      {dispute && !dispute.decided_at && (
        <Banner tone="warn">
          <strong>A dispute is open.</strong> PAKKA decides within 72 hours.
          The money stays held until then.
        </Banner>
      )}

      <Card>
        <h2>Progress</h2>
        <DealTimeline entries={d.timeline} />
      </Card>

      {agreement && (
        <Card>
          <h2>Agreed terms</h2>
          <dl className="pl-table">
            <Row k="Item" v={agreement.terms.item_description} />
            {agreement.terms.condition && <Row k="Condition" v={agreement.terms.condition} />}
            {agreement.terms.serial_or_plate && <Row k="Serial / plate" v={agreement.terms.serial_or_plate} />}
            {agreement.terms.handover_place && <Row k="Handover" v={agreement.terms.handover_place} />}
            {agreement.terms.known_faults && <Row k="Known faults" v={agreement.terms.known_faults} />}
          </dl>
          <div className="pl-statusline">
            Buyer {agreement.buyer_signed_at ? "signed" : "not signed"} ·
            Seller {agreement.seller_signed_at ? "signed" : "not signed"}
          </div>
        </Card>
      )}

      {payment && (
        <Card>
          <h2>Payment</h2>
          <div className="pl-statusline">
            {payment.status === "held" && "Held by the payment provider — not with PAKKA."}
            {payment.status === "released" && "Released to the seller."}
            {payment.status === "refunded" && "Refunded to the buyer."}
            {payment.on_hold_until && ` Auto-releases ${until(payment.on_hold_until)}.`}
          </div>
        </Card>
      )}

      {handover?.entered_at && (
        <Card>
          <h2>Handover record</h2>
          {handover.serial_value && <Row k="Serial recorded" v={handover.serial_value} />}
          {handover.photos?.length > 0 && (
            <div className="pl-camera-angles">
              {handover.photos.map((p) => <img key={p} src={p} alt="" className="pl-camera-slot" />)}
            </div>
          )}
        </Card>
      )}
    </Page>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="dsc-row">
      <span className="label">{k}</span>
      <span>{v}</span>
    </div>
  );
}

/**
 * The single next step. Which party is asked depends on the state — the
 * asymmetry at handover is the whole fraud control, so it is explicit here.
 */
function NextAction({
  d, isBuyer, busy, act, onGoto,
}: {
  d: DealDetail;
  isBuyer: boolean;
  busy: boolean;
  act: <T>(fn: () => Promise<T>) => Promise<void>;
  onGoto: (path: string) => void;
}) {
  const { deal, agreement, handover } = d;
  const signed = isBuyer ? agreement?.buyer_signed_at : agreement?.seller_signed_at;

  switch (deal.state) {
    case "draft":
      return (
        <Card>
          <h2>Invite the other person</h2>
          <p className="text-2">They confirm their identity before anything is paid.</p>
          <Button onClick={() => act(() => api.invite(deal.id))} disabled={busy}>Send invitation</Button>
        </Card>
      );

    case "invited":
      return (
        <Card>
          <h2>Waiting for both identities</h2>
          <p className="text-2">
            Both of you must be verified before terms can be set. You will be
            notified when that happens.
          </p>
        </Card>
      );

    case "verified":
      return (
        <Card>
          <h2>Write the terms</h2>
          <p className="text-2">
            What is being sold, in what condition, and how it changes hands.
            Both of you sign it.
          </p>
          <Button onClick={() => onGoto(`/deals/${deal.id}/terms`)}>Set terms</Button>
        </Card>
      );

    case "documented":
      return signed ? (
        <Card>
          <h2>Waiting for the other signature</h2>
          <p className="text-2">You have signed. The deal moves on once they do too.</p>
        </Card>
      ) : (
        <SignBlock dealID={deal.id} busy={busy} act={act} />
      );

    case "signed":
      return isBuyer ? (
        <Card>
          <h2>Pay to start</h2>
          <p className="text-2">
            Your money is held by the payment provider. The seller is paid only
            after you have the item.
          </p>
          <Button onClick={() => onGoto(`/deals/${deal.id}/pay`)}>Pay {inr(d.buyer_total)}</Button>
        </Card>
      ) : (
        <Card>
          <h2>Waiting for payment</h2>
          <p className="text-2">Do not hand anything over until this page says the money is held.</p>
        </Card>
      );

    case "funded":
      return deal.mode === "meet"
        ? <MeetHandover d={d} isBuyer={isBuyer} busy={busy} act={act} />
        : isBuyer
          ? (
            <Card>
              <h2>Waiting for dispatch</h2>
              <p className="text-2">The seller will add tracking once it ships.</p>
            </Card>
          )
          : <ShipBlock dealID={deal.id} busy={busy} act={act} />;

    case "handed_over":
    case "inspecting":
      return isBuyer ? (
        <Card>
          <h2>Confirm you have it</h2>
          <p className="text-2">
            Check the item first. Confirming releases the money and cannot be undone.
            {d.payment?.on_hold_until && ` Auto-releases ${until(d.payment.on_hold_until)}.`}
          </p>
          <Button onClick={() => act(() => api.confirmReceipt(deal.id))} disabled={busy}>
            Confirm and release {inr(d.seller_amount)}
          </Button>
          <Button variant="ghost" onClick={() => onGoto(`/deals/${deal.id}/dispute`)}>
            Something is wrong
          </Button>
        </Card>
      ) : (
        <Card>
          <h2>Waiting for the buyer to confirm</h2>
          <p className="text-2">
            {d.payment?.on_hold_until
              ? `Releases automatically ${until(d.payment.on_hold_until)} if they do not respond.`
              : "Releases automatically when the inspection window closes."}
          </p>
        </Card>
      );

    case "released":
      return (
        <Card>
          <h2>Done</h2>
          <p className="text-2">
            {isBuyer ? "The seller has been paid." : `${inr(d.seller_amount)} is on its way to your account.`}
          </p>
          <Button variant="secondary" onClick={() => onGoto(`/deals/${deal.id}/review`)}>
            Rate the {isBuyer ? "seller" : "buyer"}
          </Button>
          {deal.holdback_pct > 0 && (
            <Button variant="ghost" onClick={() => onGoto(`/deals/${deal.id}/rc`)}>
              Track RC transfer
            </Button>
          )}
        </Card>
      );

    case "disputed":
      return (
        <Card>
          <h2>Under review</h2>
          <p className="text-2">
            PAKKA is deciding. Both of you can still add evidence.
          </p>
          <Button variant="secondary" onClick={() => onGoto(`/deals/${deal.id}/dispute`)}>
            {isBuyer ? "View your claim" : "Respond"}
          </Button>
        </Card>
      );

    case "refunded":
      return <Card><h2>Refunded</h2><p className="text-2">The money went back to the buyer.</p></Card>;

    case "cancelled":
      return <Card><h2>Cancelled</h2><p className="text-2">No money moved.</p></Card>;

    default:
      return null;
  }
}

function SignBlock({
  dealID, busy, act,
}: { dealID: string; busy: boolean; act: <T>(fn: () => Promise<T>) => Promise<void> }) {
  const [sig, setSig] = React.useState<string | null>(null);
  return (
    <Card>
      <h2>Sign the agreement</h2>
      <SignaturePad onChange={setSig} disabled={busy} />
      <Button
        onClick={() => act(() => api.sign(dealID, sig ?? undefined))}
        disabled={busy || !sig}
        style={{ marginTop: 12 }}
      >
        Sign
      </Button>
    </Card>
  );
}

function ShipBlock({
  dealID, busy, act,
}: { dealID: string; busy: boolean; act: <T>(fn: () => Promise<T>) => Promise<void> }) {
  const [courier, setCourier] = React.useState("");
  const [tracking, setTracking] = React.useState("");
  return (
    <Card>
      <h2>Ship the item</h2>
      <p className="text-2">Add the tracking number so the buyer can follow it.</p>
      <Field label="Courier" htmlFor="courier">
        <Input id="courier" value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Delhivery" />
      </Field>
      <Field label="Tracking number" htmlFor="tracking">
        <Input id="tracking" value={tracking} onChange={(e) => setTracking(e.target.value)} />
      </Field>
      <Button
        onClick={() => act(() => api.ship(dealID, { courier, tracking }))}
        disabled={busy || !courier || !tracking}
      >
        Mark as shipped
      </Button>
    </Card>
  );
}

/**
 * Meet-mode handover (FR-3.5).
 *
 * The buyer holds the code; the seller types it. That asymmetry is the whole
 * control: the seller can only complete the handover with the buyer standing
 * there, choosing to hand it over. Both sides of that are rendered here.
 */
function MeetHandover({
  d, isBuyer, busy, act,
}: {
  d: DealDetail;
  isBuyer: boolean;
  busy: boolean;
  act: <T>(fn: () => Promise<T>) => Promise<void>;
}) {
  const [code, setCode] = React.useState("");
  const [serial, setSerial] = React.useState(d.agreement?.terms.serial_or_plate ?? "");
  const [photos, setPhotos] = React.useState<Captured[]>([]);
  const started = !!d.handover;

  if (isBuyer) {
    return (
      <Card>
        <h2>Show your code to the seller</h2>
        <p className="text-2">
          When you have the item in your hands and you are happy with it, read
          this code to the seller. They type it in. That releases the money.
        </p>
        {started
          ? <p className="text-2">Check your SMS for the six-digit code.</p>
          : <p className="text-2">The seller will request the code when you meet.</p>}
        <Note tone="warn">
          Do not share this code before you have inspected the item. It cannot be undone.
        </Note>
      </Card>
    );
  }

  return (
    <Card>
      <h2>Complete the handover</h2>
      {!started ? (
        <>
          <p className="text-2">
            Send the buyer their code. Ask them for it once they have checked the item.
          </p>
          <Button onClick={() => act(() => api.startHandover(d.deal.id))} disabled={busy}>
            Send the buyer their code
          </Button>
        </>
      ) : (
        <>
          <p className="text-2">Type the six digits the buyer shows you.</p>
          <OTPInput value={code} onChange={setCode} disabled={busy} />

          <Field label="Serial / chassis number" hint="Recorded as evidence" htmlFor="serial">
            <Input id="serial" value={serial} onChange={(e) => setSerial(e.target.value)} />
          </Field>

          <PhotoCapture
            categoryID={d.deal.category_id}
            kind="handover"
            value={photos}
            onChange={setPhotos}
            angles={[
              { id: "item", label: "Item at handover", required: true },
              { id: "serial", label: "Serial / plate" },
            ]}
          />

          <Button
            style={{ marginTop: 12 }}
            disabled={busy || code.length !== 6}
            onClick={() => act(() => api.completeHandover(d.deal.id, {
              code, serial, photos: photos.map((p) => p.url),
            }))}
          >
            Complete handover
          </Button>
        </>
      )}
    </Card>
  );
}
