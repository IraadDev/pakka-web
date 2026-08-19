"use client";

/**
 * Photo compare (DS gap: pl-compare). Used in dispute review to put the
 * listing photo and the handover photo in the same frame.
 *
 * A slider rather than two images side by side: a dispute usually turns on
 * whether one specific area changed, and comparing that across a gap is
 * exactly what the eye is bad at.
 */
import * as React from "react";

export function PhotoCompare({
  before, after, beforeLabel = "Listed", afterLabel = "At handover",
}: {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  const [split, setSplit] = React.useState(50);
  const box = React.useRef<HTMLDivElement>(null);
  const dragging = React.useRef(false);

  const moveTo = React.useCallback((clientX: number) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplit(Math.min(100, Math.max(0, pct)));
  }, []);

  return (
    <div
      ref={box}
      className="pl-compare"
      style={{ ["--split" as string]: `${split}%` }}
      onPointerDown={(e) => { dragging.current = true; moveTo(e.clientX); }}
      onPointerMove={(e) => dragging.current && moveTo(e.clientX)}
      onPointerUp={() => { dragging.current = false; }}
      onPointerLeave={() => { dragging.current = false; }}
    >
      <img src={before} alt={beforeLabel} />
      <img className="after" src={after} alt={afterLabel} />

      <span className="pl-compare-tag bl">{beforeLabel}</span>
      <span className="pl-compare-tag br">{afterLabel}</span>

      <div
        className="pl-compare-handle"
        role="slider"
        tabIndex={0}
        aria-label="Compare position"
        aria-valuenow={Math.round(split)}
        aria-valuemin={0}
        aria-valuemax={100}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setSplit((s) => Math.max(0, s - 4));
          if (e.key === "ArrowRight") setSplit((s) => Math.min(100, s + 4));
        }}
      />
    </div>
  );
}
