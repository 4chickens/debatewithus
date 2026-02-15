'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { MomentumMeter } from '@/components/MomentumMeter';
import { AvatarVisualizer } from '@/components/AvatarVisualizer';
import { Timer, Zap, Mic, MicOff, Home } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useRouter, useParams } from 'next/navigation';

export default function ArenaPage() {
    const { matchId } = useParams();
    const { momentum, player1, player2, phase, timeLeft, setMomentum, setTimeLeft, updateVolume, setPhase } = useGameStore();
    const [isMuted, setIsMuted] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [topic, setTopic] = useState({ title: 'LOADING TOPIC...', description: '' });
    const socketRef = useRef<Socket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const router = useRouter();

    // 1. Initialize Socket Connection
    useEffect(() => {
        const socketUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';
        const socket = io(socketUrl);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to game engine');
            socket.emit('join_match', matchId);
        });

        socket.on('game_init', (data: { momentum: number, phase: string, topic: any }) => {
            setMomentum(data.momentum);
            setPhase(data.phase as any);
            setTopic(data.topic);
        });

        socket.on('game_update', (data: { momentum: number, transcript?: string, lastDelta?: number, phase?: string, timeLeft?: number, topic?: any }) => {
            if (data.momentum !== undefined) setMomentum(data.momentum);
            if (data.transcript) setTranscript(data.transcript);
            if (data.lastDelta && Math.abs(data.lastDelta) > 5) triggerShake();
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
    }, [matchId, setMomentum, setPhase, setTimeLeft]);

    // 2. Real-time Audio Streaming & Analysis
    useEffect(() => {
        if (isMuted || phase === 'Lobby' || phase === 'Results') {
            mediaRecorderRef.current?.stop();
            return;
        }

        async function startStreaming() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                // Audio Context for Volume Analysis
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
                        // Get current volume
                        analyser.getByteFrequencyData(dataArray);
                        const volume = dataArray.reduce((p, c) => p + c, 0) / dataArray.length / 255;

                        socketRef.current.emit('audio_chunk', {
                            matchId: 'arena-match-1',
                            chunk: event.data,
                            volume: volume
                        });

                        // Update local UI state for visualizer
                        updateVolume(1, volume);
                    }
                };

                mediaRecorder.start(100); // Faster chunks for better reactivity
            } catch (err) {
                console.error('Audio capture failed:', err);
            }
        }

        startStreaming();

        return () => {
            mediaRecorderRef.current?.stop();
        };
    }, [isMuted, updateVolume]);

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

    return (
        <main className="min-h-screen bg-black text-white relative flex flex-col items-center justify-between p-8 overflow-hidden">
            {/* Background Effects */}
            <div className="scanline" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,243,255,0.05)_0%,rgba(0,0,0,0)_70%)]" />

            {/* Header Info */}
            <div className="z-20 w-full max-w-5xl flex justify-between items-start">
                <div className="flex flex-col">
                    <span className="text-neon-cyan text-[10px] font-mono tracking-widest uppercase">Match ID: #7F22A</span>
                    <h1 className="text-3xl font-black italic tracking-tighter glitch-text" data-text="THE ARENA">THE ARENA</h1>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-6 py-2 rounded-full backdrop-blur-xl shadow-[0_0_20px_rgba(255,0,127,0.2)]">
                            <Timer className="text-neon-pink w-4 h-4 animate-pulse" />
                            <span className="font-mono text-2xl font-bold tracking-tighter">{timeLeft}s</span>
                        </div>
                        <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                            {phase} {phase === 'Lobby' ? 'COUNTDOWN' : 'PHASE'}
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

            {/* Combat Area */}
            <motion.div
                className="z-20 w-full max-w-6xl flex justify-around items-center gap-8 py-12"
                animate={isShaking ? { x: [-10, 10, -5, 5, 0] } : {}}
                transition={{ duration: 0.4 }}
            >
                <AvatarVisualizer player={player1} side="left" />

                <div className="flex-1 flex flex-col items-center gap-12">
                    {/* Topic Display */}
                    <div className="text-center space-y-2 max-w-sm">
                        <h2 className="text-neon-cyan text-xl font-black tracking-tight">{topic.title}</h2>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">
                            {topic.description}
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <Zap className="text-yellow-400 animate-pulse" />
                        <span className="text-[10px] font-bold tracking-[0.2em] text-white/60">MOMENTUM_BALANCE</span>
                    </div>
                    <MomentumMeter />

                    {/* Live Transcript Bubble */}
                    {transcript && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-md max-w-md text-center"
                        >
                            <p className="text-xs font-mono text-cyan-400 leading-relaxed">
                                {transcript}
                            </p>
                        </motion.div>
                    )}
                </div>

                <AvatarVisualizer player={player2} side="right" />
            </motion.div>

            {/* UI Dashboard */}
            <div className="z-20 w-full max-w-xl bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-xl flex flex-col gap-6">
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <label className="text-xs font-mono text-white/60 uppercase tracking-widest">
                            Real-time Sync (Socket.io)
                        </label>
                        <span className="text-neon-cyan font-mono font-bold">{momentum}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={momentum}
                        onChange={(e) => handleMomentumChange(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-cyan shadow-[0_0_10px_var(--neon-cyan)]"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={triggerShake}
                        className="py-3 px-4 rounded-lg bg-neon-pink/20 border border-neon-pink/50 text-neon-pink text-[10px] font-black hover:bg-neon-pink/30 transition-all uppercase tracking-widest shadow-lg active:scale-95"
                    >
                        Impact Shockwave
                    </button>
                    <button
                        onClick={() => updateVolume(1, Math.random() * 0.8 + 0.2)}
                        className="py-3 px-4 rounded-lg bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan text-[10px] font-black hover:bg-neon-cyan/30 transition-all uppercase tracking-widest shadow-lg active:scale-95"
                    >
                        P1 Voice Burst
                    </button>
                </div>
            </div>

            {/* Bottom Border Line */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-30 shadow-[0_0_20px_var(--neon-cyan)]" />
        </main>
    );
}
