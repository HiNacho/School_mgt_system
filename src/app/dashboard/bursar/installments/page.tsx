'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InstallmentsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/bursar/fees');
  }, [router]);

  return null;
}
