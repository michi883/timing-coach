/**
 * Gemini AI Service for phrase generation
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const phraseSchema = {
    type: SchemaType.OBJECT,
    properties: {
        phrase: { type: SchemaType.STRING, description: 'A natural phrase or conversation starter in the target language' },
        response: { type: SchemaType.STRING, description: 'A typical response someone might give, in the target language' },
        pronunciation: { type: SchemaType.STRING, description: 'Phonetic pronunciation guide for English speakers' },
        culturalNote: { type: SchemaType.STRING, description: 'Very brief (max 15 words) tip on delivery or cultural context' },
        translation: { type: SchemaType.STRING, description: 'Natural English translation of the phrase and response' },
    },
    required: ['phrase', 'response', 'pronunciation', 'culturalNote', 'translation'],
};

let model = null;

export function initGemini(apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: phraseSchema,
        },
    });
}

/**
 * Generate a culturally-adapted phrase for real-world communication
 * @param {Object} language - Language object
 * @param {Object} situation - Situation object  
 * @param {Object} deliveryStyle - Delivery style object
 * @returns {Promise<Object>} Generated phrase
 */
export async function generatePhrase(language, situation, deliveryStyle) {
    if (!model) throw new Error('Gemini not initialized');

    const prompt = `You are a cultural fluency coach helping international professionals and travelers communicate with confidence.

Generate a natural, practical phrase in ${language.name} for this situation: ${situation.name} (${situation.description}).

Delivery style: ${deliveryStyle.name} - ${deliveryStyle.description}

CRITICAL RULES:
- NEVER use placeholders like [name], [company], [city], [topic], etc. - the coach will speak these aloud and cannot pronounce brackets
- If a name is needed, use a real example name (e.g., "Sarah", "Tanaka-san", "Marco")
- If a company/place is needed, use a realistic example (e.g., "Acme Corp", "Tokyo office")
- SKIP basic greetings like "Hi, I'm Sarah" or "Nice to meet you"  
- Generate a CONCISE, meaningful phrase - MAX 5-8 WORDS
- The response should also be SHORT - max 5-8 words
- Examples of GOOD length: "What brings you here today?" / "I'm with the marketing team."
- Examples of BAD length: Long sentences with multiple clauses
- Focus on natural conversation that sounds confident
- Make it culturally authentic to ${language.name}
- Use names sparingly, only if natural
- Also provide a brief typical response`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const json = JSON.parse(text);

    return {
        id: Date.now().toString(),
        languageCode: language.code,
        situation: situation.id,
        phrase: json.phrase || '',
        response: json.response || '',
        pronunciation: json.pronunciation || '',
        culturalNote: json.culturalNote || '',
        translation: json.translation || '',
    };
}
