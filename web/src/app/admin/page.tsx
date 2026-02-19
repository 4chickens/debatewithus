'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Check, X, Shield, Clock, AlertCircle, Loader2, Users, FileText, Grid, LogOut, Home, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/config';
import UserManagement from '@/components/admin/UserManagement';
import TopicManagement from '@/components/admin/TopicManagement';
import { Topic } from '@/types';

export default function AdminPage() {
    const router = useRouter();
    const { user, token, logout } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'topics'>('dashboard');
    const [pendingTopics, setPendingTopics] = useState<Topic[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            router.push('/');
            return;
        }

        const fetchPending = async () => {
            try {
                const res = await fetch(`${API_URL}/api/admin/topics/pending`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!res.ok) throw new Error(`Failed to fetch topics: ${res.status}`);

                const contentType = res.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await res.json();
                    setPendingTopics(data);
                } else {
                    throw new Error('Server returned non-JSON response');
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPending();
    }, [user, token, router]);

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            const res = await fetch(`${API_URL}/api/admin/topics/${id}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                setPendingTopics(pendingTopics.filter((t: any) => t.id !== id));
            } else {
                const contentType = res.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await res.json();
                    alert(data.error || 'Action failed');
                } else {
                    alert(`Action failed (${res.status})`);
                }
            }
        } catch (err) {
            console.error(err);
            alert('Failed to perform action');
        }
    };

    if (!user || user.role !== 'admin') return null;

    return (
        <main className="min-h-screen bg-black text-white flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/10 p-6 flex flex-col gap-8 fixed h-full bg-black z-50">
                <div className="flex items-center gap-2 text-neon-cyan mb-4">
                    <Shield size={24} />
                    <span className="font-black italic tracking-tighter uppercase text-xl">Command</span>
                </div>

                <nav className="flex flex-col gap-2">
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left text-white/40 hover:bg-white/5 hover:text-neon-cyan mb-4"
                    >
                        <ArrowLeft size={18} />
                        <span className="text-xs font-mono uppercase tracking-widest font-bold">Back to Arena</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'dashboard' ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 shadow-[0_0_15px_rgba(0,243,255,0.2)]' : 'text-white/40 hover:bg-white/5'
                            }`}
                    >
                        <Grid size={18} />
                        <span className="text-xs font-mono uppercase tracking-widest font-bold">Overview</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'users' ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/50 shadow-[0_0_15px_rgba(188,19,254,0.2)]' : 'text-white/40 hover:bg-white/5'
                            }`}
                    >
                        <Users size={18} />
                        <span className="text-xs font-mono uppercase tracking-widest font-bold">Users</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('topics')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'topics' ? 'bg-neon-pink/20 text-neon-pink border border-neon-pink/50 shadow-[0_0_15px_rgba(255,0,255,0.2)]' : 'text-white/40 hover:bg-white/5'
                            }`}
                    >
                        <FileText size={18} />
                        <span className="text-xs font-mono uppercase tracking-widest font-bold">Topics</span>
                    </button>
                </nav>

                <div className="mt-auto pt-6 border-t border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink" />
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-white uppercase">{user.username}</span>
                                <span className="text-[10px] text-white/40 uppercase">Super Admin</span>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="p-2 bg-white/5 hover:bg-red-500/20 border border-white/10 rounded-lg text-white/40 hover:text-red-500 transition-all"
                            title="Sign Out"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 p-12 ml-64 min-h-screen">
                <AnimatePresence mode="wait">
                    {activeTab === 'dashboard' && (
                        <motion.div
                            key="dashboard"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-12 max-w-5xl mx-auto"
                        >
                            <header className="space-y-2">
                                <h1 className="text-4xl font-black italic tracking-tighter uppercase">Pending Approvals</h1>
                                <p className="text-white/40 font-mono text-xs tracking-widest uppercase">Items requiring immediate attention</p>
                            </header>

                            <div className="grid grid-cols-1 gap-4">
                                {isLoading ? (
                                    <div className="h-48 flex items-center justify-center">
                                        <Loader2 className="animate-spin text-neon-cyan" size={24} />
                                    </div>
                                ) : pendingTopics.length > 0 ? (
                                    pendingTopics.map((topic: any) => (
                                        <motion.div
                                            key={topic.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-white/5 border border-white/10 p-6 rounded-2xl flex items-center justify-between group hover:border-white/20 transition-all hover:bg-white/10"
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 text-[10px] font-mono uppercase rounded border border-yellow-500/30">Review</span>
                                                    <h3 className="text-lg font-bold">{topic.title}</h3>
                                                </div>
                                                <p className="text-white/40 text-xs max-w-xl">{topic.description}</p>
                                                <div className="flex gap-2">
                                                    {topic.topic_tags?.map((tt: any) => (
                                                        <span key={tt.tags.name} className="text-[10px] font-mono text-neon-cyan">#{tt.tags.name}</span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleAction(topic.id, 'reject')}
                                                    className="p-3 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/50 rounded-xl text-white/40 hover:text-red-500 transition-all"
                                                    title="Reject Topic"
                                                >
                                                    <X size={20} />
                                                </button>
                                                <button
                                                    onClick={() => handleAction(topic.id, 'approve')}
                                                    className="p-3 bg-neon-cyan/10 hover:bg-neon-cyan/20 border border-neon-cyan/30 rounded-xl text-neon-cyan transition-all"
                                                    title="Approve Topic"
                                                >
                                                    <Check size={20} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="h-48 flex flex-col items-center justify-center gap-4 bg-white/5 border border-dashed border-white/10 rounded-2xl text-white/20">
                                        <CheckCircle size={32} className="opacity-20" />
                                        <span className="font-mono text-xs tracking-widest uppercase">All caught up</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'users' && (
                        <motion.div
                            key="users"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="max-w-5xl mx-auto"
                        >
                            <UserManagement />
                        </motion.div>
                    )}

                    {activeTab === 'topics' && (
                        <motion.div
                            key="topics"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="max-w-5xl mx-auto"
                        >
                            <TopicManagement />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Background Elements */}
            <div className="fixed inset-0 pointer-events-none z-[-1]">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neon-purple/5 blur-[100px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-neon-cyan/5 blur-[100px] rounded-full mix-blend-screen" />
            </div>
        </main>
    );
}

// Icon component helper
function CheckCircle({ size, className }: { size: number, className: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
    );
}
