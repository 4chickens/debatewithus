'use client';

import dynamic from 'next/dynamic';

const AuthClientPage = dynamic(() => import('@/components/auth/AuthClientPage'), { ssr: false });

export default function AuthPage() {
  return <AuthClientPage />;
}