-- debatewithus Advanced Database Schema 2026
-- Optimized for Real-time Competitive Debate

-- 1. EXTENDED USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user', -- user, admin, streamer, creator
    
    -- Progress & Ranking
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    mmr INTEGER DEFAULT 1000,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    
    -- Profile Customization
    avatar_url TEXT,
    bio TEXT,
    banner_url TEXT,
    avatar_style JSONB DEFAULT '{"primary": "#00f3ff", "secondary": "#ff007f"}',
    
    -- Metadata
    is_verified BOOLEAN DEFAULT false,
    verification_code TEXT,
    code_expires_at TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TOPICS & TAXONOMY
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    category TEXT DEFAULT 'general',
    upvotes INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending', -- pending, active, archived, rejected
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE topic_tags (
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (topic_id, tag_id)
);

-- 3. ENHANCED MATCH TRACKING
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES topics(id),
    
    -- Competitors
    player_1_id UUID REFERENCES users(id),
    player_2_id UUID REFERENCES users(id), -- Null if AI
    winner_id UUID REFERENCES users(id),
    
    -- Config
    mode TEXT NOT NULL, -- casual, ai, ranked
    input_mode TEXT NOT NULL, -- voice, chat
    difficulty TEXT, -- easy, medium, hard
    
    -- Results
    final_momentum INTEGER DEFAULT 50,
    duration_seconds INTEGER,
    replay_token TEXT UNIQUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GRANULAR TRANSCRIPTS (Better than JSONB for analytics)
CREATE TABLE match_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id), -- Null if AI
    content TEXT NOT NULL,
    phase TEXT NOT NULL, -- Opening_P1, Rebuttal_P2, etc.
    momentum_delta INTEGER DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SOCIAL & ENGAGEMENT
CREATE TABLE follows (
    follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE achievements (
    id TEXT PRIMARY KEY, -- 'first_win', 'streak_10', etc.
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    xp_reward INTEGER DEFAULT 0
);

CREATE TABLE user_achievements (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id TEXT REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, achievement_id)
);

-- 5. XP & ECONOMY LOG
CREATE TABLE xp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL, -- 'match_win', 'topic_approved', 'achievement'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. INDEXES FOR PERFORMANCE
CREATE INDEX idx_users_mmr ON users(mmr DESC);
CREATE INDEX idx_matches_topic ON matches(topic_id);
CREATE INDEX idx_messages_match ON match_messages(match_id);
CREATE INDEX idx_topics_status ON topics(status);

-- 7. REALTIME & REPLICATION
-- (Assuming Supabase/PostgreSQL environment)
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE topics;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE user_achievements;
