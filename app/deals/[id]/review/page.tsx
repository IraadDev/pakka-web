"use client";

/** Post-deal rating (route /deals/[id]/review). FR-3.11. */
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { ApiError, api } from "@/lib/api";
import { useRequireAuth } from "@/lib/session";
import { Button, Card, Field, Note, Page, Textarea, cx } from "@/components/ui";

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useRequireAuth();

  const [stars, setStars] = React.useState(0);
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (loading || !user) return null;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.review(id, { stars, body: body.trim() || undefined });
      router.push(`/deals/${id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your rating.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page width="narrow">
      <Card>
        <h1 className="display-m">How did it go?</h1>
        <p className="text-2">
          Ratings are only possible on completed deals between the two people who
          did them — which is what makes them worth reading.
        </p>

        <div className="dsc-stars" style={{ fontSize: 30 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setStars(n)}
              className={cx("pl-iconbtn", n <= stars && "is-on")}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              aria-pressed={n === stars}
            >
              {n <= stars ? "★" : "☆"}
            </button>
          ))}
        </div>

        <Field label="Anything to add" htmlFor="body">
          <Textarea id="body" rows={4} maxLength={2000} value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Turned up on time, item was as described." />
        </Field>

        {error && <Note tone="danger">{error}</Note>}

        <Button block onClick={submit} disabled={busy || stars < 1}>
          {busy ? "Saving…" : "Submit rating"}
        </Button>
      </Card>
    </Page>
  );
}
