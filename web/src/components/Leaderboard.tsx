'use client';

import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, TrendingUp, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { API_URL } from '@/config';

interface LeaderboardUser {
    id: string;
    username: string;
    mmr: number;
    wins: number;
    losses: number;
    xp: number;
}

export default function Leaderboard() {
    const [users, setUsers] = useState<LeaderboardUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                // In a real app, this would be a specific leaderboard endpoint
                const res = await fetch(`${API_URL}/api/admin/users`);
                if (res.ok) {
                    const data = await res.json();
                    // Sort by MMR descending
                    const sorted = data.sort((a: any, b: any) => (b.mmr || 1000) - (a.mmr || 1000));
                    setUsers(sorted.slice(0, 10)); // Top 10
                }
            } catch (err) {
                console.error('Failed to fetch leaderboard:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0: return <Crown className="text-yellow-400" size={20} />;
            case 1: return <Medal className="text-slate-300" size={20} />;
            case 2: return <Medal className="text-amber-600" size={20} />;
            default: return <span className="text-white/20 font-mono text-sm">#{index + 1}</span>;
        }
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Trophy className="text-neon-cyan" size={24} />
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">Global Rankings</h3>
                </div>
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Top 10 Debaters</div>
            </div>

            <div className="divide-y divide-white/5">
                {isLoading ? (
                    <div className="p-12 text-center text-white/20 font-mono text-xs uppercase animate-pulse">
                        Syncing ranks...
                    </div>
                ) : users.map((user, idx) => (
                    <motion.div
                        key={user.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-4 flex items-center gap-6 hover:bg-white/5 transition-colors group"
                    >
                        <div className="w-8 flex justify-center">
                            {getRankIcon(idx)}
                        </div>
                        
                        <div className="flex-1 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/20 group-hover:border-neon-cyan/50 transition-colors">
                                <User size={20} />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-sm tracking-tight group-hover:text-neon-cyan transition-colors">@{user.username}</span>
                                <span className="text-[10px] text-white/40 uppercase tracking-tighter">{user.wins}W - {user.losses}L</span>
                            </div>
                        </div>

                        <div className="text-right flex flex-col items-end">
                            <div className="flex items-center gap-1 text-neon-cyan font-black text-sm">
                                <TrendingUp size={12} />
                                <span>{user.mmr || 1000}</span>
                            </div>
                            <span className="text-[10px] text-white/20 font-mono uppercase tracking-widest">MMR</span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
