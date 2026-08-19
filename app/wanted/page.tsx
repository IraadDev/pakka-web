"use client";

/**
 * Wanted board (route /wanted). FR-2.8.
 *
 * Inverts the marketplace: instead of a buyer hunting through stale listings,
 * they state what they want and sellers come to them. This is what makes the
 * thin categories work at all.
 */
import * as React from "react";
import { ApiError, api, ago, inr } from "@/lib/api";
import type { Category, Want } from "@/lib/types";
import { useSession } from "@/lib/session";
import { VerifyPrompt } from "@/components/shell";
import {
  Avatar, Button, Card, Empty, Field, Input, Note, Page, Select, Spinner, Textarea, Verified,
} from "@/components/ui";

export default function WantedPage() {
  const { user } = useSession();
  const [wants, setWants] = React.useState<Want[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ category_id: "", description: "", budget: "", city: "" });

  const load = React.useCallback(async () => {
    try {
      setWants((await api.wants()).wants);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    void api.categories().then((r) => {
      setCategories(r.categories);
      setForm((f) => ({ ...f, category_id: f.category_id || r.categories[0]?.id || "" }));
    }).catch(() => {});
  }, [load]);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createWant({
        category_id: form.category_id,
        description: form.description.trim(),
        budget_paise: form.budget ? Math.round(Number(form.budget) * 100) : undefined,
        city: form.city.trim() || undefined,
      });
      setOpen(false);
      setForm({ ...form, description: "", budget: "" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not post that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page width="app">
      <div className="pl-toolbar">
        <h1 className="display-m">Wanted</h1>
        {user && <Button onClick={() => setOpen((o) => !o)}>Post what you want</Button>}
      </div>

      <VerifyPrompt action="post a wanted ad" />

      {open && (
        <Card>
          <form onSubmit={post}>
            <Field label="Category" htmlFor="wcat">
              <Select id="wcat" value={form.category_id}
                      onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select>
            </Field>
            <Field label="What are you looking for" htmlFor="wdesc">
              <Textarea id="wdesc" required rows={3} maxLength={1000} value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Activa or Jupiter, 2019 or newer, under 30k km" />
            </Field>
            <div className="cs-grid-2">
              <Field label="Budget (₹)" htmlFor="wbud">
                <Input id="wbud" type="number" inputMode="numeric" value={form.budget}
                       onChange={(e) => setForm({ ...form, budget: e.target.value })} />
              </Field>
              <Field label="City" htmlFor="wcity">
                <Input id="wcity" value={form.city}
                       onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </Field>
            </div>
            {error && <Note tone="danger">{error}</Note>}
            <Button type="submit" disabled={busy || !form.description.trim()}>Post</Button>
          </form>
        </Card>
      )}

      {loading ? <Spinner /> : wants.length === 0 ? (
        <Empty title="Nobody is asking for anything yet">
          Post what you are looking for and sellers will come to you.
        </Empty>
      ) : (
        <div className="stack">
          {wants.map((w) => (
            <Card key={w.id} className="dsc-req">
              <div className="dsc-req-body">
                <div className="dsc-req-wanted">Wanted</div>
                <div className="dsc-req-ttl">{w.description}</div>
                <div className="dsc-req-foot">
                  <Avatar name={w.buyer?.name} />
                  <span className="dsc-req-who">
                    {w.buyer?.name ?? "Someone"}
                    {w.buyer?.kyc_verified && <Verified>✓</Verified>}
                  </span>
                  {w.city && <span className="pl-statusline">{w.city}</span>}
                  <span className="pl-statusline">{ago(w.created_at)}</span>
                </div>
              </div>
              {w.budget_paise && (
                <div className="dsc-req-budget">Up to {inr(w.budget_paise)}</div>
              )}
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}
