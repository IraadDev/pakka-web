"use client";

/**
 * App shell — top bar and navigation. Uses the design system's fh-shell
 * classes, so it matches every other surface without new styling.
 *
 * Badge counts come from /notifications/summary and then update live over the
 * inbox stream, so an unread count is never stale while the tab is open.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useInboxStream } from "@/lib/realtime";
import type { Summary } from "@/lib/types";
import { Avatar, cx } from "./ui";

const NAV = [
  { href: "/", label: "Browse" },
  { href: "/wanted", label: "Wanted" },
  { href: "/messages", label: "Messages", badge: "unread_messages" as const },
  { href: "/deals", label: "Deals", badge: "active_deals" as const },
  { href: "/sell", label: "Sell" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useSession();
  const pathname = usePathname();
  const [summary, setSummary] = React.useState<Summary | null>(null);

  const load = React.useCallback(async () => {
    if (!user) return setSummary(null);
    try {
      setSummary(await api.summary());
    } catch {
      /* a stale badge is not worth an error state */
    }
  }, [user]);

  React.useEffect(() => { void load(); }, [load, pathname]);

  // Live: a new message bumps the badge without a refetch of the whole shell.
  useInboxStream(
    React.useCallback((e) => {
      if (e.type === "message.created" || e.type === "unread.changed" || e.type === "deal.state_changed") {
        void load();
      }
    }, [load]),
  );

  return (
    // Not .pl-shell: that applies its own max-width and padding, which would
    // constrain and double-pad the page width tier nested inside it. Each page
    // picks its own tier (page-wide / app / form / read / narrow).
    <div>
      <header className="fh-top">
        <div className="fh-top-inner">
          <Link href="/" className="pl-brand" aria-label="PAKKA home">
            <span className="pl-wordmark">PAKKA</span>
          </Link>

          <nav className="fh-nav" aria-label="Main">
            {NAV.map((n) => {
              const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
              const count = n.badge && summary ? summary[n.badge] : 0;
              return (
                <Link key={n.href} href={n.href} className={cx("pl-navpill", active && "is-active")}>
                  {n.label}
                  {count > 0 && <span className="cntpill">{count}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="fh-top-right">
            {user ? (
              <>
                <Link href="/saved" className="fh-top-ic" aria-label="Saved">♡</Link>
                <Link href="/settings" className="fh-top-ava" aria-label="Settings">
                  <Avatar name={user.name} />
                </Link>
                <button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={signOut}>Sign out</button>
              </>
            ) : (
              <Link href="/login" className="pl-btn pl-btn-primary pl-btn-sm">Sign in</Link>
            )}
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}

/**
 * Prompts an unverified user to finish KYC. Shown above anything that will
 * refuse without it, so the wall is never a surprise at the point of action.
 */
export function VerifyPrompt({ action = "do this" }: { action?: string }) {
  const { user } = useSession();
  if (!user || user.kyc_status === "verified") return null;

  return (
    <div className="pl-banner is-warn">
      <span>
        Verify your identity to {action}. It takes about a minute and uses your
        Aadhaar via DigiLocker.
      </span>
      <Link href="/kyc" className="pl-btn pl-btn-primary pl-btn-sm">Verify now</Link>
    </div>
  );
}
