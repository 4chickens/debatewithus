import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/config';
import { Clock, Archive, CheckCircle } from 'lucide-react';

interface Topic {
    id: string;
    title: string;
    description: string;
    status: string;
    created_at: string;
    created_by: { username: string };
    topic_tags?: Array<{ tags: { name: string } }>;
}

export default function TopicManagement() {
    const { token } = useAuthStore();
    const [topics, setTopics] = useState<Topic[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'archived'>('all');

    const fetchTopics = useCallback(async () => {
        setIsLoading(true);
        try {
            const endpoint = filter === 'all'
                ? `${API_URL}/api/admin/topics`
                : `${API_URL}/api/admin/topics?status=${filter}`;

            const res = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTopics(data);
            }
        } catch (error) {
            console.error('Failed to fetch topics:', error);
        } finally {
            setIsLoading(false);
        }
    }, [filter, token]);

    useEffect(() => {
        fetchTopics();
    }, [fetchTopics]);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">Topic Management</h2>

            <div className="flex gap-4">
                {['all', 'active', 'pending', 'archived'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status as any)}
                        className={`px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-widest border transition-all ${filter === status
                            ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                            : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                            }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="text-white/40 font-mono text-sm animate-pulse">Syncing Topic Database...</div>
            ) : (
                <div className="grid gap-4">
                    {topics.map(topic => (
                        <div key={topic.id} className="p-4 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center group hover:border-white/20 transition-all">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${topic.status === 'active' ? 'bg-neon-green shadow-[0_0_5px_rgba(57,255,20,0.5)]' :
                                        topic.status === 'pending' ? 'bg-neon-pink shadow-[0_0_5px_rgba(255,0,255,0.5)]' :
                                            'bg-white/20'
                                        }`} />
                                    <h3 className="text-white font-bold">{topic.title}</h3>
                                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-tight ml-2">by @{topic.created_by?.username}</span>
                                </div>
                                <p className="text-white/40 text-xs">{topic.description}</p>
                            </div>

                            <div className="text-[10px] font-mono text-white/20">
                                {new Date(topic.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                    {topics.length === 0 && (
                        <div className="p-8 text-center text-white/20 font-mono text-xs uppercase tracking-widest border border-dashed border-white/10 rounded-xl">
                            No topics found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
