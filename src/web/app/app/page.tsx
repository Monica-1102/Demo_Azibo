'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AppHome() {
  const router = useRouter();
  useEffect(() => router.replace('/app/enquiries/'), [router]);
  return null;
}
