'use client';

import { motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';

export const MomentumMeter = () => {
    const momentum = useGameStore((state) => state.momentum);

    // momentum: 0 (Player 1 dominant) to 100 (Player 2 dominant)
    // center is 50

    return (
        <div className="relative w-full max-w-2xl h-10 bg-black rounded-sm overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(0,0,0,1)]">
            {/* Background Static */}
            <div className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, #ffffff10 1px, transparent 0)',
                    backgroundSize: '8px 8px'
                }}
            />

            {/* Background Glows */}
            <div className="absolute inset-0 flex pointer-events-none">
                <div className="w-1/2 h-full bg-neon-pink/10 blur-xl" />
                <div className="w-1/2 h-full bg-neon-cyan/10 blur-xl" />
            </div>

            {/* Center Notch */}
            <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white/40 z-30 -translate-x-1/2 shadow-[0_0_10px_white]" />

            {/* Player 1 Bar (Pink) */}
            <motion.div
                className="absolute h-full z-10"
                initial={false}
                animate={{
                    left: 0,
                    width: `${momentum}%`,
                }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                style={{ backgroundColor: '#ff007f' }} // Using hex to ensure motion handles it well
            >
                <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-white shadow-[0_0_15px_#fff] z-20" />
            </motion.div>

            {/* Player 2 Bar (Cyan) */}
            <motion.div
                className="absolute h-full right-0 z-10"
                initial={false}
                animate={{
                    width: `${100 - momentum}%`,
                }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                style={{ backgroundColor: '#00f3ff' }}
            />

            {/* Dynamic Labels */}
            <div className="absolute inset-x-6 inset-y-0 flex justify-between items-center text-[9px] font-black tracking-[0.3em] pointer-events-none z-40 uppercase">
                <motion.span 
                    animate={{ opacity: momentum < 40 ? 1 : 0.3 }}
                    className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]"
                >
                    Advantage_P1
                </motion.span>
                <motion.span 
                    animate={{ opacity: momentum > 60 ? 1 : 0.3 }}
                    className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]"
                >
                    Advantage_P2
                </motion.span>
            </div>
        </div>
    );
};
