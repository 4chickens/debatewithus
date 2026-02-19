'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Swords, Search, Plus, User, LogOut, Loader2, Sparkles, Users } from 'lucide-react';
import TopicCard from '@/components/TopicCard';
import Profile from '@/components/Profile';
import Leaderboard from '@/components/Leaderboard';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/config';
import { Topic } from '@/types';

export default function Home() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const res = await fetch(`${API_URL}/api/topics`);
        if (!res.ok) throw new Error(`Failed to fetch topics: ${res.status}`);

        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          setTopics(data);
        } else {
          throw new Error('Server returned non-JSON response');
        }
      } catch (err) {
        console.error('Failed to fetch topics:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTopics();
  }, []);

  const filteredTopics = topics.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.topic_tags?.some(tt => tt.tags.name.toLowerCase().includes(searchQuery.toLowerCase().replace('#', '')))
  );

  return (
    <main className="min-h-screen bg-black text-white relative flex flex-col p-8 overflow-x-hidden">
      {/* Background Effects */}
      <div className="scanline" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(188,19,254,0.05)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />

      {/* Header */}
      <nav className="z-30 w-full flex justify-between items-center mb-12 max-w-[1600px] mx-auto">
        <div className="flex flex-col">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-neon-cyan text-[10px] font-mono tracking-[0.5em] uppercase"
          >
            v1.1.0 // debatewithus
          </motion.div>
          <h1 className="text-4xl font-black italic tracking-tighter hover:text-neon-cyan transition-colors cursor-pointer" onClick={() => router.push('/')}>
            debatewithus
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative group hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-neon-cyan transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search topics or #hashtags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-6 text-sm w-64 lg:w-96 focus:outline-none focus:border-neon-cyan/50 focus:bg-white/10 transition-all"
            />
          </div>

          <div className="h-8 w-[1px] bg-white/10 mx-2 hidden md:block" />

          {user ? (
            <div className="flex items-center gap-4">
              {user.role === 'admin' && (
                <button
                  onClick={() => router.push('/admin')}
                  className="px-4 py-2 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/50 rounded-lg text-neon-purple font-bold text-xs tracking-widest uppercase transition-all"
                >
                  Admin
                </button>
              )}
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-neon-cyan uppercase">@{user.username}</span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => router.push('/auth')}
              className="flex items-center gap-2 px-6 py-2 bg-neon-cyan/10 hover:bg-neon-cyan/20 border border-neon-cyan/50 rounded-lg font-bold text-neon-cyan transition-all text-sm"
            >
              <User size={18} /> SIGN IN
            </button>
          )}
        </div>
      </nav>

      <div className="z-20 w-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        {/* Left/Main Column: Topics */}
        <div className="lg:col-span-8 space-y-8">
          {/* Hero Section */}
          <div className="flex justify-between items-end bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl">
            <div className="space-y-2">
              <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">THE ARENA IS OPEN</h2>
              <p className="text-white/40 font-mono text-xs tracking-[0.3em] uppercase">Street fighter of words // Select topic to start</p>
            </div>

            <button
              onClick={() => user ? router.push('/topics/new') : router.push('/auth')}
              className="group flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 hover:border-neon-purple/50 rounded-xl transition-all"
            >
              <Plus size={18} className="text-neon-purple" />
              <span className="text-xs font-bold tracking-tight uppercase">PROPOSE</span>
            </button>
          </div>

          {/* Categories Bar */}
          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            {['#ALL', '#POLITICS', '#TECH', '#ENTERTAINMENT', '#GAMING', '#TRENDING'].map(tag => (
              <button
                key={tag}
                onClick={() => setSearchQuery(tag === '#ALL' ? '' : tag)}
                className={`px-6 py-2 rounded-full border text-[10px] font-mono tracking-widest uppercase transition-all whitespace-nowrap ${(searchQuery === tag || (tag === '#ALL' && searchQuery === ''))
                  ? 'bg-neon-cyan text-black border-neon-cyan font-bold'
                  : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                  }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Topic Grid */}
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4 text-white/20">
              <Loader2 className="animate-spin" size={32} />
              <span className="font-mono text-xs tracking-widest uppercase animate-pulse">Initializing Data Stream...</span>
            </div>
          ) : filteredTopics.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {filteredTopics.map((topic) => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </motion.div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center gap-4 text-white/20">
              <Search size={48} className="opacity-10" />
              <span className="font-mono text-xs tracking-widest uppercase">No topics found matching your query</span>
            </div>
          )}
        </div>

        {/* Right Column: Profile & Leaderboard */}
        <div className="lg:col-span-4 space-y-8">
          {user ? (
            <Profile />
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center gap-4 backdrop-blur-xl">
              <div className="p-4 bg-neon-cyan/10 rounded-full border border-neon-cyan/20">
                <User size={32} className="text-neon-cyan" />
              </div>
              <div>
                <h3 className="font-bold uppercase tracking-tight">Identity Required</h3>
                <p className="text-xs text-white/40 mt-1">Sign in to track your MMR, wins, and unlock Ranked Arena.</p>
              </div>
              <button 
                onClick={() => router.push('/auth')}
                className="w-full py-3 bg-neon-cyan text-black font-black rounded-xl hover:shadow-[0_0_20px_rgba(0,243,255,0.3)] transition-all uppercase text-xs tracking-widest"
              >
                Sync Identity
              </button>
            </div>
          )}
          
          <Leaderboard />
        </div>
      </div>

      {/* Footer Info */}
      <footer className="mt-20 py-8 border-t border-white/5 z-20 w-full max-w-7xl mx-auto flex justify-between items-center text-[10px] font-mono text-white/20 uppercase tracking-widest">
        <div className="flex gap-8">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : topics.length >= 0 ? 'bg-neon-green shadow-[0_0_10px_rgba(57,255,20,0.5)]' : 'bg-neon-pink'}`} />
            <span>SERVERS: {isLoading ? 'SYNCING' : topics.length >= 0 ? 'OPTIMAL' : 'OFFLINE'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={12} />
            <span>3,241 ONLINE</span>
          </div>
        </div>
        <div>
          © 2026 debatewithus // THE ARENA
        </div>
      </footer>

      {/* Decorative Grid */}
      <div className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
    </main>
  );
}
