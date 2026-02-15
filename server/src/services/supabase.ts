import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Support both naming conventions to prevent deployment crashes
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Prevent server crash if variables are missing
export const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

/**
 * Saves a match result to Supabase.
 * Gracefully skip if database is not configured.
 */
export async function saveMatchResult(matchId: string, finalMomentum: number, transcripts: string[]) {
    if (!supabase) {
        console.warn('[Supabase] Skipping saveMatchResult: Credentials missing.');
        return;
    }

    const winner = finalMomentum > 50 ? 'RIGHT' : 'LEFT';

    try {
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

        if (error) console.error('[Supabase] Save error:', error);
    } catch (err) {
        console.error('[Supabase] Critical error during save:', err);
    }
}

/**
 * Fetches a random topic from Supabase.
 * Returns a fallback if database is not configured or fails.
 */
export async function getRandomTopic() {
    const fallbacks = [
        { title: 'AI vs HUMANITY', description: 'Will artificial intelligence eventually replace all human creativity?' },
        { title: 'COLONIZING MARS', description: 'Is spending billions on Mars better than fixing Earth?' },
        { title: 'NICKNAME: CRYPTO', description: 'Is decentralization a true revolution or a speculative bubble?' }
    ];

    if (!supabase) {
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    try {
        const { data, error } = await supabase
            .from('topics')
            .select('*')
            .limit(1);

        if (error || !data || data.length === 0) {
            return fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }
        return data[0];
    } catch {
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
}
