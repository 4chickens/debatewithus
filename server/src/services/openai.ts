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
 * Positive = Better for Right, Negative = Better for Left.
 */
export async function analyzeDebateImpact(text: string, phase: string, speakerSide: 'left' | 'right' | 'system'): Promise<number> {
    if (!process.env.OPENAI_API_KEY) {
        console.warn('OpenAI API key missing, returning neutral delta.');
        return 0;
    }

    if (speakerSide === 'system') return 0;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are an expert AI judge for a fast-paced debate game. 
          Given a transcript snippet from the "${phase}" phase, spoken by the ${speakerSide.toUpperCase()} player.
          
          MOMENTUM SCORING RULES:
          - The game tracks momentum on a scale where Left = Negative and Right = Positive.
          - If the ${speakerSide.toUpperCase()} player makes a strong, logical, or persuasive point, you MUST award them points in THEIR direction.
          - If ${speakerSide.toUpperCase()} is LEFT: a good point should be a NEGATIVE integer (e.g., -5).
          - If ${speakerSide.toUpperCase()} is RIGHT: a good point should be a POSITIVE integer (e.g., +5).
          - Neutral or weak points should be close to 0.
          - Extremely strong points can be up to 10 (or -10).
          
          Return ONLY a single integer between -10 and 10.
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

/**
 * Generates a counter-argument from the AI opponent.
 */
export async function generateAIResponse(
    topic: { title: string, description: string },
    recentTranscripts: string[],
    difficulty: 'easy' | 'medium' | 'hard',
    phase: string
): Promise<string> {
    if (!process.env.OPENAI_API_KEY) return "The silence of the machine is my only argument.";

    const difficultyPrompts = {
        easy: "logical but simple, sometimes making minor errors or using circular reasoning.",
        medium: "coherent, logic-driven, and persuasive.",
        hard: "highly aggressive, utilizing advanced rhetorical techniques, philosophy, and cutting logic."
    };

    const phaseInstructions: Record<string, string> = {
        Opening_P2: "Provide a strong opening statement supporting your position. Establish your core arguments.",
        Rebuttal_P2: "Directly address and dismantle the last points made by the opponent. Use logic to invalidate their claims.",
        Crossfire: "Engage in quick, sharp exchanges. Keep it punchy and defensive/offensive as needed.",
        Closing_P2: "Summarize your strongest points and provide a powerful concluding statement on why you won."
    };

    const instruction = phaseInstructions[phase] || "Respond to the debate.";

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are an expert debater (AI) competing in a real-time game. 
          The topic is: "${topic.title} - ${topic.description}".
          You are Player 2 (Right Side), arguing against Player 1 (Human).
          
          CURRENT PHASE: ${phase}.
          TASK: ${instruction}
          
          STYLE: Your response should be ${difficultyPrompts[difficulty]}
          Keep it concise (max 3 sentences) to maintain game pace.`
                },
                {
                    role: "user",
                    content: `Recent debate history: ${recentTranscripts.slice(-5).join(' | ')}. Provide your response.`
                }
            ],
            temperature: difficulty === 'easy' ? 0.9 : 0.6,
        });

        return response.choices[0].message.content?.trim() || "I await your next point.";
    } catch (err) {
        console.error('AI Response generation failed:', err);
        return "System error: Cognitive processors offline.";
    }
}
