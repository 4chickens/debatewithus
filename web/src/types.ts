export type UserRole = 'user' | 'admin' | 'streamer' | 'creator';

export interface User {
    id: string;
    username: string;
    role: UserRole;
    xp: number;
    level: number;
    mmr: number;
    wins: number;
    losses: number;
    streak: number;
}

export interface Topic {
    id: string;
    title: string;
    description: string;
    thumbnail_url?: string;
    upvotes: number;
    created_at: string;
    status: string;
    created_by?: { username: string };
    topic_tags?: Array<{
        tags: {
            name: string;
        };
    }>;
}
