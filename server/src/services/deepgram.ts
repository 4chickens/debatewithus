import { createClient } from '@deepgram/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../../.env') });

const apiKey = process.env.DEEPGRAM_API_KEY;

if (!apiKey) {
    console.warn('[Deepgram] WARNING: DEEPGRAM_API_KEY is not set. Voice transcription will be disabled.');
}

/**
 * Creates a Deepgram live transcription stream.
 * Returns null if the API key is missing, so callers can gracefully skip.
 * @param onTranscript - Callback for final transcript strings
 */
export const setupDeepgramStream = (onTranscript: (text: string) => void) => {
    if (!apiKey) {
        console.warn('[Deepgram] Skipping stream setup: API key not configured.');
        return null;
    }

    const deepgram = createClient(apiKey);

    const connection = deepgram.listen.live({
        model: 'nova-2',
        smart_format: true,
        interim_results: true,
        language: 'en-US',
    });

    connection.on('open', () => {
        console.log('[Deepgram] Connection opened.');
    });

    connection.on('Results', (data: any) => {
        const transcript = data?.channel?.alternatives?.[0]?.transcript;
        if (transcript && data.is_final) {
            onTranscript(transcript);
        }
    });

    connection.on('error', (err: any) => {
        // Log concisely — the full stack trace is not useful in production
        console.error('[Deepgram] Stream error:', err?.message || err);
    });

    connection.on('close', () => {
        console.log('[Deepgram] Connection closed.');
    });

    return connection;
};
