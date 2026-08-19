"use client";

/**
 * Invite landing (route /d/[token]). Flow B — a deal agreed elsewhere.
 *
 * NFR-2: this must work in a plain mobile browser with no app install. That is
 * the whole point of the link: the other party is on WhatsApp, not on PAKKA.
 */
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { useSession } from "@/lib/session";
import { Button, Card, Note, Page } from "@/components/ui";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { user } = useSession();

  // The token identifies the deal; the API still checks the caller is a party,
  // so this only needs to get them signed in and pointed at the right screen.
  React.useEffect(() => {
    if (user) router.replace(`/deals?invite=${token}`);
  }, [user, token, router]);

  return (
    <Page width="narrow">
      <Card>
        <h1 className="display-m">You have been invited to a deal</h1>
        <p className="text-2">
          Someone wants to buy or sell with you through PAKKA. Both of you verify
          who you are, agree the terms in writing, and the money is held until
          the item changes hands.
        </p>

        <ul className="clean text-2">
          <li>No app to install</li>
          <li>The seller is paid only after you confirm</li>
          <li>PAKKA never holds your money — a licensed payment provider does</li>
        </ul>

        <Button block onClick={() => router.push(`/login?next=/d/${token}`)}>
          Sign in to continue
        </Button>
        <Note>Signing in takes a phone number and a six-digit code.</Note>
      </Card>
    </Page>
  );
}
