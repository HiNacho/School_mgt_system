'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReceiptsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/bursar/payments');
  }, [router]);

  return null;
}
