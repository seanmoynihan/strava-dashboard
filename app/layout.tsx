import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { getStoredToken, getAthlete } from '@/lib/strava';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'Running Dashboard',
  description: 'Your Strava running stats',
};

const NAV = [
  { href: '/runs', label: 'Runs' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/stats', label: 'Stats' },
  { href: '/bests', label: 'Bests' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const token = getStoredToken();
  const athlete = token ? getAthlete() : null;

  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-stone-50 font-sans">
        {token && (
          <header className="sticky top-0 z-40 bg-white border-b border-stone-200">
            <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-lg mr-3">🏃</span>
                {NAV.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                  >
                    {n.label}
                  </Link>
                ))}
              </div>
              {athlete && (
                <div className="flex items-center gap-2">
                  {athlete.profile && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={athlete.profile} alt="" className="w-7 h-7 rounded-full" />
                  )}
                  <span className="text-sm text-stone-600">{athlete.firstname}</span>
                </div>
              )}
            </div>
          </header>
        )}
        <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
