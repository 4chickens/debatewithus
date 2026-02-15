import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function saveMatchResult(matchId: string, finalMomentum: number, transcripts: string[]) {
    if (!supabaseUrl || !supabaseKey) return;

    const winner = finalMomentum > 50 ? 'RIGHT' : 'LEFT';

    const { error } = await supabase
        .from('matches')
        .insert([
            {
                id: matchId,
                final_momentum: finalMomentum,
                winner,
                transcript_count: transcripts.length,
                created_at: new Date().toISOString()
            }
        ]);

    if (error) console.error('Supabase save error:', error);
}

export async function getRandomTopic() {
    // Fallback topics if DB is not ready
    const fallbacks = [
        { title: 'AI vs HUMANITY', description: 'Will artificial intelligence eventually replace all human creativity?' },
        { title: 'COLONIZING MARS', description: 'Is spending billions on Mars better than fixing Earth?' },
        { title: 'NICKNAME: CRYPTO', description: 'Is decentralization a true revolution or a speculative bubble?' }
    ];

    if (!supabaseUrl || !supabaseKey) return fallbacks[Math.floor(Math.random() * fallbacks.length)];

    try {
        const { data, error } = await supabase
            .from('topics')
            .select('*')
            .limit(1);

        if (error || !data || data.length === 0) return fallbacks[Math.floor(Math.random() * fallbacks.length)];
        return data[0];
    } catch {
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
}
