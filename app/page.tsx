'use client';

import dynamic from 'next/dynamic';

const MinecraftGame = dynamic(() => import('@/components/MinecraftGame'), { ssr: false });

export default function Page() {
  return <MinecraftGame />;
}
