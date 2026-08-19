"use client";

/**
 * Phone + OTP sign-in (FR-1.1). There are no passwords anywhere in PAKKA.
 */
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { ApiError, api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { OTPInput } from "@/components/otp-input";
import { Button, Card, Field, Input, Note, Page } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { signIn, user } = useSession();

  const [phase, setPhase] = React.useState<"phone" | "code">("phone");
  const [phone, setPhone] = React.useState("");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [debugCode, setDebugCode] = React.useState<string | null>(null);
  const [resendIn, setResendIn] = React.useState(0);

  const next = params.get("next") ?? "/";

  // Already signed in — no reason to show a login form.
  React.useEffect(() => {
    if (user) router.replace(next);
  }, [user, next, router]);

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.sendOTP(phone);
      setPhase("code");
      setResendIn(30);
      // Development only: the API echoes the code so a local run needs no SMS.
      setDebugCode(res.debug_code ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(value = code) {
    setError(null);
    setBusy(true);
    try {
      const session = await api.verifyOTP(phone, value);
      signIn(session);
      // The server decides what comes next — profile, KYC, or straight in.
      router.replace(session.next || next);
    } catch (err) {
      setCode("");
      setError(err instanceof ApiError ? err.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page width="narrow">
      <Card>
        {phase === "phone" ? (
          <form onSubmit={send}>
            <h1 className="display-m">Sign in</h1>
            <p className="text-2">
              We send a six-digit code by SMS. No password to remember or lose.
            </p>

            <Field label="Mobile number" hint="10-digit Indian mobile" htmlFor="phone" error={error ?? undefined}>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                autoFocus
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              />
            </Field>

            <Button type="submit" block disabled={phone.length !== 10 || busy}>
              {busy ? "Sending…" : "Send code"}
            </Button>
          </form>
        ) : (
          <div>
            <h1 className="display-m">Enter the code</h1>
            <p className="text-2">
              Sent to {phone}.{" "}
              <button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={() => setPhase("phone")}>
                Change
              </button>
            </p>

            <OTPInput
              value={code}
              onChange={setCode}
              onComplete={verify}
              autoFocus
              disabled={busy}
              invalid={!!error}
              // This is the user's own code, so autofill from SMS is welcome.
              allowAutofill
            />

            {error && <Note tone="danger">{error}</Note>}
            {debugCode && <Note>Development code: {debugCode}</Note>}

            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <Button onClick={() => verify()} disabled={code.length !== 6 || busy} block>
                {busy ? "Checking…" : "Sign in"}
              </Button>
            </div>

            <div style={{ marginTop: 10 }}>
              <Button variant="ghost" size="sm" onClick={send} disabled={resendIn > 0 || busy}>
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </Page>
  );
}
