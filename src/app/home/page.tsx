import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function HomePage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 md:px-16">
        <Link href="/" className="text-sm tracking-[0.3em] uppercase hover:opacity-60 transition-opacity">
          RW
        </Link>
        <div className="flex items-center gap-8 text-xs tracking-[0.2em] uppercase">
          <Link href="/home" className="hover:opacity-60 transition-opacity">
            Home
          </Link>
          <Link href="/home" className="hover:opacity-60 transition-opacity">
            Investing
          </Link>
          <Link href="/home" className="hover:opacity-60 transition-opacity">
            Projects
          </Link>
          <Link href="/home" className="hover:opacity-60 transition-opacity">
            About
          </Link>
        </div>
      </nav>

      {/* Hero section */}
      <section className="flex flex-col items-center justify-center px-8 pt-32 pb-24 text-center">
        <h1 className="text-4xl md:text-6xl font-light tracking-tight leading-tight max-w-2xl">
          Investing &amp; Building
        </h1>
        <p className="mt-6 text-sm tracking-wide opacity-50 max-w-md leading-relaxed">
          Exploring ideas at the intersection of technology, design, and capital.
        </p>
      </section>

      {/* Content grid placeholder */}
      <section className="px-8 md:px-16 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Card 1 */}
          <div
            className="group p-8 border transition-all duration-300 hover:shadow-md cursor-pointer"
            style={{ borderColor: "color-mix(in srgb, var(--foreground) 10%, transparent)" }}
          >
            <span className="text-xs tracking-[0.2em] uppercase opacity-40">
              Investing
            </span>
            <h3 className="mt-4 text-xl font-light">Portfolio & Thesis</h3>
            <p className="mt-3 text-sm opacity-50 leading-relaxed">
              A look at how I think about markets, allocations, and long-term value creation.
            </p>
            <span className="inline-block mt-6 text-xs tracking-[0.15em] uppercase opacity-40 group-hover:opacity-80 transition-opacity">
              Coming soon &rarr;
            </span>
          </div>

          {/* Card 2 */}
          <div
            className="group p-8 border transition-all duration-300 hover:shadow-md cursor-pointer"
            style={{ borderColor: "color-mix(in srgb, var(--foreground) 10%, transparent)" }}
          >
            <span className="text-xs tracking-[0.2em] uppercase opacity-40">
              Projects
            </span>
            <h3 className="mt-4 text-xl font-light">Things I&apos;m Building</h3>
            <p className="mt-3 text-sm opacity-50 leading-relaxed">
              Software, experiments, and side projects that push ideas forward.
            </p>
            <span className="inline-block mt-6 text-xs tracking-[0.15em] uppercase opacity-40 group-hover:opacity-80 transition-opacity">
              Coming soon &rarr;
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex items-center justify-center px-8 py-12 text-xs tracking-[0.15em] uppercase opacity-30">
        &copy; {new Date().getFullYear()} Robert Williams
      </footer>

      <ThemeToggle />
    </div>
  );
}
