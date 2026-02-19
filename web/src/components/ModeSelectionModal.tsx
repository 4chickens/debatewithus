'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Users, Trophy, X, ChevronRight, Mic, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface ModeSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    topicId: string;
}

export default function ModeSelectionModal({ isOpen, onClose, topicId }: ModeSelectionModalProps) {
    const router = useRouter();
    const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [inputMode, setInputMode] = useState<'voice' | 'chat'>('voice');

    const modeConfigs = {
        ai: {
            icon: <Bot size={24} className="text-neon-purple" />,
            bg: 'bg-neon-purple/10',
            border: 'border-neon-purple/30',
            text: 'text-neon-purple',
            shadow: 'shadow-[0_0_15px_rgba(188,19,254,0.2)]'
        },
        casual: {
            icon: <Users size={24} className="text-neon-cyan" />,
            bg: 'bg-neon-cyan/10',
            border: 'border-neon-cyan/30',
            text: 'text-neon-cyan',
            shadow: 'shadow-[0_0_15px_rgba(0,243,255,0.2)]'
        },
        ranked: {
            icon: <Trophy size={24} className="text-neon-pink" />,
            bg: 'bg-neon-pink/10',
            border: 'border-neon-pink/30',
            text: 'text-neon-pink',
            shadow: 'shadow-[0_0_15px_rgba(255,0,127,0.2)]'
        }
    };

    const modes = [
        {
            id: 'ai' as const,
            name: 'VS AI BOT',
            description: 'Practice your arguments against our advanced linguistic AI.',
            action: () => router.push(`/arena/${topicId}?mode=ai&difficulty=${aiDifficulty}&inputMode=${inputMode}`)
        },
        {
            id: 'casual' as const,
            name: 'CASUAL BATTLE',
            description: 'Enter the arena and wait for a human opponent.',
            action: () => router.push(`/arena/${topicId}?mode=casual&inputMode=${inputMode}`)
        },
        {
            id: 'ranked' as const,
            name: 'RANKED ARENA',
            description: 'Compete for MMR and climb the global leaderboards.',
            action: () => router.push(`/arena/${topicId}?mode=ranked&inputMode=${inputMode}`)
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-2xl bg-black border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-purple via-neon-cyan to-neon-pink" />
                        
                        <div className="p-8 space-y-8">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-3xl font-black italic tracking-tighter uppercase">CHOOSE MODE</h2>
                                    <p className="text-white/40 font-mono text-[10px] tracking-[0.3em] uppercase">Select your path to victory</p>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Input Mode Selector */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] ml-1">Transmission Format</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => setInputMode('voice')}
                                        className={`flex items-center justify-center gap-3 p-4 rounded-2xl border transition-all ${inputMode === 'voice' ? 'bg-neon-cyan/10 border-neon-cyan text-neon-cyan shadow-[0_0_20px_rgba(0,243,255,0.2)]' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                                    >
                                        <Mic size={20} />
                                        <div className="text-left">
                                            <p className="text-xs font-bold uppercase">Neural Voice</p>
                                            <p className="text-[8px] font-mono uppercase opacity-50">Real-time Stream</p>
                                        </div>
                                    </button>
                                    <button 
                                        onClick={() => setInputMode('chat')}
                                        className={`flex items-center justify-center gap-3 p-4 rounded-2xl border transition-all ${inputMode === 'chat' ? 'bg-neon-pink/10 border-neon-pink text-neon-pink shadow-[0_0_20px_rgba(255,0,127,0.2)]' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                                    >
                                        <MessageSquare size={20} />
                                        <div className="text-left">
                                            <p className="text-xs font-bold uppercase">Tactical Chat</p>
                                            <p className="text-[8px] font-mono uppercase opacity-50">Keyboard Combat</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {modes.map((mode) => {
                                    const config = modeConfigs[mode.id];
                                    return (
                                        <div key={mode.id} className="space-y-4">
                                            <button
                                                onClick={mode.id === 'ai' ? undefined : mode.action}
                                                className={`w-full group relative flex items-center gap-6 p-6 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all text-left overflow-hidden ${mode.id === 'ai' ? 'cursor-default' : ''}`}
                                            >
                                                <div className={`p-4 rounded-xl ${config.bg} border ${config.border} group-hover:scale-110 transition-transform`}>
                                                    {config.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className={`text-lg font-bold tracking-tight group-hover:text-white transition-colors`}>{mode.name}</h3>
                                                    <p className="text-white/40 text-xs">{mode.description}</p>
                                                </div>
                                                {mode.id !== 'ai' && (
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ChevronRight className={config.text} />
                                                    </div>
                                                )}
                                            </button>

                                            {mode.id === 'ai' && (
                                                <div className="flex items-center gap-4 px-6 pb-2">
                                                    <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Difficulty:</div>
                                                    <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                                                        {(['easy', 'medium', 'hard'] as const).map((d) => (
                                                            <button
                                                                key={d}
                                                                onClick={() => setAiDifficulty(d)}
                                                                className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
                                                                    aiDifficulty === d 
                                                                    ? 'bg-neon-purple text-white shadow-[0_0_15px_rgba(188,19,254,0.4)]' 
                                                                    : 'text-white/40 hover:text-white/60'
                                                                }`}
                                                            >
                                                                {d}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <button 
                                                        onClick={mode.action}
                                                        className="ml-auto px-6 py-2 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/50 rounded-lg text-neon-purple font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
                                                    >
                                                        START SESSION
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
