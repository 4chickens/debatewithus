'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Check, X, Shield, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface Topic {
    id: string;
    title: string;
    description: string;
    status: string;
    created_at: string;
    topic_tags?: Array<{
        tags: {
            name: string;
        };
    }>;
}

export default function AdminPage() {
    const router = useRouter();
    const { user, token } = useAuthStore();
    const [pendingTopics, setPendingTopics] = useState<Topic[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            router.push('/');
            return;
        }

        const fetchPending = async () => {
            try {
                // For now, reuse the topics API and filter manually if the backend doesn't have a separate endpoint
                // Actually, I should have an admin endpoint. Let's assume there's one or fetch all and filter.
                const res = await fetch('http://localhost:4000/api/topics');
                const data = await res.json();
                // We're showing all active topics on the home, but for admin we might want more.
                // Ideally, a GET /api/admin/topics exists.
                setPendingTopics(data.filter((t: any) => t.status === 'pending'));
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPending();
    }, [user]);

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            const res = await fetch(`http://localhost:4000/api/admin/topics/${id}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                setPendingTopics(pendingTopics.filter((t: any) => t.id !== id));
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (!user || user.role !== 'admin') return null;

    return (
        <main className="min-h-screen bg-black text-white p-12">
            <div className="z-20 w-full max-w-6xl mx-auto space-y-12">
                <header className="flex justify-between items-end">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-neon-cyan">
                            <Shield size={16} />
                            <span className="text-[10px] font-mono tracking-[0.5em] uppercase">Security Level: Alpha</span>
                        </div>
                        <h1 className="text-5xl font-black italic tracking-tighter uppercase">Command Center</h1>
                        <p className="text-white/40 font-mono text-sm tracking-widest uppercase">Approving global debate theater</p>
                    </div>

                    <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-xl backdrop-blur-md">
                        <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-neon-cyan uppercase">{user.username}</span>
                            <span className="text-[10px] text-white/40 uppercase">Systems Administrator</span>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 gap-6">
                    {isLoading ? (
                        <div className="h-64 flex items-center justify-center">
                            <Loader2 className="animate-spin text-neon-cyan" size={32} />
                        </div>
                    ) : pendingTopics.length > 0 ? (
                        pendingTopics.map((topic: any) => (
                            <motion.div
                                key={topic.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white/5 border border-white/10 p-8 rounded-2xl flex items-center justify-between group hover:border-white/20 transition-all"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="px-3 py-1 bg-neon-purple/20 border border-neon-purple/50 rounded text-[10px] font-mono text-neon-purple uppercase">
                                            {topic.status} Proposal
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] font-mono text-white/20">
                                            <Clock size={12} />
                                            <span>{new Date(topic.created_at).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-2xl font-black italic uppercase tracking-tight">{topic.title}</h3>
                                        <p className="text-white/40 text-sm mt-1">{topic.description}</p>
                                    </div>

                                    <div className="flex gap-2">
                                        {topic.topic_tags?.map((tt: any) => (
                                            <span key={tt.tags.name} className="text-[10px] font-mono text-neon-cyan">#{tt.tags.name}</span>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => handleAction(topic.id, 'reject')}
                                        className="p-4 bg-white/5 hover:bg-neon-pink/20 border border-white/10 hover:border-neon-pink/50 rounded-xl text-white/40 hover:text-neon-pink transition-all"
                                    >
                                        <X size={24} />
                                    </button>
                                    <button
                                        onClick={() => handleAction(topic.id, 'approve')}
                                        className="p-4 bg-neon-cyan/20 hover:bg-neon-cyan/40 border border-neon-cyan/50 rounded-xl text-neon-cyan transition-all"
                                    >
                                        <Check size={24} />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center gap-4 bg-white/5 border border-dashed border-white/10 rounded-2xl text-white/20">
                            <AlertCircle size={48} className="opacity-10" />
                            <span className="font-mono text-xs tracking-widest uppercase">The queue is empty. No topics awaiting review.</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Decorative background Elements */}
            <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink opacity-30" />
        </main>
    );
}
