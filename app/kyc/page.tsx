"use client";

/**
 * Identity verification (FR-1.2). The gate on everything that moves money.
 *
 * The consent flow redirects out to DigiLocker and back with a code. In
 * development the provider is a stub that echoes the name typed here, which is
 * what lets the whole deal flow be walked locally.
 */
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { ApiError, api } from "@/lib/api";
import { useRequireAuth, useSession } from "@/lib/session";
import { Button, Card, Field, Input, Note, Page, Spinner, Verified } from "@/components/ui";

function KYCPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading } = useRequireAuth();
  const { signIn } = useSession();

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ref, setRef] = React.useState<string | null>(params.get("ref"));
  const [legalName, setLegalName] = React.useState("");

  if (loading) return <Page width="narrow"><Spinner /></Page>;
  if (!user) return null;

  if (user.kyc_status === "verified") {
    return (
      <Page width="narrow">
        <Card>
          <h1 className="display-m">You are verified <Verified /></h1>
          <p className="text-2">
            Your legal name is on record. Payouts can only go to an account in
            that same name.
          </p>
          <Button onClick={() => router.push("/")}>Continue</Button>
        </Card>
      </Page>
    );
  }

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.startKYC(`${window.location.origin}/kyc`);
      setRef(res.ref);
      // A real provider sends the user away; the stub returns a local URL.
      if (!res.auth_url.includes("stub=1")) {
        window.location.href = res.auth_url;
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start verification.");
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    if (!ref) return;
    setBusy(true);
    setError(null);
    try {
      const session = await api.completeKYC(legalName, ref);
      signIn(session); // new token carries the verified claim
      router.push(session.next || "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We could not verify that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page width="narrow">
      <Card>
        <h1 className="display-m">Verify your identity</h1>
        <p className="text-2">
          PAKKA checks both sides of every deal against government records. It is
          why a buyer will trust you, and why you can trust them.
        </p>

        <ul className="clean text-2">
          <li>We store a reference, never a copy of your document</li>
          <li>Your verified name is what payouts must match</li>
          <li>Takes about a minute</li>
        </ul>

        {!ref ? (
          <Button block onClick={start} disabled={busy}>
            {busy ? "Starting…" : "Verify with DigiLocker"}
          </Button>
        ) : (
          <>
            <Field
              label="Your full legal name"
              hint="Exactly as it appears on your Aadhaar"
              htmlFor="legal"
              error={error ?? undefined}
            >
              <Input id="legal" autoFocus value={legalName}
                     onChange={(e) => setLegalName(e.target.value)} placeholder="Rajesh Kumar Sharma" />
            </Field>
            <Button block onClick={complete} disabled={busy || legalName.trim().length < 3}>
              {busy ? "Verifying…" : "Complete verification"}
            </Button>
          </>
        )}

        {error && !ref && <Note tone="danger">{error}</Note>}
      </Card>
    </Page>
  );
}

/**
 * useSearchParams() forces client-side rendering, so Next needs an explicit
 * boundary to prerender the shell around it.
 */
export default function KYCPage() {
  return (
    <React.Suspense fallback={<Page width="narrow"><Spinner /></Page>}>
      <KYCPageInner />
    </React.Suspense>
  );
}
