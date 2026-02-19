import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

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

/**
 * --- AUTH SERVICES ---
 */

export async function createUser(username: string, email: string, passwordPlain: string) {
    if (!supabase) throw new Error('Database not configured');

    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    const { data, error } = await supabase
        .from('users')
        .insert([{
            username,
            email,
            password_hash: passwordHash,
            role: 'user',
            is_verified: false,
            verification_code: verificationCode,
            code_expires_at: expiresAt
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Deletes an unverified user by email so they can re-signup.
 * Safety: only deletes rows where is_verified === false.
 */
export async function deleteUnverifiedUser(email: string) {
    if (!supabase) throw new Error('Database not configured');

    const { error } = await supabase
        .from('users')
        .delete()
        .eq('email', email)
        .eq('is_verified', false);

    if (error) throw error;
}


export async function verifyUserCode(email: string, code: string) {
    if (!supabase) throw new Error('Database not configured');

    const { data: user, error } = await supabase
        .from('users')
        .select('id, verification_code, code_expires_at')
        .eq('email', email)
        .single();

    if (error || !user) throw new Error('User not found');

    if (user.verification_code !== code) throw new Error('Invalid verification code');

    const now = new Date();
    if (new Date(user.code_expires_at) < now) throw new Error('Verification code expired');

    const { error: updateError } = await supabase
        .from('users')
        .update({
            is_verified: true,
            verification_code: null,
            code_expires_at: null
        })
        .eq('id', user.id);

    if (updateError) throw updateError;
    return true;
}

export async function findUserByIdentifier(identifier: string) {
    if (!supabase) throw new Error('Database not configured');

    // Search by username OR email
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`username.eq.${identifier},email.eq.${identifier}`)
        .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
    return data;
}

export async function getAllUsers() {
    if (!supabase) throw new Error('Database not configured');

    const { data, error } = await supabase
        .from('users')
        .select('id, username, email, role, is_verified, created_at')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

export async function updateUserRole(userId: string, role: string) {
    if (!supabase) throw new Error('Database not configured');

    const { data, error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', userId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getAllTopics(status?: string) {
    if (!supabase) return [];

    let query = supabase
        .from('topics')
        .select(`
            *,
            created_by (username),
            topic_tags (
                tags (name)
            )
        `);

    if (status) {
        query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

/**
 * --- TOPIC & HASHTAG SERVICES ---
 */

export async function getActiveTopics(tag?: string) {
    if (!supabase) return [];

    let query = supabase
        .from('topics')
        .select(`
            *,
            created_by (username),
            topic_tags (
                tags (name)
            )
        `)
        .eq('status', 'active');

    if (tag) {
        // This is a simplified filter for a junction table in Supabase
        // In a real production app, we'd use a RPC or a more complex query
        // For now, we'll fetch all and filter in JS if needed, or use a simpler tag approach
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function getPendingTopics() {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('topics')
        .select(`
            *,
            created_by (username),
            topic_tags (
                tags (name)
            )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

export async function submitTopic(title: string, description: string, userId: string, tags: string[], thumbnailUrl?: string) {
    if (!supabase) throw new Error('Database not configured');

    // 1. Insert Topic
    const { data: topic, error: topicError } = await supabase
        .from('topics')
        .insert([{
            title,
            description,
            created_by: userId,
            status: 'pending',
            thumbnail_url: thumbnailUrl
        }])
        .select()
        .single();

    if (topicError) throw topicError;

    // 2. Handle Tags
    if (tags && tags.length > 0) {
        for (const tagName of tags) {
            const cleanTag = tagName.replace('#', '').toLowerCase();

            // Find or create tag
            let { data: tag, error: tagError } = await supabase
                .from('tags')
                .select('id')
                .eq('name', cleanTag)
                .single();

            if (!tag) {
                const { data: newTag, error: createTagError } = await supabase
                    .from('tags')
                    .insert([{ name: cleanTag }])
                    .select()
                    .single();
                tag = newTag;
            }

            // Link to topic
            if (tag) {
                await supabase
                    .from('topic_tags')
                    .insert([{ topic_id: topic.id, tag_id: tag.id }]);
            }
        }
    }

    return topic;
}

export async function updateTopicStatus(topicId: string, status: 'active' | 'archived') {
    if (!supabase) throw new Error('Database not configured');

    const { data, error } = await supabase
        .from('topics')
        .update({ status })
        .eq('id', topicId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Uploads an image to Supabase Storage.
 */
export async function uploadImage(bucket: string, fileName: string, buffer: Buffer, mimeType: string) {
    if (!supabase) {
        console.error('[Supabase] Storage error: Client not initialized');
        throw new Error('Database storage not configured');
    }

    console.log(`[Supabase] Uploading to ${bucket}/${fileName} (${mimeType})...`);

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, buffer, {
            contentType: mimeType,
            upsert: true
        });

    if (error) {
        console.error('[Supabase] Storage upload error:', error);
        throw new Error(`Failed to upload to storage: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

    console.log(`[Supabase] Upload successful: ${publicUrl}`);
    return publicUrl;
}
