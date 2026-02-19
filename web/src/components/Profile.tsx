'use client';

import { motion } from 'framer-motion';
import { User as UserIcon, Shield, Zap, Trophy, Settings, LogOut, Swords } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function Profile() {
    const { user, logout } = useAuthStore();

    if (!user) return null;

    const stats = [
        { label: 'Rank', value: 'Diamond III', icon: <Shield size={14} /> },
        { label: 'MMR', value: '1,420', icon: <Trophy size={14} /> },
        { label: 'Win Rate', value: '68%', icon: <Zap size={14} /> }
    ];

    return (
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl h-full">
            <div className="p-8 flex flex-col items-center gap-6">
                {/* Avatar Area */}
                <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-neon-cyan via-neon-purple to-neon-pink p-[2px] shadow-[0_0_30px_rgba(0,243,255,0.3)] group-hover:scale-105 transition-transform">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                            <UserIcon size={40} className="text-white/20" />
                        </div>
                    </div>
                    <div className="absolute -bottom-2 right-0 bg-neon-cyan text-black p-1.5 rounded-lg shadow-lg">
                        <Settings size={14} />
                    </div>
                </div>

                {/* Identity */}
                <div className="text-center space-y-1">
                    <h3 className="text-2xl font-black italic tracking-tighter uppercase">@{user.username}</h3>
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.3em]">{user.role} Operative</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 w-full">
                    {stats.map((stat) => (
                        <div key={stat.label} className="bg-white/5 border border-white/10 p-3 rounded-2xl flex flex-col items-center gap-1 text-center">
                            <div className="text-neon-cyan opacity-50">{stat.icon}</div>
                            <span className="text-[10px] font-mono text-white/40 uppercase tracking-tighter">{stat.label}</span>
                            <span className="text-xs font-black tracking-tight">{stat.value}</span>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="w-full space-y-3 pt-4 border-t border-white/10">
                    <button className="w-full py-3 px-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-between group transition-all">
                        <div className="flex items-center gap-3">
                            <Swords size={18} className="text-neon-pink" />
                            <span className="text-xs font-bold uppercase tracking-widest">Match History</span>
                        </div>
                        <div className="text-white/20 group-hover:translate-x-1 transition-transform">→</div>
                    </button>
                    
                    <button 
                        onClick={logout}
                        className="w-full py-3 px-6 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3 transition-all"
                    >
                        <LogOut size={18} className="text-red-500" />
                        <span className="text-xs font-bold uppercase tracking-widest text-red-500">Disconnect</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
