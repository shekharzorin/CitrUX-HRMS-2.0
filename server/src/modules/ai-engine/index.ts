import axios from 'axios';

/**
 * Provider-agnostic LLM completion. The single external-AI boundary so callers
 * (e.g. support-desk ticket routing) stay provider-neutral. Provider chosen via
 * AI_PROVIDER env (groq | openai | gemini), default groq. Bounded by a timeout.
 */
const PROVIDER = (process.env.AI_PROVIDER || 'groq').toLowerCase();
const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || '15000');

export class AiEngine {
    static provider(): string {
        return PROVIDER;
    }

    /** Returns the model's text output. Throws on missing key / timeout / HTTP error. */
    static async complete(system: string, user: string): Promise<string> {
        if (PROVIDER === 'gemini') return this.gemini(system, user);
        return this.openAiCompatible(system, user); // groq + openai share the schema
    }

    private static async openAiCompatible(system: string, user: string): Promise<string> {
        const isOpenAi = PROVIDER === 'openai';
        const url = isOpenAi
            ? 'https://api.openai.com/v1/chat/completions'
            : 'https://api.groq.com/openai/v1/chat/completions';
        const key = isOpenAi ? process.env.OPENAI_API_KEY : process.env.GROQ_API_KEY;
        if (!key) throw new Error(`AI provider key missing for "${PROVIDER}"`);
        const model = isOpenAi
            ? (process.env.OPENAI_MODEL || 'gpt-4o-mini')
            : (process.env.GROQ_MODEL || 'llama-3.1-8b-instant');

        const res = await axios.post(
            url,
            { model, temperature: 0, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] },
            { headers: { Authorization: `Bearer ${key}` }, timeout: TIMEOUT_MS },
        );
        return res.data?.choices?.[0]?.message?.content ?? '';
    }

    private static async gemini(system: string, user: string): Promise<string> {
        const key = process.env.GEMINI_API_KEY;
        if (!key) throw new Error('AI provider key missing for "gemini"');
        const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const res = await axios.post(
            url,
            { contents: [{ parts: [{ text: `${system}\n\n${user}` }] }] },
            { timeout: TIMEOUT_MS },
        );
        return res.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    }
}
