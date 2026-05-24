import { getStoredToken } from '@/lib/strava';
import { redirect } from 'next/navigation';

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const token = await getStoredToken();
  if (token) redirect('/runs');

  const { error } = await searchParams;

  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="text-center space-y-8 max-w-md">
        <div>
          <div className="text-6xl mb-4">🏃</div>
          <h1 className="text-3xl font-bold text-stone-900">Running Dashboard</h1>
          <p className="text-stone-500 mt-2">Connect your Strava account to view your runs, stats, and personal bests.</p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
            {error === 'access_denied' ? 'Access was denied.' : 'Authentication failed. Please try again.'}
          </p>
        )}

        <a
          href="/api/auth"
          className="inline-flex items-center gap-3 px-6 py-3 bg-[#FC4C02] text-white font-semibold rounded-2xl hover:bg-[#e04400] transition-colors shadow-sm"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          Connect with Strava
        </a>
      </div>
    </main>
  );
}
