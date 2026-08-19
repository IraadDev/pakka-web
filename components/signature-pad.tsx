"use client";

/**
 * Signature pad (DS gap: pl-signature). Backs the dual eSign in FR-3.3.
 *
 * Exports a PNG data URL. The signature is evidence in a dispute, so it is
 * captured at device pixel ratio rather than CSS pixels — a signature that
 * renders blurry when zoomed is worth less when someone is arguing over it.
 */
import * as React from "react";
import { Button, cx } from "./ui";

export function SignaturePad({
  onChange, disabled, label = "Sign with your finger or mouse",
}: {
  onChange: (dataURL: string | null) => void;
  disabled?: boolean;
  label?: string;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const drawing = React.useRef(false);
  const [signed, setSigned] = React.useState(false);

  // Size the backing store to the device pixel ratio once mounted, and again
  // if the viewport changes — a rotated phone would otherwise stretch it.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      // Read the ink colour from the design system rather than hard-coding it,
      // so the pad follows the theme.
      ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue("color") || "#fff";
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    drawing.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!signed) setSigned(true);
  }

  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas && signed) onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
    onChange(null);
  }

  return (
    <div className={cx("pl-signature", signed && "is-signed")}>
      <canvas
        ref={canvasRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        aria-label={label}
      />
      <div className="pl-signature-hint">{label}</div>
      <div className="pl-signature-foot">
        <span className="pl-note">
          {signed ? "Signed — clear to redo" : "Your signature is stored with the agreement"}
        </span>
        <Button variant="ghost" size="sm" type="button" onClick={clear} disabled={!signed || disabled}>
          Clear
        </Button>
      </div>
    </div>
  );
}
