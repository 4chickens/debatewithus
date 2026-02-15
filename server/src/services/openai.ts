import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyzes a snippet of debate text and returns a momentum delta (-10 to 10).
 */
export async function analyzeDebateImpact(text: string, phase: string): Promise<number> {
    if (!process.env.OPENAI_API_KEY) {
        console.warn('OpenAI API key missing, returning neutral delta.');
        return 0;
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are an AI judge for a fast-paced debate game. 
          Given a transcript snippet from the "${phase}" phase, evaluate its impact.
          Return ONLY a single integer between -10 and 10.
          Positive = Better for the Right side.
          Negative = Better for the Left side.
          Consider logic, rhetoric, and aggression.`
                },
                { role: "user", content: text }
            ],
            temperature: 0,
        });

        const result = parseInt(response.choices[0].message.content?.trim() || "0");
        return isNaN(result) ? 0 : result;
    } catch (err) {
        console.error('OpenAI Analysis failed:', err);
        return 0;
    }
}
