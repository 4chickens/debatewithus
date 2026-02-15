'use client';

import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AvatarVisualizerProps {
    player: {
        name: string;
        volume: number;
    };
    side: 'left' | 'right';
}

export const AvatarVisualizer = ({ player, side }: AvatarVisualizerProps) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const color = side === 'left' ? '#ff007f' : '#00f3ff';
    const glowClass = side === 'left' ? 'shadow-[0_0_30px_#ff007f]' : 'shadow-[0_0_30px_#00f3ff]';
    const isSpeaking = player.volume > 0.01;

    return (
        <div className={`flex flex-col items-center gap-6 ${side === 'right' ? 'scale-x-1' : ''}`}>
            <div className="relative">
                {/* Speaking Rings */}
                {mounted && isSpeaking && (
                    <>
                        <motion.div
                            className="absolute inset-0 rounded-full border-2"
                            style={{ borderColor: color }}
                            animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                            transition={{ repeat: Infinity, duration: 0.8, ease: "easeOut" }}
                        />
                        <motion.div
                            className="absolute inset-0 rounded-full border-2"
                            style={{ borderColor: color }}
                            animate={{ scale: [1, 2.4], opacity: [0.3, 0] }}
                            transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut" }}
                        />
                    </>
                )}

                {/* Main Avatar Circle */}
                <motion.div
                    className={`relative w-28 h-28 rounded-full bg-black flex items-center justify-center overflow-hidden border-2 z-10 transition-shadow duration-300 ${isSpeaking ? glowClass : 'border-white/20'}`}
                    style={{
                        borderColor: isSpeaking ? color : 'rgba(255,255,255,0.2)',
                    }}
                    animate={{
                        scale: isSpeaking ? 1.05 + player.volume * 0.15 : 1
                    }}
                >
                    <User size={56} style={{ color: isSpeaking ? color : 'rgba(255,255,255,0.3)' }} />

                    {/* Integrated Visualizer Bars */}
                    <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1 h-6 items-end">
                        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <motion.div
                                key={i}
                                className="w-1 rounded-t-full"
                                style={{ backgroundColor: color }}
                                animate={{
                                    height: (mounted && isSpeaking) ? `${20 + (i * 10) % 60}%` : '10%'
                                }}
                                transition={{
                                    duration: 0.2,
                                    repeat: (mounted && isSpeaking) ? Infinity : 0,
                                    repeatType: "reverse"
                                }}
                            />
                        ))}
                    </div>
                </motion.div>

                {/* Status Indicator */}
                <motion.div
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-black z-20"
                    style={{ backgroundColor: isSpeaking ? '#39ff14' : '#666' }}
                    animate={isSpeaking ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                />
            </div>

            {/* Labeling */}
            <div className="text-center space-y-1">
                <div className={`text-[10px] font-mono font-black tracking-[0.2em] transition-colors ${isSpeaking ? 'text-white' : 'text-white/30'}`}>
                    {side === 'left' ? 'HOST_V01' : 'GUEST_V02'}
                </div>
                <div
                    className="text-2xl font-black italic tracking-tighter glitch-text"
                    data-text={player.name}
                    style={{ color: isSpeaking ? 'white' : 'rgba(255,255,255,0.5)' }}
                >
                    {player.name}
                </div>
            </div>
        </div>
    );
};
