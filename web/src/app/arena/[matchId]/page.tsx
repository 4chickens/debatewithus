'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { MomentumMeter } from '@/components/MomentumMeter';
import { AvatarVisualizer } from '@/components/AvatarVisualizer';
import { Timer, Zap, Mic, MicOff, Home } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { API_URL } from '@/config';

export default function ArenaPage() {
    const { matchId } = useParams();
    const searchParams = useSearchParams();
    const mode = searchParams.get('mode') || 'casual';
    const difficulty = searchParams.get('difficulty') || 'medium';

    const { momentum, player1, player2, phase, timeLeft, setMomentum, setTimeLeft, updateVolume, setPhase } = useGameStore();
    const [isMuted, setIsMuted] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [lastDelta, setLastDelta] = useState<number | null>(null);
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [message, setMessage] = useState('');
    const [topic, setTopic] = useState({ title: 'LOADING TOPIC...', description: '' });
    const socketRef = useRef<Socket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // 1. Initialize Socket Connection
    useEffect(() => {
        const socket = io(API_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to game engine');
            socket.emit('join_match', { matchId, mode, difficulty, inputMode });
        });

        socket.on('game_init', (data: { momentum: number, phase: string, topic: any }) => {
            setMomentum(data.momentum);
            setPhase(data.phase as any);
            setTopic(data.topic);
        });

        socket.on('game_update', (data: { momentum: number, transcript?: string, lastDelta?: number, phase?: string, timeLeft?: number, topic?: any }) => {
            if (data.momentum !== undefined) setMomentum(data.momentum);
            
            if (data.transcript) {
                // If it's AI, show typing simulation
                if (data.transcript.startsWith('[AI]')) {
                    setIsAiTyping(true);
                    setTimeout(() => {
                        setTranscript(data.transcript!);
                        setIsAiTyping(false);
                    }, 2000);
                } else {
                    // For human messages (voice or chat), show immediately
                    setTranscript(data.transcript);
                }
            }

            if (data.lastDelta !== undefined) {
                setLastDelta(data.lastDelta);
                if (Math.abs(data.lastDelta) > 5) triggerShake();
                setTimeout(() => setLastDelta(null), 3000);
            }
            if (data.phase) setPhase(data.phase as any);
            if (data.timeLeft !== undefined) setTimeLeft(data.timeLeft);
            if (data.topic) setTopic(data.topic);
        });

        socket.on('phase_transition', (data: { phase: string, timeLeft: number }) => {
            setPhase(data.phase as any);
            setTimeLeft(data.timeLeft);
            triggerShake();
        });

        return () => {
            socket.disconnect();
        };
    }, [matchId, mode, difficulty, inputMode, setMomentum, setPhase, setTimeLeft]);

    // 2. Real-time Audio Streaming & Analysis (Only if in voice mode)
    useEffect(() => {
        if (inputMode !== 'voice') return;

        const isMyTurn = phase.includes('P1') || phase === 'Crossfire';
        
        if (!isMyTurn && phase !== 'Lobby' && phase !== 'Results') {
            setIsMuted(true);
        } else if (isMyTurn) {
            setIsMuted(false);
        }

        if (isMuted || phase === 'Lobby' || phase === 'Results') {
            mediaRecorderRef.current?.stop();
            return;
        }

        async function startStreaming() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const analyser = audioContext.createAnalyser();
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);
                analyser.fftSize = 256;
                const dataArray = new Uint8Array(analyser.frequencyBinCount);

                const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                mediaRecorderRef.current = mediaRecorder;

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0 && socketRef.current?.connected) {
                        analyser.getByteFrequencyData(dataArray);
                        const volume = dataArray.reduce((p, c) => p + c, 0) / dataArray.length / 255;

                        socketRef.current.emit('audio_chunk', {
                            matchId: matchId,
                            chunk: event.data,
                            volume: volume
                        });

                        updateVolume(1, volume);
                    }
                };

                mediaRecorder.start(100);
            } catch (err) {
                console.error('Audio capture failed:', err);
            }
        }

        startStreaming();

        return () => {
            mediaRecorderRef.current?.stop();
        };
    }, [isMuted, updateVolume, inputMode, phase, matchId]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !socketRef.current) return;

        socketRef.current.emit('chat_message', {
            matchId: matchId,
            text: message
        });
        
        setMessage('');
    };

    // 2. Mock Game Timer
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, [setTimeLeft]);

    // 3. Emit momentum changes to server (for demo purposes)
    const handleMomentumChange = (val: number) => {
        setMomentum(val);
        socketRef.current?.emit('momentum_update', { matchId: 'mock-match-id', momentum: val });
    };

    // Handle "Momentum Damage" Shake Effect
    const triggerShake = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
    };

    const getPhaseLabel = (p: string) => {
        const labels: Record<string, string> = {
            Lobby: 'Waiting for Ready',
            Opening_P1: 'P1 Opening Statement',
            Opening_P2: 'P2 Opening Statement',
            Rebuttal_P1: 'P1 Rebuttal',
            Rebuttal_P2: 'P2 Rebuttal',
            Crossfire: 'Direct Crossfire',
            Closing_P1: 'P1 Closing Argument',
            Closing_P2: 'P2 Closing Argument',
            Results: 'Match Results'
        };
        return labels[p] || p;
    };

    return (
        <main className="min-h-screen bg-black text-white relative flex flex-col items-center justify-between p-8 overflow-hidden">
            {/* Background Effects */}
            <div className="scanline" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,243,255,0.05)_0%,rgba(0,0,0,0)_70%)]" />

            {/* Header Info */}
            <div className="z-20 w-full max-w-5xl flex justify-between items-start">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-neon-cyan text-[10px] font-mono tracking-widest uppercase">Match ID: #{matchId?.toString().slice(-5)}</span>
                        <span className={`px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[8px] font-mono uppercase font-bold ${inputMode === 'voice' ? 'text-neon-cyan' : 'text-neon-pink'}`}>
                            {inputMode === 'voice' ? 'NEURAL_VOICE' : 'TACTICAL_CHAT'}
                        </span>
                        {mode === 'ai' && (
                            <span className="px-2 py-0.5 bg-neon-purple/20 border border-neon-purple/50 rounded text-[8px] font-mono text-neon-purple uppercase font-bold animate-pulse">
                                VS AI // {difficulty}
                            </span>
                        )}
                    </div>
                    <h1 className="text-3xl font-black italic tracking-tighter glitch-text" data-text="THE ARENA">THE ARENA</h1>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-6 py-2 rounded-full backdrop-blur-xl shadow-[0_0_20px_rgba(255,0,127,0.2)]">
                            <Timer className="text-neon-pink w-4 h-4 animate-pulse" />
                            <span className="font-mono text-2xl font-bold tracking-tighter">{timeLeft}s</span>
                        </div>
                        <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest text-center">
                            {getPhaseLabel(phase)}
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className={`p-3 rounded-full border transition-all ${isMuted ? 'border-neon-pink bg-neon-pink/10 text-neon-pink shadow-[0_0_15px_var(--neon-pink)]' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                    >
                        {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="p-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
                    >
                        <Home size={20} />
                    </button>
                </div>
            </div>

            <motion.div
                className="z-20 w-full max-w-6xl flex justify-around items-center gap-8 py-12"
                animate={isShaking ? { x: [-10, 10, -5, 5, 0] } : {}}
                transition={{ duration: 0.4 }}
            >
                <div className="relative">
                    <AvatarVisualizer player={player1} side="left" />
                    {(phase.includes('P1') || phase === 'Crossfire') && phase !== 'Results' && phase !== 'Lobby' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-neon-cyan text-black text-[8px] font-black uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(0,243,255,0.5)]"
                        >
                            Speaking
                        </motion.div>
                    )}
                </div>

                <div className="flex-1 flex flex-col items-center gap-12">
                    {/* Topic Display */}
                    <div className="text-center space-y-2 max-w-sm">
                        <h2 className="text-neon-cyan text-xl font-black tracking-tight">{topic.title}</h2>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">
                            {topic.description}
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                            <Zap className={`text-yellow-400 ${lastDelta !== null ? 'animate-bounce scale-150' : 'animate-pulse'}`} />
                            {lastDelta !== null && (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`text-lg font-black font-mono ${lastDelta > 0 ? 'text-neon-cyan' : 'text-neon-pink'}`}
                                >
                                    {lastDelta > 0 ? `+${lastDelta}` : lastDelta}
                                </motion.span>
                            )}
                        </div>
                        <span className="text-[10px] font-bold tracking-[0.2em] text-white/60">MOMENTUM_BALANCE</span>
                    </div>
                    <MomentumMeter />

                    {/* Live Transcript Bubble */}
                    <div className="min-h-[80px] flex flex-col items-center justify-center">
                        <AnimatePresence mode="wait">
                            {isAiTyping ? (
                                <motion.div
                                    key="typing"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="flex items-center gap-3 px-4 py-2 bg-neon-purple/10 border border-neon-purple/30 rounded-full"
                                >
                                    <div className="flex gap-1">
                                        <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-neon-purple rounded-full" />
                                        <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-neon-purple rounded-full" />
                                        <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-neon-purple rounded-full" />
                                    </div>
                                    <span className="text-[10px] font-mono text-neon-purple uppercase tracking-widest font-bold">AI IS ANALYZING...</span>
                                </motion.div>
                            ) : transcript ? (
                                <motion.div
                                    key={transcript}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`p-4 rounded-xl backdrop-blur-md max-w-md text-center border ${transcript.startsWith('[AI]')
                                            ? 'bg-neon-purple/10 border-neon-purple/50 shadow-[0_0_20px_rgba(188,19,254,0.2)]'
                                            : 'bg-white/5 border-white/10'
                                        }`}
                                >
                                    <p className={`text-xs font-mono leading-relaxed ${transcript.startsWith('[AI]') ? 'text-neon-purple' : 'text-cyan-400'}`}>
                                        {transcript}
                                    </p>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="relative">
                    <AvatarVisualizer player={player2} side="right" />
                    {(phase.includes('P2') || phase === 'Crossfire') && phase !== 'Results' && phase !== 'Lobby' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-neon-pink text-black text-[8px] font-black uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(255,0,127,0.5)]"
                        >
                            Speaking
                        </motion.div>
                    )}
                </div>
            </motion.div>

            {/* UI Dashboard */}
            <div className="z-20 w-full max-w-xl bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-xl flex flex-col gap-6">
                {inputMode === 'chat' ? (
                    <form onSubmit={handleSendMessage} className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] font-mono text-neon-cyan uppercase tracking-[0.2em]">
                                { (phase.includes('P1') || phase === 'Crossfire') ? 'Tactical Input Active' : 'Waiting for Turn' }
                            </label>
                            { (phase.includes('P1') || phase === 'Crossfire') && (
                                <span className="flex gap-1">
                                    <span className="w-1 h-1 bg-neon-cyan rounded-full animate-ping" />
                                    <span className="text-[8px] font-mono text-neon-cyan animate-pulse">READY</span>
                                </span>
                            )}
                        </div>
                        <div className="relative group">
                            <input 
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                disabled={!(phase.includes('P1') || phase === 'Crossfire')}
                                placeholder={(phase.includes('P1') || phase === 'Crossfire') ? "Type your argument..." : "Systems locked during opponent turn"}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-6 pr-16 focus:outline-none focus:border-neon-cyan/50 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <button 
                                type="submit"
                                disabled={!message.trim() || !(phase.includes('P1') || phase === 'Crossfire')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-neon-cyan text-black rounded-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-0 disabled:scale-90"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <label className="text-xs font-mono text-white/60 uppercase tracking-widest">
                                Neural Audio Feed
                            </label>
                            <span className="text-neon-cyan font-mono font-bold">{momentum}%</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 h-1.5 bg-gray-800 rounded-lg overflow-hidden relative shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                                <motion.div 
                                    className="absolute top-0 left-0 h-full bg-neon-cyan shadow-[0_0_10px_var(--neon-cyan)]"
                                    animate={{ width: `${momentum}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={triggerShake}
                        className="py-3 px-4 rounded-lg bg-neon-pink/20 border border-neon-pink/50 text-neon-pink text-[10px] font-black hover:bg-neon-pink/30 transition-all uppercase tracking-widest shadow-lg active:scale-95"
                    >
                        Impact Shockwave
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="py-3 px-4 rounded-lg bg-white/5 border border-white/10 text-white/40 text-[10px] font-black hover:bg-white/10 transition-all uppercase tracking-widest shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Home size={14} /> Exit Arena
                    </button>
                </div>
            </div>

            {/* Bottom Border Line */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-30 shadow-[0_0_20px_var(--neon-cyan)]" />
        </main>
    );
}
