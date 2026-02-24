'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, RefreshCcw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('System Failure:', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-8 relative overflow-hidden">
      <div className="scanline" />
      
      <div className="z-10 text-center space-y-8 max-w-md">
        <div className="flex justify-center">
            <motion.div
                className="p-6 rounded-full bg-red-500/10 border border-red-500/20"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
            >
                <ShieldAlert size={48} className="text-red-500" />
            </motion.div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-black italic tracking-tighter uppercase">System Error</h1>
          <p className="text-white/40 font-mono text-[10px] tracking-[0.2em] uppercase leading-relaxed">
            A critical overflow has been detected. Core functions have been suspended to prevent data corruption.
          </p>
          <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg text-left overflow-hidden">
            <code className="text-[10px] text-red-400 font-mono break-all">{String(error.message) || 'UNKNOWN_EXCEPTION'}</code>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
                onClick={() => reset()}
                className="flex items-center justify-center gap-3 px-6 py-3 bg-neon-cyan text-black rounded-xl font-black transition-all hover:shadow-[0_0_20px_rgba(0,243,255,0.4)] uppercase text-xs tracking-widest"
            >
                <RefreshCcw size={16} /> Reboot
            </button>
            <button
                onClick={() => router.push('/')}
                className="flex items-center justify-center gap-3 px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all uppercase text-xs tracking-widest font-bold"
            >
                <Home size={16} /> Emergency Exit
            </button>
        </div>
      </div>

      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,0,0,0.05)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />
    </main>
  );
}
