'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Plus, Tag, Image, Send, ArrowLeft, Loader2, Upload, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/config';

export default function NewTopicPage() {
    const router = useRouter();
    const { user, token } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const [form, setForm] = useState({
        title: '',
        description: '',
        tags: '',
        thumbnail_url: ''
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        if (file.size > 5 * 1024 * 1024) {
            setUploadError('File too large. Max 5MB.');
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setUploadError('Invalid file type. Use JPG, PNG, GIF or WEBP.');
            return;
        }

        setIsUploading(true);
        setUploadError(null);

        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Upload failed');
            }

            const data = await res.json();
            setForm({ ...form, thumbnail_url: data.url });
        } catch (err: any) {
            console.error('Upload error:', err);
            setUploadError(err.message || 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            router.push('/auth');
            return;
        }

        setIsLoading(true);
        const tagsArray = form.tags.split(',').map(t => t.trim()).filter(t => t !== '');

        try {
            const res = await fetch(`${API_URL}/api/topics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...form,
                    tags: tagsArray
                }),
            });

            if (!res.ok) throw new Error('Submission failed');

            router.push('/');
        } catch (err) {
            console.error(err);
            alert('Failed to submit topic. Try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-black text-white p-8 relative overflow-hidden">
            <div className="scanline" />

            <div className="z-20 w-full max-w-2xl mx-auto pt-10">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-white/40 hover:text-white mb-8 transition-colors group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em]">Abort Mission</span>
                </button>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-12"
                >
                    <div className="space-y-2">
                        <h1 className="text-5xl font-black italic tracking-tighter uppercase">Propose New Battle</h1>
                        <p className="text-white/40 font-mono text-xs tracking-[0.3em] uppercase">Stage your arena // Admin review required</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8 bg-white/5 border border-white/10 p-10 rounded-2xl backdrop-blur-xl">
                        <div className="space-y-6">
                            {/* Title */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-mono text-neon-cyan uppercase tracking-widest pl-1">Objective Title</label>
                                <input
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g., iPhone vs Android: The Ultimate War"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-lg focus:outline-none focus:border-neon-cyan/50 focus:bg-white/10 transition-all font-bold placeholder:text-white/10"
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest pl-1">Intelligence Briefing (Description)</label>
                                <textarea
                                    rows={4}
                                    required
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Briefly explain the debate context..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-sm focus:outline-none focus:border-neon-cyan/50 focus:bg-white/10 transition-all resize-none placeholder:text-white/10"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Tags */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest pl-1">Hashtags (Comma separated)</label>
                                    <div className="relative">
                                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                                        <input
                                            type="text"
                                            value={form.tags}
                                            onChange={(e) => setForm({ ...form, tags: e.target.value })}
                                            placeholder="tech, gadgets, design"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-6 text-sm focus:outline-none focus:border-neon-cyan/50 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Thumbnail */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest pl-1">Battle Visual (Thumbnail)</label>
                                    
                                    <div className="relative group">
                                        {form.thumbnail_url ? (
                                            <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-video bg-white/5">
                                                <img 
                                                    src={form.thumbnail_url} 
                                                    alt="Thumbnail preview" 
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button 
                                                        type="button"
                                                        onClick={() => setForm({ ...form, thumbnail_url: '' })}
                                                        className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded-full transition-colors"
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <label className={`
                                                flex flex-col items-center justify-center gap-3 
                                                aspect-video rounded-xl border-2 border-dashed 
                                                transition-all cursor-pointer
                                                ${isUploading ? 'border-neon-cyan/50 bg-neon-cyan/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}
                                            `}>
                                                {isUploading ? (
                                                    <Loader2 className="animate-spin text-neon-cyan" size={32} />
                                                ) : (
                                                    <>
                                                        <div className="p-4 rounded-full bg-white/5 text-white/40">
                                                            <Upload size={24} />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-xs font-bold uppercase tracking-wider">Deploy Visual</p>
                                                            <p className="text-[10px] text-white/20 mt-1 uppercase">1200×630 recommended (Max 5MB)</p>
                                                        </div>
                                                    </>
                                                )}
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept=".jpg,.jpeg,.png,.gif,.webp"
                                                    onChange={handleFileUpload}
                                                    disabled={isUploading}
                                                />
                                            </label>
                                        )}
                                    </div>
                                    {uploadError && (
                                        <p className="text-[10px] text-red-500 font-mono uppercase mt-2">{uploadError}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-5 bg-white text-black font-black uppercase tracking-[0.2em] text-sm rounded-xl hover:bg-neon-cyan hover:shadow-[0_0_30px_rgba(0,243,255,0.3)] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                                <>
                                    TRANSMIT PROPOSAL <Send size={18} />
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>
            </div>

            {/* Background Decoration */}
            <div className="fixed inset-0 opacity-5 pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />
        </main>
    );
}
