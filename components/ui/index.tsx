/**
 * Thin wrappers over the design system. These apply pinlink.css class names —
 * they never introduce new styling. If a style is missing, add it to the
 * design-system project and re-copy, don't patch it here.
 */
import * as React from "react";

type Div = React.HTMLAttributes<HTMLDivElement>;
type Btn = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const cx = (...v: (string | false | null | undefined)[]) => v.filter(Boolean).join(" ");

/** Width tiers: wide (feeds), app, form (input), read (documents), narrow (auth). */
export function Page({
  width = "app", className, ...p
}: Div & { width?: "wide" | "app" | "form" | "read" | "narrow" }) {
  return <main id="main" className={cx(`page-${width}`, className)} {...p} />;
}

export function Button({
  variant = "primary", size, block, className, ...p
}: Btn & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm"; block?: boolean }) {
  return (
    <button
      className={cx("pl-btn", `pl-btn-${variant}`, size && "pl-btn-sm", block && "pl-btn-block", className)}
      {...p}
    />
  );
}

export function Card({ className, ...p }: Div) {
  return <article className={cx("pl-card", className)} {...p} />;
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="pl-stat">
      <span className="label">{label}</span>
      <div className="pl-stat-value">{value}</div>
      {sub && <div className="pl-stat-bar" aria-hidden>{sub}</div>}
    </div>
  );
}

/** Status pill. Pass the DS class from listingStatusClass / dealStateClass. */
export function Status({ statusClass, children }: { statusClass: string; children: React.ReactNode }) {
  return <span className={cx("pl-status", statusClass)}>{children}</span>;
}

export function Verified({ children = "verified" }: { children?: React.ReactNode }) {
  return (
    <span className="pl-verified">
      <span className="dot" aria-hidden />
      {children}
    </span>
  );
}

export function Banner({
  tone = "info", children, className,
}: { tone?: "info" | "ok" | "warn" | "danger"; children: React.ReactNode; className?: string }) {
  return <div className={cx("pl-banner", `is-${tone}`, className)}>{children}</div>;
}

export function Empty({
  title, children, action,
}: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="pl-empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return <span className="pl-spinner" role="status" aria-label={label} />;
}

/** Skeleton card — shown while a feed loads, so the page has shape immediately. */
export function SkeletonCard() {
  return (
    <div className="pl-skel-card" aria-hidden>
      <div className="pl-skel" />
      <div className="pl-skel-line" />
      <div className="pl-skel-line" style={{ width: "60%" }} />
    </div>
  );
}

export function Field({
  label, hint, error, children, htmlFor,
}: {
  label: string; hint?: string; error?: string;
  children: React.ReactNode; htmlFor?: string;
}) {
  return (
    <div className={cx("pl-field", error && "is-error")}>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <span className="pl-note is-danger">{error}</span>
             : hint && <span className="pl-note">{hint}</span>}
    </div>
  );
}

export function Input({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx("pl-input", className)} {...p} />;
}

export function Textarea({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx("pl-textarea", className)} {...p} />;
}

export function Select({ className, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx("pl-select", className)} {...p} />;
}

export function Chip({
  active, className, ...p
}: Btn & { active?: boolean }) {
  return <button type="button" className={cx("pl-chip", active && "is-active", className)} {...p} />;
}

export function Divider() {
  return <hr className="pl-divider" />;
}

export function SectionRule({ children }: { children?: React.ReactNode }) {
  return <div className="pl-section-rule">{children}</div>;
}

/** Avatar. Initials rather than an image — nobody uploads a photo in v1. */
export function Avatar({ name, className }: { name?: string | null; className?: string }) {
  const initials = (name ?? "?")
    .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return <span className={cx("fh-ava", className)} aria-hidden>{initials || "?"}</span>;
}

export function Note({ tone, children }: { tone?: "danger" | "warn" | "ok"; children: React.ReactNode }) {
  return <span className={cx("pl-note", tone && `is-${tone}`)}>{children}</span>;
}

/** Star rating, read-only. */
export function Stars({ value, count }: { value: number | null; count?: number }) {
  if (value == null) return <span className="pl-note">No ratings yet</span>;
  const full = Math.round(value);
  return (
    <span className="dsc-stars" title={`${value.toFixed(1)} out of 5`}>
      {"★★★★★".slice(0, full)}
      <span className="off">{"★★★★★".slice(full)}</span>
      {count != null && <span className="cnt"> ({count})</span>}
    </span>
  );
}

export function Modal({
  title, onClose, children, foot,
}: { title: string; onClose: () => void; children: React.ReactNode; foot?: React.ReactNode }) {
  // Escape closes — a modal that traps you is worse than no modal.
  React.useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div className="pl-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="pl-modal-head">
        <strong>{title}</strong>
        <button className="pl-modal-close" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="pl-modal-body">{children}</div>
      {foot && <div className="pl-modal-foot">{foot}</div>}
    </div>
  );
}
