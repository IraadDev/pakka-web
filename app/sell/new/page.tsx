"use client";

/**
 * Create a listing (FR-2.1–2.4). Draft → photos → asset check → publish.
 *
 * Drafting is open to anyone signed in; publishing requires verified identity,
 * because that is the moment the listing goes in front of buyers.
 */
import { useRouter } from "next/navigation";
import * as React from "react";
import { ApiError, api } from "@/lib/api";
import { CONDITION_LABEL } from "@/lib/types";
import type { Category, Condition, Listing } from "@/lib/types";
import { useRequireAuth, useSession } from "@/lib/session";
import { VerifyPrompt } from "@/components/shell";
import { PhotoCapture, anglesFor, type Captured } from "@/components/photo-capture";
import {
  Banner, Button, Card, Field, Input, Note, Page, Select, Spinner, Textarea,
} from "@/components/ui";

const CONDITIONS = Object.keys(CONDITION_LABEL) as Condition[];

export default function NewListingPage() {
  const router = useRouter();
  const { user, loading } = useRequireAuth();
  const { user: me } = useSession();

  const [categories, setCategories] = React.useState<Category[]>([]);
  const [listing, setListing] = React.useState<Listing | null>(null);
  const [photos, setPhotos] = React.useState<Captured[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [blocked, setBlocked] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    category_id: "", title: "", description: "",
    price: "", condition: "good" as Condition, city: me?.city ?? "",
  });
  const [subject, setSubject] = React.useState(""); // plate or IMEI

  React.useEffect(() => {
    void api.categories().then((r) => {
      setCategories(r.categories);
      setForm((f) => ({ ...f, category_id: f.category_id || r.categories[0]?.id || "" }));
    }).catch(() => {});
  }, []);

  const category = categories.find((c) => c.id === form.category_id);
  const needsCheck = category?.asset_check; // "rc" | "imei" | null

  async function createDraft(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { listing } = await api.createListing({
        category_id: form.category_id,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        // Rupees in the field, paise on the wire.
        price_paise: Math.round(Number(form.price) * 100),
        condition: form.condition,
        city: form.city.trim(),
      });
      setListing(listing);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the listing.");
    } finally {
      setBusy(false);
    }
  }

  async function runCheck() {
    if (!listing || !needsCheck) return;
    setBusy(true);
    setError(null);
    setBlocked(null);
    try {
      const res = await api.runCheck(listing.id, {
        kind: needsCheck as "rc" | "imei",
        subject,
      });
      if (res.blocking) {
        setBlocked(
          needsCheck === "imei"
            ? "This handset is reported stolen or blocked. It cannot be listed."
            : "This vehicle has an active loan or is blacklisted. Clear it before listing.",
        );
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The check failed.");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!listing) return;
    setBusy(true);
    setError(null);
    try {
      // Attach the photos, then publish.
      for (const [i, p] of photos.entries()) {
        await api.addPhoto(listing.id, { url: p.url, angle: p.angle, sort_order: i });
      }
      await api.publishListing(listing.id);
      router.push("/sell");
    } catch (err) {
      if (err instanceof ApiError && err.code === "kyc_required") {
        return router.push(`/kyc?next=/sell/new`);
      }
      setError(err instanceof ApiError ? err.message : "Could not publish.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Page width="form"><Spinner /></Page>;
  if (!user) return null;

  const required = anglesFor(form.category_id).filter((a) => a.required);
  const havePhotos = required.every((a) => photos.some((p) => p.angle === a.id));

  return (
    <Page width="form">
      <h1 className="display-m">List something</h1>
      <VerifyPrompt action="publish a listing" />

      {!listing ? (
        <Card>
          <form onSubmit={createDraft}>
            <Field label="Category" htmlFor="cat">
              <Select id="cat" value={form.category_id}
                      onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select>
            </Field>

            <Field label="Title" hint="What it is, in the words a buyer would search" htmlFor="title">
              <Input id="title" required maxLength={120} value={form.title}
                     onChange={(e) => setForm({ ...form, title: e.target.value })}
                     placeholder="Honda Activa 6G, 2021, single owner" />
            </Field>

            <Field label="Asking price (₹)" htmlFor="price">
              <Input id="price" required type="number" inputMode="numeric" min={1}
                     value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </Field>

            <Field label="Condition" htmlFor="cond">
              <Select id="cond" value={form.condition}
                      onChange={(e) => setForm({ ...form, condition: e.target.value as Condition })}>
                {CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABEL[c]}</option>)}
              </Select>
            </Field>

            <Field label="City" htmlFor="city">
              <Input id="city" required value={form.city}
                     onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Bengaluru" />
            </Field>

            <Field label="Description" hint="Faults included — they will be found at handover anyway" htmlFor="desc">
              <Textarea id="desc" rows={5} maxLength={5000} value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>

            {error && <Note tone="danger">{error}</Note>}
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Continue to photos"}</Button>
          </form>
        </Card>
      ) : (
        <>
          {needsCheck && (
            <Card>
              <h2>{needsCheck === "rc" ? "Vehicle check" : "Handset check"}</h2>
              <p className="text-2">
                {needsCheck === "rc"
                  ? "We check the RC, any active loan and pending challans against VAHAN."
                  : "We check the IMEI against the CEIR stolen-device register."}
              </p>
              <Field
                label={needsCheck === "rc" ? "Registration number" : "IMEI"}
                hint={needsCheck === "imei" ? "Dial *#06# to see it" : "e.g. MH12AB1234"}
                htmlFor="subject"
              >
                <Input id="subject" value={subject}
                       onChange={(e) => setSubject(e.target.value.toUpperCase())} />
              </Field>
              <Button variant="secondary" onClick={runCheck} disabled={busy || !subject}>
                Run check
              </Button>
              {blocked && <Banner tone="danger">{blocked}</Banner>}
            </Card>
          )}

          <Card>
            <h2>Photos</h2>
            <p className="text-2">
              Follow the prompts. A listing with the odometer and the serial plate
              is the one buyers trust.
            </p>
            <PhotoCapture categoryID={form.category_id} value={photos} onChange={setPhotos} />
          </Card>

          {error && <Note tone="danger">{error}</Note>}

          <div className="pl-toolbar">
            <Button onClick={publish} disabled={busy || !havePhotos || !!blocked}>
              {busy ? "Publishing…" : "Publish listing"}
            </Button>
            <Button variant="ghost" onClick={() => router.push("/sell")}>Save as draft</Button>
          </div>

          {!havePhotos && <Note>Add the required photos before publishing.</Note>}
        </>
      )}
    </Page>
  );
}
