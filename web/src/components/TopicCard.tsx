'use client';

import { motion } from 'framer-motion';
import { ExternalLink, Users, Tag } from 'lucide-react';
import Link from 'next/link';
import { Topic } from '@/types';

export default function TopicCard({ topic }: { topic: Topic }) {
    const tags = topic.topic_tags?.map(tt => tt.tags.name) || [];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            className="group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-neon-cyan/50 transition-all backdrop-blur-md"
        >
            {/* Thumbnail */}
            <div className="aspect-video relative overflow-hidden bg-white/5">
                {topic.thumbnail_url ? (
                    <img
                        src={topic.thumbnail_url}
                        alt={topic.title}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                        <Tag size={40} />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            </div>

            {/* Content */}
            <div className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg tracking-tight group-hover:text-neon-cyan transition-colors line-clamp-1">
                        {topic.title}
                    </h3>
                    <div className="flex items-center gap-1 text-white/40 text-xs">
                        <Users size={12} />
                        <span>{topic.upvotes}</span>
                    </div>
                </div>

                <p className="text-white/40 text-sm line-clamp-2 min-h-[2.5rem]">
                    {topic.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                        <span key={tag} className="text-[10px] font-mono text-neon-purple bg-neon-purple/10 px-2 py-0.5 rounded-full border border-neon-purple/20">
                            #{tag}
                        </span>
                    ))}
                </div>

                <div className="pt-2 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
                        By {topic.created_by?.username || 'System'}
                    </span>
                    <Link
                        href={`/arena/${topic.id}`}
                        className="flex items-center gap-1 text-xs font-bold text-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        ENTER ARENA <ExternalLink size={14} />
                    </Link>
                </div>
            </div>

            {/* Glass decoration */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </motion.div>
    );
}
