'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Trophy, Users, Swords, Settings } from 'lucide-react';

export default function Lobby() {
  const router = useRouter();

  const startMatch = () => {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/arena/${randomId}`);
  };

  const menuItems = [
    { name: 'RANKED MATCH', icon: Swords, color: 'neon-cyan', action: startMatch },
    { name: 'FRIENDLY DUEL', icon: Users, color: 'neon-purple', action: () => { } },
    { name: 'LEADERBOARD', icon: Trophy, color: 'neon-pink', action: () => { } },
    { name: 'SETTINGS', icon: Settings, color: 'white/40', action: () => { } },
  ];

  return (
    <main className="min-h-screen bg-black text-white relative flex flex-col items-center justify-center p-8 overflow-hidden">
      {/* Background Effects */}
      <div className="scanline" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(188,19,254,0.1)_0%,rgba(0,0,0,0)_70%)]" />

      {/* Decorative Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <div className="z-20 flex flex-col items-center gap-12 w-full max-w-lg">
        {/* Title */}
        <div className="text-center space-y-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-neon-cyan text-xs font-mono tracking-[0.5em] uppercase"
          >
            v1.0.4-alpha // DEBATE_ME
          </motion.div>
          <motion.h1
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-7xl font-black italic tracking-tighter glitch-text"
            data-text="DEBATE_ME"
          >
            DEBATE_ME
          </motion.h1>
          <p className="text-white/40 font-mono text-[10px] tracking-widest uppercase">
            The Street Fighter of Words
          </p>
        </div>

        {/* Menu */}
        <div className="w-full flex flex-col gap-4">
          {menuItems.map((item, index) => (
            <motion.button
              key={item.name}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={item.action}
              className={`group relative flex items-center justify-between p-4 bg-white/5 border border-white/10 hover:border-neon-cyan/50 hover:bg-white/10 transition-all rounded-lg overflow-hidden`}
            >
              {/* Hover highlight */}
              <div className="absolute inset-y-0 left-0 w-1 bg-neon-cyan transform scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom" />

              <div className="flex items-center gap-4">
                <item.icon size={20} className={item.name.includes('RANKED') ? 'text-neon-cyan' : 'text-white/60'} />
                <span className="font-bold tracking-widest text-sm">{item.name}</span>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] font-mono text-white/40">READY_STATE</span>
                <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
              </div>
            </motion.button>
          ))}
        </div>

        {/* Footer Info */}
        <div className="flex gap-8 text-[10px] font-mono text-white/20 uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neon-green" />
            <span>SERVERS: OPTIMAL</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={12} />
            <span>3,241 ONLINE</span>
          </div>
        </div>
      </div>

      {/* Footer Decoration */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-neon-pink to-transparent opacity-20" />
    </main>
  );
}
