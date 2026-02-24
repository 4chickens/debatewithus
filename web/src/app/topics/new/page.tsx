'use client';

import dynamic from 'next/dynamic';

const NewTopicClientPage = dynamic(() => import('@/components/topics/NewTopicClientPage'), { ssr: false });

export default function NewTopicPage() {
  return <NewTopicClientPage />;
}