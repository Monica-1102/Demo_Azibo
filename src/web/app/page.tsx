'use client';
import { Spin } from 'antd';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();
  useEffect(() => router.replace('/app/enquiries/'), [router]);
  return <Spin style={{ display: 'block', marginTop: 120 }} />;
}
