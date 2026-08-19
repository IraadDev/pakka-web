"use client";

/**
 * Live updates over SSE. The API pushes on three topics — personal inbox, one
 * thread, one deal — so a screen subscribes to whichever it is showing.
 *
 * EventSource cannot send an Authorization header, so the token rides as a
 * query parameter. That is why the API also accepts it there for stream
 * routes only.
 */
import * as React from "react";
import { tokens } from "./api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type StreamEvent = {
  type: string;
  topic: string;
  data: unknown;
};

/**
 * Subscribes to an SSE path while mounted.
 *
 * `onEvent` is kept in a ref so a caller can pass an inline closure without
 * tearing down and rebuilding the connection on every render.
 */
export function useStream(path: string | null, onEvent: (e: StreamEvent) => void) {
  const handler = React.useRef(onEvent);

  // Assigned in an effect, not during render: writing a ref while rendering is
  // a side effect, and under concurrent rendering a discarded render would
  // leave the ref pointing at a callback that never committed.
  React.useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    if (!path) return;
    const token = tokens.access();
    if (!token) return;

    const url = `${BASE}${path}?access_token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.addEventListener("open", () => setConnected(true));

    // Every event type arrives as a named SSE event, so one generic listener
    // is not enough — attach to the ones the app actually reacts to.
    const types = [
      "message.created", "offer.created", "offer.accepted", "offer.declined",
      "thread.opened", "deal.state_changed", "deal.terms_updated", "deal.signed",
      "payment.created", "handover.otp_sent", "dispute.raised", "dispute.resolved",
      "rc.confirmed", "rc.holdback_released", "review.received", "unread.changed",
    ];

    const listeners = types.map((t) => {
      const fn = (ev: MessageEvent) => {
        try {
          handler.current(JSON.parse(ev.data) as StreamEvent);
        } catch {
          /* a frame we cannot parse is not worth crashing the screen over */
        }
      };
      es.addEventListener(t, fn as EventListener);
      return [t, fn] as const;
    });

    es.onerror = () => setConnected(false);

    return () => {
      for (const [t, fn] of listeners) es.removeEventListener(t, fn as EventListener);
      es.close();
      setConnected(false);
    };
  }, [path]);

  return { connected };
}

/** Live badge counts for the shell. */
export function useInboxStream(onEvent: (e: StreamEvent) => void) {
  return useStream("/v1/stream", onEvent);
}
