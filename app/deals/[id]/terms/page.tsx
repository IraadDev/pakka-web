"use client";

/**
 * Terms + eSign (route /deals/[id]/terms). FR-3.3.
 *
 * Terms are written once and signed by both. Changing them after a signature
 * clears both signatures server-side — a document signed by one party must not
 * change underneath them.
 */
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { ApiError, api } from "@/lib/api";
import type { DealDetail, Terms } from "@/lib/types";
import { useRequireAuth } from "@/lib/session";
import { Button, Card, Field, Input, Note, Page, Spinner, Textarea } from "@/components/ui";

export default function TermsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();

  const [d, setD] = React.useState<DealDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [t, setT] = React.useState<Terms>({ item_description: "" });

  React.useEffect(() => {
    if (!user) return;
    api.deal(id)
      .then((d) => {
        setD(d);
        if (d.agreement?.terms) setT(d.agreement.terms);
        else if (d.deal.title) setT((s) => ({ ...s, item_description: d.deal.title }));
      })
      .catch(() => setD(null))
      .finally(() => setLoading(false));
  }, [user, id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.putTerms(id, t);
      router.push(`/deals/${id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the terms.");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || loading) return <Page width="form"><Spinner /></Page>;
  if (!user || !d) return null;

  const signed = d.agreement?.buyer_signed_at || d.agreement?.seller_signed_at;

  return (
    <Page width="form">
      <h1 className="display-m">Terms of this deal</h1>
      <p className="text-2">
        Write what is actually being sold. This is the document a dispute is
        decided against, so vagueness here costs someone money later.
      </p>

      {signed && (
        <Note tone="warn">
          Changing the terms clears both signatures. You will each need to sign again.
        </Note>
      )}

      <Card>
        <form onSubmit={save}>
          <Field label="What is being sold" htmlFor="item">
            <Textarea id="item" required rows={3} value={t.item_description}
                      onChange={(e) => setT({ ...t, item_description: e.target.value })}
                      placeholder="Honda Activa 6G, 2021, single owner, 18,400 km" />
          </Field>

          <Field label="Condition as agreed" htmlFor="cond">
            <Input id="cond" value={t.condition ?? ""}
                   onChange={(e) => setT({ ...t, condition: e.target.value })}
                   placeholder="Good — minor scratches on the left panel" />
          </Field>

          <Field label="Serial / chassis / registration" hint="Checked again at handover" htmlFor="serial">
            <Input id="serial" value={t.serial_or_plate ?? ""}
                   onChange={(e) => setT({ ...t, serial_or_plate: e.target.value.toUpperCase() })} />
          </Field>

          <Field label="Known faults" hint="Declared now, or argued about later" htmlFor="faults">
            <Textarea id="faults" rows={2} value={t.known_faults ?? ""}
                      onChange={(e) => setT({ ...t, known_faults: e.target.value })} />
          </Field>

          <Field label="Where the handover happens" htmlFor="place">
            <Input id="place" value={t.handover_place ?? ""}
                   onChange={(e) => setT({ ...t, handover_place: e.target.value })}
                   placeholder="Indiranagar metro station, Bengaluru" />
          </Field>

          {error && <Note tone="danger">{error}</Note>}

          <Button type="submit" disabled={busy || !t.item_description.trim()}>
            {busy ? "Saving…" : "Save terms"}
          </Button>
        </form>
      </Card>
    </Page>
  );
}
