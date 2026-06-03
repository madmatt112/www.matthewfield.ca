"use client";

import { useEffect, useState } from "react";

// <ReadingProgress />: 3px-tall fixed bar across the top of the viewport;
// fill width tracks scroll through the page's <article>. Vanilla-DOM
// requestAnimationFrame-throttled scroll listener (NOT IntersectionObserver
// — Req 5.4 / design pin). role="presentation" (NOT progressbar — Req 5.7).
// Reduced-motion respected via the CSS-variable transition swap in
// src/styles/blog/reading-progress.css.
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const article = document.querySelector("article");
    if (!article) return;

    let rafId: number | null = null;

    const compute = () => {
      rafId = null;
      const rect = article.getBoundingClientRect();
      const articleHeight = rect.height;
      if (articleHeight <= 0) {
        setProgress(0);
        return;
      }
      const viewportBottom = window.innerHeight;
      const articleTop = rect.top;
      // progress = clamp((viewportBottom - articleTop) / articleHeight, 0, 1)
      const raw = (viewportBottom - articleTop) / articleHeight;
      const clamped = raw < 0 ? 0 : raw > 1 ? 1 : raw;
      setProgress(clamped);
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(compute);
    };

    // Initial paint reflects current scroll position.
    compute();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div role="presentation" className="reading-progress">
      <div className="reading-progress-fill" style={{ width: `${progress * 100}%` }} />
    </div>
  );
}
