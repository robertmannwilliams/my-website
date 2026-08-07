"use client";

// Beat 2.8 — hold 60 Hz through the evening ramp, once, by hand. Battery
// responds instantly but drains; the peaker takes ten seconds to spin up.
// No score, no timer pressure — "failure" is a red annotation and a retry
// (GRID-DESIGN widget rules). Reduced motion gets the static end-state.
// Response-time magnitudes per NREL/ISO primers; numbers illustrative.

import { useEffect, useRef, useState } from "react";

const TICK_MS = 100;
const SCENARIO_S = 35;
const BATTERY_CHARGES = 3;
const BATTERY_BOOST = 0.3;
const BATTERY_SECONDS = 6;
const PEAKER_BOOST = 0.85;
const PEAKER_SPINUP_S = 10;
const BASE_SUPPLY = 0.18;
const FAIL_HZ = 59.85;

type Phase = "idle" | "running" | "failed" | "done";

interface Sim {
  t: number;
  hz: number;
  batteryLeft: number;
  batteryUntil: number;
  peakerAt: number | null; // t when spin-up completes
}

const fresh = (): Sim => ({
  t: 0,
  hz: 60,
  batteryLeft: BATTERY_CHARGES,
  batteryUntil: 0,
  peakerAt: null,
});

export default function Hold60() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [sim, setSim] = useState<Sim>(fresh);
  const [reduced, setReduced] = useState(false);
  const timer = useRef<number | null>(null);
  const lastTick = useRef<number>(0);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (phase !== "running") {
      if (timer.current) window.clearInterval(timer.current);
      timer.current = null;
      return;
    }
    lastTick.current = performance.now();
    timer.current = window.setInterval(() => {
      // Advance by measured wall time (clamped) so throttled timers —
      // background tabs, low-power mode — slow the tick rate, not the game.
      const now = performance.now();
      // Clamp covers 1 Hz background-throttled timers without letting a
      // long-suspended tab lurch the sim by minutes on resume.
      const dt = Math.min(1.2, (now - lastTick.current) / 1000);
      lastTick.current = now;
      setSim((prev) => {
        const t = prev.t + dt;
        // Starts balanced against BASE_SUPPLY, then the ramp pulls ahead —
        // the dial sags immediately and only dispatch closes the gap.
        const demand = BASE_SUPPLY + (t / SCENARIO_S) * (1 - BASE_SUPPLY);
        let supply = BASE_SUPPLY;
        if (t < prev.batteryUntil) supply += BATTERY_BOOST;
        if (prev.peakerAt != null && t >= prev.peakerAt) supply += PEAKER_BOOST;
        const hz = prev.hz + (supply - demand) * 0.21 * dt;
        return { ...prev, t, hz: Math.min(60.3, hz) };
      });
    }, TICK_MS);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "running") return;
    if (sim.hz <= FAIL_HZ) setPhase("failed");
    else if (sim.t >= SCENARIO_S) setPhase("done");
  }, [sim, phase]);

  const start = () => {
    setSim(fresh());
    setPhase("running");
  };
  const fireBattery = () => {
    if (phase !== "running" || sim.batteryLeft <= 0) return;
    setSim((p) => ({
      ...p,
      batteryLeft: p.batteryLeft - 1,
      batteryUntil: p.t + BATTERY_SECONDS,
    }));
  };
  const firePeaker = () => {
    if (phase !== "running" || sim.peakerAt != null) return;
    setSim((p) => ({ ...p, peakerAt: p.t + PEAKER_SPINUP_S }));
  };

  // Dial geometry: 59.7–60.3 Hz over a 150° arc.
  const frac = Math.max(0, Math.min(1, (sim.hz - 59.7) / 0.6));
  const angle = (-165 + frac * 150) * (Math.PI / 180);
  const needle = {
    x: 110 + 78 * Math.cos(angle),
    y: 100 + 78 * Math.sin(angle),
  };
  const peakerSpinning =
    sim.peakerAt != null && sim.t < sim.peakerAt;

  if (reduced) {
    return (
      <div className="grid-widget" data-widget="hold-60">
        <p className="grid-widget-note">
          The dial reads 60.00. Supply met demand this second, as it must every
          second; when the evening ramp pulls the number low, the control
          room's computer restores it — every four seconds, forever. (The
          interactive version of this instrument respects your reduced-motion
          setting.)
        </p>
      </div>
    );
  }

  return (
    <div className="grid-widget" data-widget="hold-60">
      <svg viewBox="0 0 220 118" role="img" aria-label={`Frequency ${sim.hz.toFixed(2)} hertz`}>
        <path d="M 34.6 79.7 A 78 78 0 0 1 185.4 79.7" className="grid-dial-arc" />
        {[59.7, 59.85, 60, 60.15, 60.3].map((hz) => {
          const f = (hz - 59.7) / 0.6;
          const a = (-165 + f * 150) * (Math.PI / 180);
          return (
            <g key={hz}>
              <line
                x1={110 + 70 * Math.cos(a)}
                y1={100 + 70 * Math.sin(a)}
                x2={110 + 78 * Math.cos(a)}
                y2={100 + 78 * Math.sin(a)}
                className="grid-dial-tick"
              />
              <text
                x={110 + 60 * Math.cos(a)}
                y={100 + 60 * Math.sin(a) + 3}
                textAnchor="middle"
                className="grid-duck-tick"
              >
                {hz === 60 ? "60" : hz.toFixed(2).slice(-2)}
              </text>
            </g>
          );
        })}
        <line x1={110} y1={100} x2={needle.x} y2={needle.y} className="grid-dial-needle" data-low={sim.hz < 59.93 || undefined} />
        <circle cx={110} cy={100} r={3} className="grid-dial-hub" />
        <text x={110} y={114} textAnchor="middle" className="grid-dial-readout">
          {sim.hz.toFixed(2)} Hz
        </text>
      </svg>

      {phase === "idle" && (
        <button type="button" className="grid-widget-btn" onClick={start}>
          START THE EVENING RAMP
        </button>
      )}

      {phase === "running" && (
        <div className="grid-widget-btnrow">
          <button
            type="button"
            className="grid-widget-btn"
            onClick={fireBattery}
            disabled={sim.batteryLeft <= 0}
          >
            BATTERY ({sim.batteryLeft}) — instant, brief
          </button>
          <button
            type="button"
            className="grid-widget-btn"
            onClick={firePeaker}
            disabled={sim.peakerAt != null}
          >
            {peakerSpinning
              ? `PEAKER SPINNING UP… ${Math.max(0, sim.peakerAt! - sim.t).toFixed(0)}s`
              : sim.peakerAt != null
                ? "PEAKER ONLINE"
                : "PEAKER — 10 s spin-up, lasting"}
          </button>
        </div>
      )}

      {phase === "failed" && (
        <div className="grid-widget-verdict" data-failed>
          <p>
            {FAIL_HZ.toFixed(2)} Hz. At 59.4, machines start disconnecting to
            save themselves — that cascade is what a blackout is.
          </p>
          <button type="button" className="grid-widget-btn" onClick={start}>
            TRY AGAIN
          </button>
        </div>
      )}

      {phase === "done" && (
        <div className="grid-widget-verdict">
          <p>
            You held it for thirty-five seconds. The control room's computer
            does this every four seconds. Forever.
          </p>
          <button type="button" className="grid-widget-btn" onClick={start}>
            RUN IT AGAIN
          </button>
        </div>
      )}

      <p className="grid-widget-note">
        Illustrative instrument. The evening ramp raises demand; you dispatch a
        battery (instant, drains fast) or a peaker (slow to start, then steady).
      </p>
    </div>
  );
}
