'use server';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
});

export const geminiPro = process.env.GENAI_MODEL || 'googleai/gemini-pro';
