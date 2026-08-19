"use client";

/**
 * Search filters (FR-2.5). Filters live in the URL rather than component
 * state, so a filtered view can be shared, bookmarked, and survives a reload.
 */
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { CONDITION_LABEL } from "@/lib/types";
import type { Condition } from "@/lib/types";
import { Button, Chip, Input, Select } from "./ui";

const CONDITIONS = Object.keys(CONDITION_LABEL) as Condition[];

export function FilterBar() {
  const params = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const set = React.useCallback((patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const s = next.toString();
    router.push(s ? `/?${s}` : "/");
  }, [params, router]);

  const active = ["city", "condition", "min_paise", "max_paise", "verified"]
    .filter((k) => params.get(k));

  return (
    <div className="pl-toolbar">
      <div className="pl-viewgroup">
        <Chip active={params.get("sort") !== "price_asc" && params.get("sort") !== "price_desc"}
              onClick={() => set({ sort: null })}>
          Recent
        </Chip>
        <Chip active={params.get("sort") === "price_asc"} onClick={() => set({ sort: "price_asc" })}>
          Price ↑
        </Chip>
        <Chip active={params.get("sort") === "price_desc"} onClick={() => set({ sort: "price_desc" })}>
          Price ↓
        </Chip>
      </div>

      <span className="pl-toolbar-divider" aria-hidden />

      <Chip
        active={params.get("verified") === "true"}
        onClick={() => set({ verified: params.get("verified") === "true" ? null : "true" })}
      >
        Verified sellers only
      </Chip>

      <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Filters{active.length ? ` (${active.length})` : ""}
      </Button>

      {active.length > 0 && (
        <Button variant="ghost" size="sm" onClick={() => router.push("/")}>Clear</Button>
      )}

      {open && (
        <div className="pl-card" style={{ width: "100%", marginTop: 10 }}>
          <div className="cs-grid-3">
            <div className="pl-field">
              <label className="label" htmlFor="f-city">City</label>
              <Input
                id="f-city"
                defaultValue={params.get("city") ?? ""}
                placeholder="Bengaluru"
                onBlur={(e) => set({ city: e.target.value || null })}
              />
            </div>

            <div className="pl-field">
              <label className="label" htmlFor="f-cond">Condition</label>
              <Select
                id="f-cond"
                defaultValue={params.get("condition") ?? ""}
                onChange={(e) => set({ condition: e.target.value || null })}
              >
                <option value="">Any</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>{CONDITION_LABEL[c]}</option>
                ))}
              </Select>
            </div>

            <div className="pl-field">
              <label className="label">Price (₹)</label>
              <div className="pl-pricerange">
                <Input
                  type="number" inputMode="numeric" placeholder="Min"
                  defaultValue={params.get("min_paise") ? Number(params.get("min_paise")) / 100 : ""}
                  // The API takes paise; the field shows rupees. Converting at
                  // the boundary keeps floats out of the money path.
                  onBlur={(e) => set({ min_paise: e.target.value ? String(Number(e.target.value) * 100) : null })}
                />
                <span className="sep" aria-hidden>–</span>
                <Input
                  type="number" inputMode="numeric" placeholder="Max"
                  defaultValue={params.get("max_paise") ? Number(params.get("max_paise")) / 100 : ""}
                  onBlur={(e) => set({ max_paise: e.target.value ? String(Number(e.target.value) * 100) : null })}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
