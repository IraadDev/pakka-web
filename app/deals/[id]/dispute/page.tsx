"use client";

/**
 * Dispute (route /deals/[id]/dispute). FR-3.9.
 *
 * Only the buyer raises; the seller responds. Both sides upload evidence, and
 * the listing photos sit alongside the handover photos so the same item can be
 * compared rather than described.
 */
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { ApiError, api, ago } from "@/lib/api";
import type { DealDetail } from "@/lib/types";
import { useRequireAuth } from "@/lib/session";
import { PhotoCapture, type Captured } from "@/components/photo-capture";
import { PhotoCompare } from "@/components/photo-compare";
import { Banner, Button, Card, Field, Note, Page, Spinner, Textarea } from "@/components/ui";

export default function DisputePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();

  const [d, setD] = React.useState<DealDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [reason, setReason] = React.useState("");
  const [photos, setPhotos] = React.useState<Captured[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user) return;
    api.deal(id).then(setD).catch(() => setD(null)).finally(() => setLoading(false));
  }, [user, id]);

  if (authLoading || loading) return <Page width="read"><Spinner /></Page>;
  if (!user || !d) return null;

  const isBuyer = user.id === d.deal.buyer_id;
  const existing = d.dispute;

  async function raise() {
    setBusy(true);
    setError(null);
    try {
      await api.raiseDispute(id, { reason, evidence: photos.map((p) => p.url) });
      router.push(`/deals/${id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not raise the dispute.");
    } finally {
      setBusy(false);
    }
  }

  async function respond() {
    setBusy(true);
    setError(null);
    try {
      await api.addEvidence(id, photos.map((p) => p.url));
      router.push(`/deals/${id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add your response.");
    } finally {
      setBusy(false);
    }
  }

  const listed = d.handover?.photos?.[0];
  const atHandover = d.handover?.photos?.[1];

  return (
    <Page width="read">
      <h1 className="display-m">{existing ? "Dispute" : "Something is wrong"}</h1>

      {existing ? (
        <>
          <Banner tone={existing.decided_at ? "info" : "warn"}>
            {existing.decided_at
              ? `Decided: ${existing.resolution}. ${existing.decision_note ?? ""}`
              : "Under review. PAKKA decides within 72 hours of it being raised."}
          </Banner>

          <Card>
            <h2>The claim</h2>
            <p className="text-2">{existing.reason}</p>
            <span className="pl-statusline">Raised {ago(existing.created_at)}</span>
          </Card>

          {listed && atHandover && (
            <Card>
              <h2>Compare</h2>
              <PhotoCompare before={listed} after={atHandover} />
            </Card>
          )}

          {!isBuyer && !existing.decided_at && (
            <Card>
              <h2>Your response</h2>
              <p className="text-2">Add photos or documents that support your side.</p>
              <PhotoCapture
                categoryID={d.deal.category_id} kind="evidence"
                value={photos} onChange={setPhotos}
                angles={[{ id: "e1", label: "Evidence", required: true }, { id: "e2", label: "More" }]}
              />
              {error && <Note tone="danger">{error}</Note>}
              <Button onClick={respond} disabled={busy || photos.length === 0}>Submit response</Button>
            </Card>
          )}
        </>
      ) : !isBuyer ? (
        <Note tone="warn">Only the buyer can raise a dispute.</Note>
      ) : (
        <Card>
          <p className="text-2">
            Raising a dispute keeps the money held until PAKKA decides. Say what
            is wrong and show it — the burden is on the person raising it.
          </p>

          <Field label="What is wrong" htmlFor="reason">
            <Textarea id="reason" rows={5} maxLength={2000} value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="The screen has a crack that was not in the listing photos." />
          </Field>

          <PhotoCapture
            categoryID={d.deal.category_id} kind="evidence"
            value={photos} onChange={setPhotos}
            angles={[{ id: "e1", label: "The problem", required: true }, { id: "e2", label: "Wider shot" }]}
          />

          {error && <Note tone="danger">{error}</Note>}

          <Button onClick={raise} disabled={busy || reason.trim().length < 10 || photos.length === 0}>
            {busy ? "Submitting…" : "Raise dispute"}
          </Button>
        </Card>
      )}
    </Page>
  );
}
