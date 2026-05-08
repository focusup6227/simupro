import 'dotenv/config';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Genkit will use GEMINI_API_KEY from the environment by default.
// Configure a default model so individual flows don't need to pass `model` explicitly.
export const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash'),
});
