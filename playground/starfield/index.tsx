"use client";

import { useEffect, useRef } from "react";

import styles from "./styles.module.css";

// <Starfield />: a full-bleed (position: fixed, 100vw×100vh) animated starfield —
// the canonical "needs its own viewport" case (tech.md iframe-required list, Req 7.3)
// that would escape the same-page isolation boundary, so it ships via the iframe path.
// SSR-safety (Req 4.6 host / r2-N2): the embed route SSR-prerenders this module via
// SSR-on `dynamic` (no `ssr:false` opt-out), so NO window/document/canvas/RAF/ref
// access happens at module or render scope — everything is inside useEffect. The
// server renders a bare <canvas ref> which hydrates cleanly. The single <h1> is the
// embed document's heading (the embed route supplies <title> via metadata and inherits
// `lang` from the root <html> — Req 4.6).
export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    type Star = { x: number; y: number; z: number };
    const STAR_COUNT = 400;
    const SPEED = 0.015;
    let stars: Star[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId: number | null = null;

    const seedStars = () => {
      stars = Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        z: Math.random(),
      }));
    };

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#05060f";
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      for (const star of stars) {
        if (!prefersReducedMotion) {
          star.z -= SPEED;
          if (star.z <= 0.01) {
            star.x = Math.random() * 2 - 1;
            star.y = Math.random() * 2 - 1;
            star.z = 1;
          }
        }

        const px = cx + (star.x / star.z) * cx;
        const py = cy + (star.y / star.z) * cy;
        if (px < 0 || px >= width || py < 0 || py >= height) continue;

        const size = (1 - star.z) * 2.5;
        const alpha = 1 - star.z;
        ctx.fillStyle = `rgba(248, 250, 252, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(size, 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const tick = () => {
      draw();
      rafId = window.requestAnimationFrame(tick);
    };

    seedStars();
    resize();

    if (prefersReducedMotion) {
      // Paint a single static frame; no animation loop.
      draw();
    } else {
      rafId = window.requestAnimationFrame(tick);
    }

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className={styles.root}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <h1 className={styles.heading}>Starfield</h1>
    </div>
  );
}
