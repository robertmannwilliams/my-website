"use client";

// The self-painting homepage hero (hero/HERO.md Phases 2-4).
//
// A canvas player for public/hero/strokes.bin: replays the painting's
// 46k-stroke performance with a fast-attack/slow-finish tempo, keyed to the
// visitor's weather and clock (heroVariant.ts). After the performance the
// painting idles — pointer movement stirs nearby strokes (wind + a warm
// dapple), and press-and-hold ghosts the underdrawing through (pentimento).
//
// The dab renderer MUST stay in sync with scripts/hero-brush.mjs drawStroke()
// — the committed final frames and replay previews are rendered by that code.

import { useEffect, useRef } from "react";
import { parseStrokes, type StrokeField } from "./heroStrokes";
import { pickVariant } from "./heroVariant";
import styles from "./HeroPainting.module.css";

const DPR_CAP = 2;
const FULL_MS = 5500;
const FAST_MS = 1500;
const TEMPO_K = 2.2;
const PLAYED_KEY = "heroPlayed.v1";
const HOLD_MS = 350;
const RELEASE_MS = 600;
const WIND_RADIUS = 120; // display px
const WIND_MAX_ACTIVE = 600;
const CITY_CAPTION = false; // optional flourish — Rob's call (HERO.md §3)

interface ActiveStroke {
  i: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  dapple: number;
}

export default function HeroPainting({ className }: { className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captionRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const boxMaybe = boxRef.current;
    const canvasMaybe = canvasRef.current;
    if (!boxMaybe || !canvasMaybe) return;
    const box: HTMLDivElement = boxMaybe;
    const canvas: HTMLCanvasElement = canvasMaybe;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d")!;
    let disposed = false;

    // ---- mutable player state ----
    let field: StrokeField | null = null;
    let colors: Uint8Array | null = null;
    let stamps: HTMLImageElement | null = null;
    let grainPattern: CanvasPattern | null = null;
    let under: HTMLImageElement | null = null;
    let underRequested = false;

    let accum: HTMLCanvasElement | null = null; // the pristine painting
    let tmp: HTMLCanvasElement | null = null; // pentimento mask scratch
    const scratch = document.createElement("canvas");
    scratch.width = 192;
    scratch.height = 96;
    const scratchCtx = scratch.getContext("2d")!;

    let dpr = 1;
    let view = { s: 1, ox: 0, oy: 0, w: 0, h: 0 }; // stroke-space -> device px
    let drawn = 0;
    let playing = false;
    let done = false;
    let t0: number | null = null;
    let durationMs = FULL_MS;
    let raf = 0;
    let visible = true;
    let pageVisible = !document.hidden;

    // atmosphere
    const active = new Map<number, ActiveStroke>();
    let cells: Map<number, number[]> | null = null; // stroke-space hash
    const CELL = 96;
    let pointer = { x: 0, y: 0, t: 0, down: false, downAt: 0, downX: 0, downY: 0, moved: false };
    let hold = 0; // pentimento progress 0..1
    let holdTarget = 0;
    let holdAt = { x: 0, y: 0 };
    let lastFrame = 0;

    // ------------------------------------------------------------------
    // geometry
    // ------------------------------------------------------------------

    function layout() {
      if (!field) return;
      const rect = box.getBoundingClientRect();
      dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1);
      const w = Math.max(2, Math.round(rect.width * dpr));
      const h = Math.max(2, Math.round(rect.height * dpr));
      const sizeChanged = Math.abs(w - view.w) > 48 * dpr || Math.abs(h - view.h) > 48 * dpr;
      if (!sizeChanged && accum) return;
      canvas.width = w;
      canvas.height = h;
      // cover-crop: desktop sees the full sweep, portrait crops to center
      const s = Math.max(w / field.width, h / field.height);
      view = { s, ox: (w - field.width * s) / 2, oy: (h - field.height * s) / 2, w, h };
      if (!accum) accum = document.createElement("canvas");
      accum.width = w;
      accum.height = h;
      // transparent ground: the page IS the paper, so the painting floats
      // and its stroke dissolve is the only boundary — no rectangle seam
      const a = accum.getContext("2d")!;
      a.clearRect(0, 0, w, h);
      // a resize mid- or post-performance repaints what's already drawn
      if (drawn > 0) drawRange(a, 0, drawn);
      composite();
    }

    // ------------------------------------------------------------------
    // stroke rendering (in sync with scripts/hero-brush.mjs)
    // ------------------------------------------------------------------

    function tintStamp(stampIdx: number, r: number, g: number, b: number) {
      if (!stamps) return;
      scratchCtx.clearRect(0, 0, 192, 96);
      scratchCtx.globalCompositeOperation = "source-over";
      scratchCtx.drawImage(stamps, stampIdx * 192, 0, 192, 96, 0, 0, 192, 96);
      scratchCtx.globalCompositeOperation = "source-in";
      scratchCtx.fillStyle = `rgb(${r},${g},${b})`;
      scratchCtx.fillRect(0, 0, 192, 96);
    }

    function drawStrokeAt(
      g: CanvasRenderingContext2D,
      i: number,
      offX = 0,
      offY = 0,
      lift = 0,
    ) {
      if (!field || !colors) return;
      const x = field.x[i] + offX;
      const y = field.y[i] + offY;
      const len = field.len[i];
      const wid = field.wid[i];
      const angle = field.ang[i];
      const bend = field.bend[i];
      const alpha = field.alpha[i];
      const vdrift = field.vdrift[i];
      const c = i * 3;
      let r = colors[c], gg = colors[c + 1], b = colors[c + 2];
      if (lift > 0) {
        // the dapple: a warm lightening that trails the pointer
        r = Math.min(255, r + (255 - r) * lift * 0.7 + lift * 14);
        gg = Math.min(255, gg + (255 - gg) * lift * 0.55);
        b = Math.min(255, b + (255 - b) * lift * 0.4);
      }

      const dx = Math.cos(angle), dy = Math.sin(angle);
      const nx = -dy, ny = dx;
      const half = len / 2;
      const bendPx = bend * len * 0.18;
      const p0x = x - dx * half, p0y = y - dy * half;
      const p1x = x + dx * half, p1y = y + dy * half;
      const cxp = x + nx * bendPx, cyp = y + ny * bendPx;
      const segs = len < wid * 2.2 ? 1 : len > wid * 3.5 ? 3 : 2;
      const segLen = segs === 1 ? len : (len / segs) * 1.25;

      for (let k = 0; k < segs; k++) {
        const t = (k + 0.5) / segs;
        const omt = 1 - t;
        const px = omt * omt * p0x + 2 * omt * t * cxp + t * t * p1x;
        const py = omt * omt * p0y + 2 * omt * t * cyp + t * t * p1y;
        const tx = 2 * omt * (cxp - p0x) + 2 * t * (p1x - cxp);
        const ty = 2 * omt * (cyp - p0y) + 2 * t * (p1y - cyp);
        const ta = Math.atan2(ty, tx);
        const drift = 1 + vdrift * 0.06 * (t - 0.5) * 2;
        tintStamp(
          field.stamp[i],
          Math.max(0, Math.min(255, Math.round(r * drift))),
          Math.max(0, Math.min(255, Math.round(gg * drift))),
          Math.max(0, Math.min(255, Math.round(b * drift))),
        );
        g.save();
        g.translate(view.ox + px * view.s, view.oy + py * view.s);
        g.rotate(ta);
        g.globalAlpha = alpha;
        g.drawImage(scratch, (-segLen / 2) * view.s, (-wid / 2) * view.s, segLen * view.s, wid * view.s);
        g.restore();
      }
    }

    function drawRange(g: CanvasRenderingContext2D, from: number, to: number) {
      for (let i = from; i < to; i++) drawStrokeAt(g, i);
    }

    // ------------------------------------------------------------------
    // compositing
    // ------------------------------------------------------------------

    function composite() {
      if (!accum) return;
      ctx.clearRect(0, 0, view.w, view.h);
      const needsMask = hold > 0.001 && under;
      if (needsMask && under) {
        // pentimento: underdrawing beneath (clipped to the reveal circle so
        // its paper never paints a rectangle), paint layer above with a soft
        // radial hole fading the strokes to ~25% around the held point
        const uw = under.width, uh = under.height;
        const s2 = Math.max(view.w / uw, view.h / uh);
        const R0 = 240 * dpr;
        ctx.save();
        ctx.beginPath();
        ctx.arc(holdAt.x, holdAt.y, R0, 0, Math.PI * 2);
        ctx.clip();
        ctx.globalAlpha = Math.min(1, hold * 1.4);
        ctx.drawImage(under, (view.w - uw * s2) / 2, (view.h - uh * s2) / 2, uw * s2, uh * s2);
        ctx.restore();
        if (!tmp) tmp = document.createElement("canvas");
        if (tmp.width !== view.w || tmp.height !== view.h) {
          tmp.width = view.w;
          tmp.height = view.h;
        }
        const m = tmp.getContext("2d")!;
        m.globalCompositeOperation = "source-over";
        m.clearRect(0, 0, view.w, view.h);
        m.drawImage(accum, 0, 0);
        const R = 240 * dpr;
        const grad = m.createRadialGradient(holdAt.x, holdAt.y, 0, holdAt.x, holdAt.y, R);
        grad.addColorStop(0, `rgba(0,0,0,${0.75 * hold})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        m.globalCompositeOperation = "destination-out";
        m.fillStyle = grad;
        m.fillRect(holdAt.x - R, holdAt.y - R, R * 2, R * 2);
        ctx.drawImage(tmp, 0, 0);
      } else {
        ctx.drawImage(accum, 0, 0);
      }
      // stirred strokes redraw over the composite with their offsets
      if (active.size > 0 && field) {
        ctx.save();
        for (const a of active.values()) {
          drawStrokeAt(ctx, a.i, a.ox, a.oy, a.dapple);
        }
        ctx.restore();
      }
      if (grainPattern && field) {
        // linen rides the paint only (source-atop) — bare ground stays page
        ctx.save();
        ctx.globalAlpha = field.grain;
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = grainPattern;
        ctx.fillRect(0, 0, view.w, view.h);
        ctx.restore();
      }
    }

    // ------------------------------------------------------------------
    // replay
    // ------------------------------------------------------------------

    function tempoCount(elapsed: number): number {
      if (!field) return 0;
      const tau = Math.min(1, elapsed / durationMs);
      return Math.round(field.count * (1 - Math.pow(1 - tau, TEMPO_K)));
    }

    function frame(t: number) {
      raf = 0;
      if (disposed || !field || !accum) return;
      const dt = lastFrame ? Math.min(0.05, (t - lastFrame) / 1000) : 0.016;
      lastFrame = t;

      if (playing && !done) {
        if (t0 === null) t0 = t;
        const target = tempoCount(t - t0);
        if (target > drawn) {
          const a = accum.getContext("2d")!;
          drawRange(a, drawn, target);
          drawn = target;
        }
        if (drawn >= field.count) {
          done = true;
          playing = false;
          try {
            sessionStorage.setItem(PLAYED_KEY, "1");
          } catch {
            /* ignore */
          }
          buildCells();
        }
      }

      stepAtmosphere(dt);
      composite();

      if ((playing && !done) || active.size > 0 || hold > 0.001 || holdTarget > 0) {
        schedule();
      }
    }

    function schedule() {
      if (!raf && visible && pageVisible && !disposed) raf = requestAnimationFrame(frame);
    }

    function resume() {
      if (playing && !done && field && t0 !== null) {
        // re-anchor the clock to current progress so a pause doesn't skip
        const tau = 1 - Math.pow(1 - drawn / field.count, 1 / TEMPO_K);
        t0 = performance.now() - tau * durationMs;
      }
      lastFrame = 0;
      schedule();
    }

    // ------------------------------------------------------------------
    // atmosphere (Phase 3)
    // ------------------------------------------------------------------

    function buildCells() {
      if (!field || reduced) return;
      cells = new Map();
      for (let i = field.washCount; i < field.count; i++) {
        const key =
          Math.floor(field.y[i] / CELL) * 64 + Math.floor(field.x[i] / CELL);
        let list = cells.get(key);
        if (!list) {
          list = [];
          cells.set(key, list);
        }
        list.push(i);
      }
    }

    function stir(px: number, py: number, vx: number, vy: number) {
      if (!field || !cells || !done || reduced) return;
      // pointer in stroke space
      const sx = (px - view.ox) / view.s;
      const sy = (py - view.oy) / view.s;
      const R = (WIND_RADIUS * dpr) / view.s;
      const speed = Math.min(60, Math.hypot(vx, vy));
      if (speed < 1) return;
      const nvx = vx / (speed || 1), nvy = vy / (speed || 1);
      const c0x = Math.floor((sx - R) / CELL), c1x = Math.floor((sx + R) / CELL);
      const c0y = Math.floor((sy - R) / CELL), c1y = Math.floor((sy + R) / CELL);
      for (let cy = c0y; cy <= c1y; cy++) {
        for (let cx = c0x; cx <= c1x; cx++) {
          const list = cells.get(cy * 64 + cx);
          if (!list) continue;
          for (const i of list) {
            const dx = field.x[i] - sx, dy = field.y[i] - sy;
            const d = Math.hypot(dx, dy);
            if (d > R) continue;
            if (active.size >= WIND_MAX_ACTIVE && !active.has(i)) continue;
            const fall = 1 - d / R;
            let a = active.get(i);
            if (!a) {
              a = { i, ox: 0, oy: 0, vx: 0, vy: 0, dapple: 0 };
              active.set(i, a);
            }
            const push = (speed / 60) * fall * (4 / view.s) * dpr;
            a.vx += nvx * push * 18;
            a.vy += nvy * push * 18;
            a.dapple = Math.min(0.5, a.dapple + fall * 0.12);
          }
        }
      }
      schedule();
    }

    function stepAtmosphere(dt: number) {
      // pentimento ease
      const speed = holdTarget > hold ? dt / 0.25 : dt / (RELEASE_MS / 1000);
      hold = holdTarget > hold ? Math.min(holdTarget, hold + speed) : Math.max(holdTarget, hold - speed);

      if (active.size === 0) return;
      const K = 90, C = 13;
      for (const a of active.values()) {
        a.vx += (-K * a.ox - C * a.vx) * dt;
        a.vy += (-K * a.oy - C * a.vy) * dt;
        a.ox += a.vx * dt * 8;
        a.oy += a.vy * dt * 8;
        a.dapple *= Math.pow(0.25, dt); // fades in ~1s
        if (
          Math.abs(a.ox) < 0.04 && Math.abs(a.oy) < 0.04 &&
          Math.abs(a.vx) < 0.04 && Math.abs(a.vy) < 0.04 &&
          a.dapple < 0.01
        ) {
          active.delete(a.i);
        }
      }
    }

    // ------------------------------------------------------------------
    // input
    // ------------------------------------------------------------------

    function canvasPoint(e: PointerEvent) {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr };
    }

    function onPointerMove(e: PointerEvent) {
      if (!done || reduced) return;
      const p = canvasPoint(e);
      const now = performance.now();
      const dt = pointer.t ? Math.max(8, now - pointer.t) : 16;
      const vx = ((p.x - pointer.x) / dt) * 16;
      const vy = ((p.y - pointer.y) / dt) * 16;
      if (pointer.down && Math.hypot(p.x - pointer.downX, p.y - pointer.downY) > 9 * dpr) {
        pointer.moved = true;
        holdTarget = 0;
      }
      pointer = { ...pointer, x: p.x, y: p.y, t: now };
      // wind only when the gesture is horizontal-ish on touch, always on mouse
      if (e.pointerType === "touch" && Math.abs(vy) > Math.abs(vx) * 1.6) return;
      stir(p.x, p.y, vx, vy);
    }

    function onPointerDown(e: PointerEvent) {
      if (!done || reduced) return;
      const p = canvasPoint(e);
      pointer = { ...pointer, down: true, downAt: performance.now(), downX: p.x, downY: p.y, moved: false, x: p.x, y: p.y };
      if (!underRequested) {
        underRequested = true;
        const img = new Image();
        img.src = "/hero/underdrawing.jpg";
        img.decode?.().catch(() => undefined);
        img.onload = () => {
          under = img;
        };
        if (img.complete) under = img;
      }
      window.setTimeout(() => {
        if (pointer.down && !pointer.moved && !disposed) {
          holdAt = { x: pointer.x, y: pointer.y };
          holdTarget = 1;
          schedule();
        }
      }, HOLD_MS);
    }

    function onPointerUp() {
      pointer.down = false;
      if (holdTarget > 0) {
        holdTarget = 0;
        schedule();
      }
    }

    // ------------------------------------------------------------------
    // boot
    // ------------------------------------------------------------------

    async function boot() {
      try {
        const [binRes, stampImg, grainImg] = await Promise.all([
          fetch("/hero/strokes.bin"),
          loadImage("/hero/brush-stamps.png"),
          loadImage("/hero/canvas-grain.png"),
        ]);
        if (disposed) return;
        field = parseStrokes(await binRes.arrayBuffer());
        stamps = stampImg;
        grainPattern = ctx.createPattern(grainImg, "repeat");

        // variant decided once, before the first stroke (bounded ~1.2s)
        const picked = await Promise.race([
          pickVariant(field.variants),
          new Promise<{ variant: string; city: string }>((res) =>
            setTimeout(() => res({ variant: "master", city: "" }), 1200),
          ),
        ]);
        if (disposed || !field) return;
        colors = field.colors[picked.variant] ?? field.colors.master;
        if (CITY_CAPTION && captionRef.current && picked.city) {
          captionRef.current.textContent = `Fig. 1 — The Buildout. Painted for ${picked.city}.`;
        }

        layout();

        if (reduced) {
          // instant final frame: no replay, no atmosphere. The .webp carries
          // alpha so the dissolve bleeds into the page like the live render.
          const v = picked.variant in field.colors ? picked.variant : "master";
          const final = await loadImage(`/hero/final-${v}.webp`).catch(() =>
            loadImage(`/hero/final-${v}.jpg`),
          );
          if (disposed || !accum) return;
          const a = accum.getContext("2d")!;
          const s2 = Math.max(view.w / final.width, view.h / final.height);
          a.drawImage(final, (view.w - final.width * s2) / 2, (view.h - final.height * s2) / 2, final.width * s2, final.height * s2);
          drawn = field.count;
          done = true;
          composite();
          return;
        }

        let played = false;
        try {
          played = sessionStorage.getItem(PLAYED_KEY) === "1";
        } catch {
          /* ignore */
        }
        durationMs = played ? FAST_MS : FULL_MS;
        playing = true;
        schedule();

        if (process.env.NODE_ENV !== "production") {
          (window as unknown as { __hero?: object }).__hero = {
            get drawn() {
              return drawn;
            },
            get done() {
              return done;
            },
            variant: picked.variant,
            count: field.count,
            skip() {
              if (!field || !accum) return;
              const a = accum.getContext("2d")!;
              drawRange(a, drawn, field.count);
              drawn = field.count;
              done = true;
              playing = false;
              buildCells();
              composite();
            },
          };
        }
      } catch (err) {
        // hero must never break the homepage: fall back to the final frame
        console.error("[hero]", err);
        try {
          const img = await loadImage("/hero/final-master.jpg");
          if (disposed) return;
          const rect = box.getBoundingClientRect();
          canvas.width = Math.round(rect.width * (window.devicePixelRatio || 1));
          canvas.height = Math.round(rect.height * (window.devicePixelRatio || 1));
          const s2 = Math.max(canvas.width / img.width, canvas.height / img.height);
          ctx.drawImage(img, (canvas.width - img.width * s2) / 2, (canvas.height - img.height * s2) / 2, img.width * s2, img.height * s2);
        } catch {
          /* paper canvas stays */
        }
      }
    }

    function loadImage(src: string): Promise<HTMLImageElement> {
      return new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
      });
    }

    // transparent before anything arrives — the page's own paper IS the
    // loading state; the first strokes arriving are the reveal
    canvas.width = 16;
    canvas.height = 9;
    ctx.clearRect(0, 0, 16, 9);

    const ro = new ResizeObserver(() => layout());
    ro.observe(box);
    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible) resume();
    });
    io.observe(box);
    const onVis = () => {
      pageVisible = !document.hidden;
      if (pageVisible) resume();
    };
    document.addEventListener("visibilitychange", onVis);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    void boot();

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  return (
    <div
      ref={boxRef}
      className={`${styles.box}${className ? ` ${className}` : ""}`}
      role="img"
      aria-label="Impressionist painting of an American city under construction — flags over scaffolding, an elevated train, and workers walking to the site. It paints itself when the page loads."
    >
      <canvas ref={canvasRef} className={styles.canvas} />
      {CITY_CAPTION && <span ref={captionRef} className={styles.caption} />}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.fallback}
          src="/hero/final-master.webp"
          alt="Impressionist painting of an American city under construction."
        />
      </noscript>
    </div>
  );
}
