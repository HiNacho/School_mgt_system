'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BursarMainPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/bursar/fees');
  }, [router]);

  return (
    <div className="min-h-96 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-4 border-t-emerald-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Redirecting to Bursar Hub...</p>
      </div>
    </div>
  );
}
