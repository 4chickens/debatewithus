import { createClient } from '@deepgram/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../../.env') });

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

export const setupDeepgramStream = (onTranscript: (text: string) => void) => {
    const connection = deepgram.listen.live({
        model: 'nova-2',
        smart_format: true,
        interim_results: true,
        language: 'en-US',
    });

    connection.on('open', () => {
        console.log('Deepgram connection opened');
    });

    connection.on('Results', (data) => {
        const transcript = data.channel.alternatives[0].transcript;
        if (transcript && data.is_final) {
            onTranscript(transcript);
        }
    });

    connection.on('error', (err) => {
        console.error('Deepgram error:', err);
    });

    return connection;
};
