"use client";

/**
 * Guided photo capture (DS gap: pl-camera). FR-2.2 for listings, FR-3.7 for
 * handover evidence.
 *
 * Two things make this more than a file input:
 *
 *  1. Fixed angle prompts. A listing with four arbitrary photos is what every
 *     other classifieds app already has; a listing with the odometer and the
 *     serial plate is what a buyer can actually judge.
 *  2. Client-side compression to ~400 KB. Uploading a 6 MB phone photo over a
 *     patchy mobile connection is the single slowest thing a seller does.
 */
import * as React from "react";
import { api } from "@/lib/api";
import { cx } from "./ui";

export interface Angle {
  id: string;
  label: string;
  required?: boolean;
}

/** Angle sets per category. Vehicles need the documents a buyer will check. */
export const ANGLES: Record<string, Angle[]> = {
  two_wheeler: [
    { id: "front", label: "Front", required: true },
    { id: "rear", label: "Rear", required: true },
    { id: "left", label: "Left side", required: true },
    { id: "right", label: "Right side", required: true },
    { id: "odometer", label: "Odometer", required: true },
    { id: "chassis", label: "Chassis number", required: true },
    { id: "rc", label: "RC book" },
    { id: "damage", label: "Any damage" },
  ],
  car: [
    { id: "front", label: "Front", required: true },
    { id: "rear", label: "Rear", required: true },
    { id: "left", label: "Left side", required: true },
    { id: "right", label: "Right side", required: true },
    { id: "interior", label: "Interior", required: true },
    { id: "odometer", label: "Odometer", required: true },
    { id: "chassis", label: "Chassis number", required: true },
    { id: "rc", label: "RC book" },
  ],
  phone: [
    { id: "front", label: "Screen on", required: true },
    { id: "back", label: "Back", required: true },
    { id: "imei", label: "IMEI (dial *#06#)", required: true },
    { id: "ports", label: "Ports & buttons", required: true },
    { id: "box", label: "Box & accessories" },
    { id: "damage", label: "Any damage" },
  ],
  laptop: [
    { id: "open", label: "Open, screen on", required: true },
    { id: "closed", label: "Closed lid", required: true },
    { id: "keyboard", label: "Keyboard", required: true },
    { id: "ports", label: "Ports", required: true },
    { id: "serial", label: "Serial number", required: true },
    { id: "damage", label: "Any damage" },
  ],
  default: [
    { id: "front", label: "Front", required: true },
    { id: "back", label: "Back", required: true },
    { id: "detail", label: "Close detail", required: true },
    { id: "flaws", label: "Any flaws", required: true },
  ],
};

export function anglesFor(categoryID: string): Angle[] {
  return ANGLES[categoryID] ?? ANGLES.default;
}

export interface Captured {
  angle: string;
  url: string;
  /** Local preview while the upload is in flight. */
  preview: string;
}

/**
 * Compresses to roughly maxBytes by stepping quality down, then falling back
 * to shrinking dimensions. Runs on the main thread, which is acceptable for a
 * handful of photos and avoids shipping a worker for it.
 */
async function compress(file: File, maxBytes = 400_000, maxEdge = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  let { width, height } = bitmap;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  for (const quality of [0.82, 0.7, 0.58, 0.45]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (blob && blob.size <= maxBytes) return blob;
    if (quality === 0.45 && blob) return blob; // good enough; stop degrading
  }
  throw new Error("could not compress image");
}

export function PhotoCapture({
  categoryID, kind = "listings", value, onChange, angles: override,
}: {
  categoryID: string;
  kind?: "listings" | "handover" | "evidence";
  value: Captured[];
  onChange: (next: Captured[]) => void;
  angles?: Angle[];
}) {
  const angles = override ?? anglesFor(categoryID);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function pick(angle: Angle, file: File) {
    setBusy(angle.id);
    setError(null);
    const preview = URL.createObjectURL(file);

    try {
      const blob = await compress(file);
      const { upload } = await api.presign(kind, "image/jpeg");

      // Straight to object storage — the bytes never touch our API.
      const put = await fetch(upload.upload_url, {
        method: "PUT",
        headers: upload.headers,
        body: blob,
      });
      if (!put.ok) throw new Error(`upload failed (${put.status})`);

      onChange([
        ...value.filter((v) => v.angle !== angle.id),
        { angle: angle.id, url: upload.public_url, preview },
      ]);
    } catch (e) {
      URL.revokeObjectURL(preview);
      setError(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setBusy(null);
    }
  }

  const done = new Set(value.map((v) => v.angle));
  const missing = angles.filter((a) => a.required && !done.has(a.id));

  return (
    <div className="pl-camera">
      <div className="pl-camera-angles">
        {angles.map((angle) => {
          const shot = value.find((v) => v.angle === angle.id);
          return (
            <label key={angle.id} className={cx("pl-camera-slot", shot && "is-done")}>
              {shot && <img src={shot.preview || shot.url} alt="" />}
              {angle.required && !shot && <span className="req">Required</span>}
              <span className="lbl">{busy === angle.id ? "Uploading…" : angle.label}</span>
              <input
                type="file"
                accept="image/*"
                // `capture` opens the camera directly on mobile, which is where
                // a seller actually is when photographing the item.
                capture="environment"
                className="pl-hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void pick(angle, f);
                  e.target.value = "";
                }}
              />
            </label>
          );
        })}
      </div>

      {error && <span className="pl-note is-danger">{error}</span>}
      {missing.length > 0 && (
        <span className="pl-note">
          Still needed: {missing.map((m) => m.label).join(", ")}
        </span>
      )}
    </div>
  );
}
