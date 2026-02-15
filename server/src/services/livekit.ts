import { AccessToken } from 'livekit-server-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../../.env') });

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

/**
 * Generates a LiveKit access token for a user.
 * @param roomName The unique match ID/room name.
 * @param identity The user's unique identity (e.g., username).
 * @param isHost Whether the user is a host (player) or spectator.
 */
export const generateToken = async (roomName: string, identity: string, isHost: boolean = false) => {
    if (!apiKey || !apiSecret) {
        console.error('[LiveKit] Missing API Key or Secret. Token generation failed.');
        throw new Error('LiveKit configuration is missing on the server. Please check environment variables.');
    }

    try {
        const at = new AccessToken(apiKey, apiSecret, {
            identity,
        });

        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: isHost,
            canSubscribe: true,
            canPublishData: true,
        });

        return await at.toJwt();
    } catch (err) {
        console.error('[LiveKit] Token generation error:', err);
        throw new Error('Failed to generate LiveKit token.');
    }
};
