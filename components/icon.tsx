/**
 * Icon set and brand mark, ported verbatim from the design system's
 * pinlink.js. Same 16px grid, same 1.4 stroke, same path data — these are the
 * glyphs every design-system page renders, so the app must use them rather
 * than substituting unicode characters.
 *
 * Ported rather than script-loaded: pinlink.js writes into the DOM on load,
 * which fights React. The paths are the asset; the delivery is ours.
 */
import * as React from "react";

const PATHS: Record<string, string> = {
  dashboard: `<rect x="2" y="2" width="5.5" height="5.5" rx="1"/><rect x="8.5" y="2" width="5.5" height="5.5" rx="1"/><rect x="2" y="8.5" width="5.5" height="5.5" rx="1"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1"/>`,
  assets: `<rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><path d="M11.5 9.5v4M9.5 11.5h4"/>`,
  categories: `<path d="M3 4l4 4-4 4M8 4l4 4-4 4"/>`,
  stake: `<path d="M8 2l6 3v6l-6 3-6-3V5l6-3z"/><path d="M2 5l6 3 6-3M8 8v6"/>`,
  marketplace: `<path d="M2 2h5l7 7-5 5-7-7V2z"/><circle cx="5.5" cy="5.5" r="1.1"/>`,
  contact: `<circle cx="8" cy="8" r="6"/><path d="M8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM10.5 8v1.5a1.5 1.5 0 003 0V8"/>`,
  overview: `<path d="M2 8h2.5l1.5 4 2.5-9 1.5 5h2.5"/>`,
  search: `<circle cx="6.8" cy="6.8" r="4.2"/><path d="M11 11l3 3"/>`,
  filter: `<path d="M2 4h12M4 8h8M6 12h4"/>`,
  gridview: `<rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>`,
  listview: `<path d="M2 3.5h2M6 3.5h8M2 8h2M6 8h8M2 12.5h2M6 12.5h8"/>`,
  plus: `<path d="M8 3v10M3 8h10"/>`,
  check: `<path d="M3 8.2l3.2 3.2L13 4.5"/>`,
  close: `<path d="M4 4l8 8M12 4l-8 8"/>`,
  edit: `<path d="M11 2l3 3-8 8H3v-3l8-8z"/>`,
  trash: `<path d="M3 5h10M6 5V3h4v2M5 5l.8 9h4.4L11 5"/>`,
  arrowup: `<path d="M4 12L12 4M6 4h6v6"/>`,
  chevdown: `<path d="M4 6l4 4 4-4"/>`,
  calendar: `<rect x="2.5" y="3" width="11" height="11" rx="1.5"/><path d="M2.5 6.5h11M5.5 1.8v2.4M10.5 1.8v2.4"/>`,
  box: `<path d="M8 2l6 3v6l-6 3-6-3V5l6-3z"/><path d="M2 5l6 3 6-3M8 8v6"/>`,
  info: `<circle cx="8" cy="8" r="6.2"/><path d="M8 7.2v3.6M8 5.1v.2"/>`,
  external: `<path d="M6 3H3v10h10v-3M9 3h4v4M13 3L7 9"/>`,
  star: `<path d="M8 2l1.7 3.9 4.3.4-3.2 2.8 1 4.2L8 11.1 4.2 13.3l1-4.2L2 6.3l4.3-.4L8 2z"/>`,
  sun: `<circle cx="8" cy="8" r="3.2"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"/>`,
  moon: `<path d="M13 9.5A5.5 5.5 0 016.5 3a5.5 5.5 0 102.8 10.3A5.5 5.5 0 0013 9.5z"/>`,
  eye: `<path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/>`,
  wallet: `<rect x="2" y="4" width="12" height="9" rx="1.5"/><path d="M2 6.5h12M11 9.5h1.5"/>`,
  tag: `<path d="M2 2h5l7 7-5 5-7-7V2z"/><circle cx="5.5" cy="5.5" r="1.1"/>`,
  hashlink: `<rect x="2.2" y="2.2" width="3" height="3" rx="1"/><rect x="10.8" y="2.2" width="3" height="3" rx="1"/><rect x="2.2" y="10.8" width="3" height="3" rx="1"/><rect x="10.8" y="10.8" width="3" height="3" rx="1"/><path d="M6.3 4h3.4M6.3 12h3.4M4 6.3v3.4M12 6.3v3.4"/>`,
  sort: `<path d="M4 6l-2 2 2 2M2 8h5M12 4l2 2-2 2M14 6H9"/>`,
  download: `<path d="M8 2v8M5 7l3 3 3-3M3 13h10"/>`,
  sliders: `<path d="M2 4.5h6M11 4.5h3M2 11.5h3M8 11.5h6"/><circle cx="9.5" cy="4.5" r="1.6"/><circle cx="5.5" cy="11.5" r="1.6"/>`,
  clock: `<circle cx="8" cy="8" r="6.2"/><path d="M8 4.6V8l2.4 1.6"/>`,
  heart: `<path d="M8 13.3S2.3 9.7 2.3 5.9C2.3 4 3.8 2.7 5.4 2.7c1.1 0 2 .6 2.6 1.5.6-.9 1.5-1.5 2.6-1.5 1.6 0 3.1 1.3 3.1 3.2 0 3.8-5.7 7.4-5.7 7.4z"/>`,
  spark: `<path d="M8 1.5l1.6 4.3 4.4 1.2-3.4 2.6.4 4.6L8 11.7 4.6 14.2l.4-4.6L1.6 7l4.4-1.2L8 1.5z"/>`,
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name, size = 16, stroke = 1.4, className,
}: { name: string; size?: number; stroke?: number; className?: string }) {
  const body = PATHS[name];
  if (!body) return null;
  return (
    <svg
      viewBox="0 0 16 16" width={size} height={size}
      fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden focusable="false"
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}

/** Filled variant, for glyphs the DS renders solid (star, heart, spark). */
export function IconFill({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  const body = PATHS[name];
  if (!body) return null;
  return (
    <svg
      viewBox="0 0 16 16" width={size} height={size}
      fill="currentColor" stroke="none"
      className={className} aria-hidden focusable="false"
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}

const LOGO = `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3.1" fill="currentColor"/><circle cx="12" cy="3.4" r="2.1" fill="currentColor"/><circle cx="12" cy="20.6" r="2.1" fill="currentColor"/><circle cx="3.4" cy="12" r="2.1" fill="currentColor"/><circle cx="20.6" cy="12" r="2.1" fill="currentColor"/><path d="M12 5.6v3.3M12 15.1v3.3M5.6 12h3.3M15.1 12h3.3" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>`;

/** The brand mark. Same geometry as FH.LOGO_SVG. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span
      className="pl-logo"
      style={{ width: size, height: size }}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: LOGO }}
    />
  );
}
