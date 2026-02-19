'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
    const router = useRouter();

    return (
        <main className="min-h-screen bg-black text-white flex items-center justify-center p-8 relative overflow-hidden">
            <div className="scanline" />
            
            <div className="z-10 text-center space-y-8">
                <div className="relative inline-block">
                    <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 4 }}
                    >
                        <AlertCircle size={80} className="text-neon-pink opacity-20" />
                    </motion.div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl font-black italic tracking-tighter">404</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-4xl font-black italic tracking-tighter uppercase">Signal Lost</h1>
                    <p className="text-white/40 font-mono text-xs tracking-[0.3em] uppercase max-w-xs mx-auto">
                        The requested sector does not exist in the current timeline.
                    </p>
                </div>

                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 hover:border-neon-cyan/50 rounded-xl transition-all mx-auto group"
                >
                    <ArrowLeft size={20} className="text-neon-cyan group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs font-bold tracking-widest uppercase">Return to Arena</span>
                </button>
            </div>

            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,0,127,0.05)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />
        </main>
    );
}
