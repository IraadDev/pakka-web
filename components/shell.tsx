"use client";

/**
 * App shell — the design system's sticky topbar, matched to the markup every
 * DS page uses: brand mark + wordmark, .fh-nav underline links, icon buttons,
 * theme toggle, avatar.
 *
 * Badge counts come from /notifications/summary and then update live over the
 * inbox stream, so an unread count is never stale while the tab is open.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useTheme } from "@/lib/theme";
import { useInboxStream } from "@/lib/realtime";
import type { Summary } from "@/lib/types";
import { Icon, Logo } from "./icon";
import { cx } from "./ui";

const NAV = [
  { href: "/", label: "Market" },
  { href: "/wanted", label: "Wanted" },
  { href: "/deals", label: "Deals", badge: "active_deals" as const },
  { href: "/sell", label: "Sell" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useSession();
  const { theme, toggle } = useTheme();
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

  const unread = summary?.unread_messages ?? 0;

  return (
    // Not .pl-shell: that applies its own max-width and padding, which would
    // constrain and double-pad the page width tier nested inside it. Each page
    // picks its own tier (page-wide / app / form / read / narrow).
    <div>
      <header className="fh-top">
        <div className="fh-top-inner">
          <Link className="pl-brand" href="/" aria-label="PAKKA home">
            <Logo />
            <span className="pl-wordmark">PAKKA</span>
          </Link>

          {/* .fh-nav is the DS's underline nav — .pl-navpill is a different
              component used for in-page filters, not the topbar. */}
          <nav className="fh-nav" aria-label="Main">
            {NAV.map((n) => {
              const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
              const count = n.badge && summary ? summary[n.badge] : 0;
              return (
                <Link key={n.href} href={n.href} className={cx(active && "is-active")}>
                  {n.label}
                  {count > 0 && <span className="cntpill">{count}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="fh-top-right">
            {user ? (
              <>
                <Link className="fh-top-ic" href="/saved" aria-label="Saved">
                  <Icon name="heart" size={16} />
                </Link>
                <Link className="fh-top-ic" href="/messages" aria-label="Messages">
                  <Icon name="contact" size={16} />
                  {unread > 0 && <span className="ping" />}
                </Link>
                <button
                  className={cx("pl-toggle", theme === "dark" && "is-on")}
                  onClick={toggle}
                  aria-label="Toggle theme"
                  aria-pressed={theme === "dark"}
                />
                <Link className="fh-top-ava" href="/settings" aria-label="Settings">
                  {initials(user.name)}
                </Link>
                <button className="pl-btn pl-btn-ghost pl-btn-sm" onClick={signOut}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <button
                  className={cx("pl-toggle", theme === "dark" && "is-on")}
                  onClick={toggle}
                  aria-label="Toggle theme"
                  aria-pressed={theme === "dark"}
                />
                <Link href="/login" className="pl-btn pl-btn-primary pl-btn-sm">Sign in</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}

function initials(name?: string | null): string {
  return (name ?? "?")
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join("").toUpperCase() || "?";
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
      <span className="ic"><Icon name="info" size={16} /></span>
      <span>
        Verify your identity to {action}. It takes about a minute and uses your
        Aadhaar via DigiLocker.
      </span>
      <Link href="/kyc" className="pl-btn pl-btn-primary pl-btn-sm">Verify now</Link>
    </div>
  );
}
