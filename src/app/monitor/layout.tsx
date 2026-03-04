import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Global Monitor | Robert Williams',
  description:
    'Real-time global monitoring dashboard — geopolitical events, prediction markets, earthquakes, and market data.',
  openGraph: {
    title: 'Global Monitor | Robert Williams',
    description: 'Real-time global monitoring dashboard.',
    type: 'website',
  },
};

export default function MonitorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
      />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
