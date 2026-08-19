"use client";

/**
 * The append-only audit log, rendered for humans.
 *
 * Every event the API records is shown. That is deliberate: a deal where one
 * party can see what the other did — and when — is the difference between a
 * disagreement and a dispute.
 */
import * as React from "react";
import { ago } from "@/lib/api";
import type { TimelineEntry } from "@/lib/types";
import { cx } from "./ui";

/** Event type → human sentence. Unknown types fall back to the raw type. */
const LABEL: Record<string, string> = {
  "deal.created": "Deal created",
  "deal.invited": "Invitation sent",
  "deal.verified": "Both parties verified",
  "deal.documented": "Terms written",
  "deal.signed": "Agreement signed by both",
  "deal.funded": "Buyer paid — money held",
  "payment.created": "Payment started",
  "payment.captured": "Payment received",
  "payment.released": "Money released to seller",
  "payment.refunded": "Money refunded to buyer",
  "handover.otp_sent": "Handover code sent to buyer",
  "handover.completed": "Handover confirmed",
  "deal.shipped": "Item shipped",
  "deal.confirmed": "Buyer confirmed receipt",
  "deal.released": "Deal complete",
  "deal.auto_released": "Auto-released — inspection window closed",
  "deal.cancelled": "Deal cancelled",
  "dispute.raised": "Dispute raised",
  "dispute.evidence_added": "Response added",
  "dispute.resolved": "Dispute decided",
  "rc.intimated": "Sale intimated to RTO",
  "rc.applied": "Transfer application filed",
  "rc.confirmed": "Ownership transferred",
  "rc.holdback_released": "Holdback released",
};

export function DealTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (!entries.length) return null;

  return (
    <ol className="pl-timeline">
      {entries.map((e, i) => {
        const last = i === entries.length - 1;
        return (
          <li key={e.id} className={cx("pl-timeline-item", last ? "is-now" : "is-done")}>
            {LABEL[e.type] ?? e.type}
            <span className="when">{ago(e.created_at)}</span>
          </li>
        );
      })}
    </ol>
  );
}
