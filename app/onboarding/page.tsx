"use client";

/** Onboarding (route /onboarding). Name and city, then straight to KYC. */
import { useRouter } from "next/navigation";
import * as React from "react";
import { ApiError, api } from "@/lib/api";
import { useRequireAuth, useSession } from "@/lib/session";
import { Button, Card, Field, Input, Note, Page, Spinner } from "@/components/ui";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useRequireAuth();
  const { refresh } = useSession();

  // null means "not yet edited"; the user's stored value shows until then.
  const [nameEdit, setNameEdit] = React.useState<string | null>(null);
  const [cityEdit, setCityEdit] = React.useState<string | null>(null);
  const name = nameEdit ?? user?.name ?? "";
  const city = cityEdit ?? user?.city ?? "";
  const setName = setNameEdit;
  const setCity = setCityEdit;
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (loading) return <Page width="narrow"><Spinner /></Page>;
  if (!user) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.updateMe({ name: name.trim(), city: city.trim() });
      await refresh();
      router.push("/kyc");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page width="narrow">
      <Card>
        <h1 className="display-m">Welcome to PAKKA</h1>
        <p className="text-2">Two details, then we verify who you are.</p>

        <form onSubmit={save}>
          <Field label="Your name" htmlFor="name">
            <Input id="name" required autoFocus value={name}
                   onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="City" hint="We show you what is nearby first" htmlFor="city">
            <Input id="city" required value={city}
                   onChange={(e) => setCity(e.target.value)} placeholder="Bengaluru" />
          </Field>
          {error && <Note tone="danger">{error}</Note>}
          <Button type="submit" block disabled={busy || !name.trim() || !city.trim()}>
            Continue
          </Button>
        </form>
      </Card>
    </Page>
  );
}
