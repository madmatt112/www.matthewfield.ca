"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

import styles from "./styles.module.css";

/* scribble-pad — same-page playground sample (iframeIsolated: false).

   A freehand-drawing <canvas> toy whose CSS Module sets clashing values
   (serif font, off-brand color/background, bespoke layout) that would visibly
   conflict with the site theme if they leaked past the .playground-container
   reset — the same-page isolation proof (Req 7.2).

   SSR-safety (design r2-N2): the per-item landing route prerenders this via a
   SSR-on `dynamic()` (no `ssr: false` opt-out). Every browser-global access
   (window/document/canvas.getContext/ref.current/pointer events) lives inside
   `useEffect` or event handlers — the server renders only a bare <canvas ref>.
   An unguarded browser global throws during the static prerender. */
export default function ScribblePad() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match the canvas backing store to its displayed size for crisp lines.
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#6b1f1f";
    };
    resize();

    let drawing = false;

    const pointFromEvent = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const onPointerDown = (event: PointerEvent) => {
      drawing = true;
      canvas.setPointerCapture(event.pointerId);
      const { x, y } = pointFromEvent(event);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!drawing) return;
      const { x, y } = pointFromEvent(event);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const onPointerUp = (event: PointerEvent) => {
      drawing = false;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    window.addEventListener("resize", resize);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <>
      {/* Toy surface — deliberately serif/off-brand (Req 7.2). The clashing
          font-family lives on .root so the visual isolation proof still holds. */}
      <div className={styles.root}>
        <h1 className={styles.heading}>Scribble Pad</h1>
        <p className={styles.hint}>Click and drag inside the box to draw.</p>

        <canvas ref={canvasRef} className={styles.canvas} aria-label="Freehand drawing surface" />

        <div className={styles.toolbar}>
          <Button type="button" variant="outline" onClick={clear}>
            Clear
          </Button>
        </div>
      </div>

      {/* Isolation-proof fixture panel. Rendered as a SIBLING of the serif toy
          surface (not a child) so its descendants inherit .playground-container's
          re-established ui-sans-serif font rather than .root's Georgia serif.
          Each element carries one of the six data-testid hooks the live
          e2e/tests/playground-isolation.test.ts reads. Selected by data-testid
          only — never hashed class (Req 10.3). */}
      <div className={styles.panel}>
        {/* sample-plain-div → inline styles survive the reset. */}
        <div data-testid="sample-plain-div" style={{ color: "red", fontFamily: "serif" }}>
          Plain div with inline conflicting styles (color:red, font-family:serif).
        </div>

        {/* sample-font-target → computed font-family resolves to the
            re-established ui-sans-serif stack after the M1 fix. */}
        <Button data-testid="sample-font-target">shadcn/ui Button</Button>

        {/* sample-tailwind-div → Tailwind utilities resolve inside the
            container's @layer. */}
        <div data-testid="sample-tailwind-div" className="bg-blue-500 p-4 text-lg">
          Tailwind utilities (bg-blue-500, p-4, text-lg).
        </div>

        {/* sample-token-target → re-established tokens reach descendants
            via var(); --radius applied to border-radius (asserted === "10px"). */}
        <div
          data-testid="sample-token-target"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            borderRadius: "var(--radius)",
            padding: "1rem",
          }}
        >
          Re-established token access via var() references.
        </div>

        {/* sample-button-token → the shadcn Button consumes the
            re-established --primary / --primary-foreground via inline style. */}
        <Button
          data-testid="sample-button-token"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          Button styled via tokens
        </Button>

        {/* sample-leak-probe → no-override control: host font fragments
            (["Geist"]) must NOT appear in the inherited computed font-family. */}
        <div data-testid="sample-leak-probe">
          No inline overrides — inherits from the playground container.
        </div>
      </div>
    </>
  );
}
