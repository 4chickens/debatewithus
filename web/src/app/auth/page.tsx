'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, ArrowRight, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/config';

type AuthState = 'login' | 'signup' | 'verify';

export default function AuthPage() {
    const router = useRouter();
    const setAuth = useAuthStore(state => state.setAuth);
    const [authState, setAuthState] = useState<AuthState>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [verifyEmail, setVerifyEmail] = useState('');

    const [form, setForm] = useState({
        username: '',
        email: '',
        password: '',
        code: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            if (authState === 'verify') {
                const res = await fetch(`${API_URL}/api/auth/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: verifyEmail, code: form.code }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                setAuth(data.user, data.token);
                router.push('/');
                return;
            }

            const endpoint = authState === 'login' ? '/api/auth/login' : '/api/auth/signup';
            const body = authState === 'login'
                ? { identifier: form.email || form.username, password: form.password }
                : { username: form.username, email: form.email, password: form.password };

            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (res.status === 403 && data.requiresVerification) {
                setVerifyEmail(data.email);
                setAuthState('verify');
                setError('Please verify your email to continue.');
                return;
            }

            if (!res.ok) throw new Error(data.error);

            if (authState === 'signup') {
                setVerifyEmail(form.email);
                setAuthState('verify');
                setError(''); // Clear error on successful signup
                return;
            }

            setAuth(data.user, data.token);
            router.push('/');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-black text-white relative flex items-center justify-center p-8 overflow-hidden">
            <div className="scanline" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,243,255,0.05)_0%,rgba(0,0,0,0)_70%)]" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="z-20 w-full max-w-md bg-white/5 border border-white/10 p-10 rounded-2xl backdrop-blur-xl relative"
            >
                {/* Decoration */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-neon-cyan/10 blur-[100px] rounded-full" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-neon-pink/10 blur-[100px] rounded-full" />

                <div className="text-center space-y-2 mb-10 relative">
                    {authState === 'verify' && (
                        <button
                            onClick={() => setAuthState('signup')}
                            className="absolute -left-6 top-1 text-white/20 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <h1 className="text-4xl font-black italic tracking-tighter uppercase">
                        {authState === 'login' ? 'Welcome Back' : authState === 'signup' ? 'Join the Fight' : 'Secure Access'}
                    </h1>
                    <p className="text-white/40 font-mono text-[10px] tracking-widest uppercase">
                        {authState === 'login'
                            ? 'Sign in to your account'
                            : authState === 'signup'
                                ? 'Create your debate profile'
                                : `Code sent to ${verifyEmail}`}
                    </p>
                </div>

                {error && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mb-6 p-3 bg-neon-pink/10 border border-neon-pink/50 rounded text-neon-pink text-xs font-mono uppercase text-center"
                    >
                        Error: {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <AnimatePresence mode="wait">
                        {authState === 'verify' ? (
                            <motion.div
                                key="verify"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                <div className="space-y-1">
                                    <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest ml-1">6-Digit Code</label>
                                    <div className="relative group">
                                        <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-neon-cyan transition-colors" size={18} />
                                        <input
                                            type="text"
                                            required
                                            maxLength={6}
                                            value={form.code}
                                            onChange={(e) => setForm({ ...form, code: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-center text-xl font-bold tracking-[0.5em] focus:outline-none focus:border-neon-cyan/50 transition-all placeholder:text-white/5"
                                            placeholder="000000"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="entry"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-4"
                            >
                                {authState === 'signup' && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest ml-1">Username</label>
                                        <div className="relative group">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-neon-cyan transition-colors" size={18} />
                                            <input
                                                type="text"
                                                required
                                                value={form.username}
                                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-neon-cyan/50 transition-all"
                                                placeholder="Enter username"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest ml-1">{authState === 'login' ? 'Email or Username' : 'Email Address'}</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-neon-cyan transition-colors" size={18} />
                                        <input
                                            type="text"
                                            required
                                            value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-neon-cyan/50 transition-all"
                                            placeholder={authState === 'login' ? "you@example.com or user" : "you@example.com"}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest ml-1">Password</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-neon-cyan transition-colors" size={18} />
                                        <input
                                            type="password"
                                            required
                                            value={form.password}
                                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-neon-cyan/50 transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-6 py-4 bg-neon-cyan text-black font-black uppercase tracking-widest text-sm rounded-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(0,243,255,0.2)]"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>
                                {authState === 'login' ? 'AUTHENTICATE' : authState === 'signup' ? 'INITIALIZE PROFILE' : 'VERIFY IDENTITY'}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-8 border-t border-white/5 text-center">
                    <button
                        onClick={() => setAuthState(authState === 'login' ? 'signup' : 'login')}
                        className="text-[10px] font-mono text-white/20 hover:text-neon-cyan uppercase tracking-widest transition-colors"
                    >
                        {authState === 'login' ? "Don't have an account? Create one" : "Already have an account? Sign in"}
                    </button>
                </div>
            </motion.div>

            {/* Background Grid */}
            <div className="absolute inset-0 opacity-5 pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />
        </main>
    );
}
