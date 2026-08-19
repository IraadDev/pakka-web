"use client";

/**
 * Six-digit code entry (DS gap: pl-otp).
 *
 * Used in two places with opposite meanings, which is worth keeping straight:
 *  · login — the user types a code sent to their own phone
 *  · handover — the SELLER types the code shown on the BUYER's phone
 *
 * The handover case is why this is deliberately hostile to autofill: a code
 * belonging to someone standing next to you must be typed, not suggested.
 */
import * as React from "react";
import { cx } from "./ui";

export function OTPInput({
  value, onChange, onComplete, length = 6, autoFocus, disabled, invalid, allowAutofill,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  /** Only the user's own login code should be autofillable. */
  allowAutofill?: boolean;
}) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length).slice(0, length).split("");

  React.useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  function set(i: number, char: string) {
    const next = (value.padEnd(length).split("").map((c, j) => (j === i ? char : c)).join("")).trimEnd();
    onChange(next.slice(0, length));
    if (char && i < length - 1) refs.current[i + 1]?.focus();
    if (next.replace(/\s/g, "").length === length) onComplete?.(next.slice(0, length));
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i]?.trim() && i > 0) {
      refs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
  }

  // Pasting the whole code is the fastest path when it arrives by SMS.
  function onPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    refs.current[Math.min(text.length, length - 1)]?.focus();
    if (text.length === length) onComplete?.(text);
  }

  return (
    <div className={cx("pl-otp", invalid && "is-error")} onPaste={onPaste}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className="pl-input pl-otp-cell"
          inputMode="numeric"
          // A numeric keypad on mobile; one character per box.
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of ${length}`}
          autoComplete={allowAutofill && i === 0 ? "one-time-code" : "off"}
          value={digits[i]?.trim() ?? ""}
          onChange={(e) => set(i, e.target.value.replace(/\D/g, "").slice(-1))}
          onKeyDown={(e) => onKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
