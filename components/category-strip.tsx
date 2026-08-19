"use client";

/**
 * Category chips. Uses the design system's mam-categories vocabulary, where
 * each category carries its own colour and glyph from the server.
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Category } from "@/lib/types";
import { cx } from "./ui";

export function CategoryStrip({ categories }: { categories: Category[] }) {
  const params = useSearchParams();
  const active = params.get("category");

  if (!categories.length) return null;

  const href = (id: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (id) next.set("category", id); else next.delete("category");
    const s = next.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <nav className="mc-chiprow" aria-label="Categories">
      <Link href={href(null)} className={cx("mc-chip", !active && "is-active")}>
        All
      </Link>
      {categories.map((c) => (
        <Link
          key={c.id}
          href={href(c.id)}
          className={cx("mc-chip", active === c.id && "is-active")}
          // The category's own colour, straight from the server, drives the
          // swatch — so adding a category needs no frontend change.
          style={{ ["--cat" as string]: c.colour }}
        >
          <span className="cat-glyph" aria-hidden>{c.glyph}</span>
          {c.label}
        </Link>
      ))}
    </nav>
  );
}
