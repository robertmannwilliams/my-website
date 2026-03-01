"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const ParticleField = dynamic(() => import("@/components/ParticleField"), {
  ssr: false,
});

export default function LandingPage() {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      {/* Particle background */}
      <ParticleField />

      {/* Top branding */}
      <header className="relative z-10 pt-12 animate-fade-in-up">
        <h1 className="text-sm tracking-[0.35em] uppercase">
          Robert Williams
        </h1>
      </header>

      {/* Center area - intentionally sparse, particles are the focus */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        {/* Optional subtle tagline */}
      </div>

      {/* Enter button */}
      <footer className="relative z-10 pb-16 animate-fade-in-up animate-delay-1000">
        <Link href="/home">
          <button className="enter-btn">
            <span>Enter</span>
          </button>
        </Link>
      </footer>

      <ThemeToggle />
    </div>
  );
}
