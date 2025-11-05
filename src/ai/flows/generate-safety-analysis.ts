'use server';

/**
 * @fileOverview AI-powered safety analysis flow based on a work activity description.
 *
 * - generateSafetyAnalysis - A function that generates a safety analysis.
 * - SafetyAnalysisInput - The input type for the generateSafetyAnalysis function.
 * - SafetyAnalysisOutput - The return type for the generateSafetyAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SafetyAnalysisInputSchema = z.object({
  activityDescription: z
    .string()
    .describe('A description of the work activity to be performed.'),
});
export type SafetyAnalysisInput = z.infer<typeof SafetyAnalysisInputSchema>;

const SafetyAnalysisOutputSchema = z.object({
  risks: z.string().describe('Potential risks associated with the activity.'),
  hazards: z.string().describe('Potential hazards associated with the activity.'),
  preventiveMeasures: z
    .string()
    .describe('Preventive measures to mitigate the risks and hazards.'),
  epiRecommendations: z
    .string()
    .describe('Recommended Equipamento de Proteção Individual (EPI) for the activity'),
});
export type SafetyAnalysisOutput = z.infer<typeof SafetyAnalysisOutputSchema>;

export async function generateSafetyAnalysis(
  input: SafetyAnalysisInput
): Promise<SafetyAnalysisOutput> {
  return generateSafetyAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'safetyAnalysisPrompt',
  input: {schema: SafetyAnalysisInputSchema},
  output: {schema: SafetyAnalysisOutputSchema},
  prompt: `You are an AI assistant specialized in workplace safety, with expertise in Brazilian Normas Regulamentadoras (NRs).

  Based on the following work activity description, generate a safety analysis, including potential risks, hazards, preventive measures, and recommended Equipamento de Proteção Individual (EPI).

  Activity Description: {{{activityDescription}}}

  Provide the output in a structured format.
  `,
});

const generateSafetyAnalysisFlow = ai.defineFlow(
  {
    name: 'generateSafetyAnalysisFlow',
    inputSchema: SafetyAnalysisInputSchema,
    outputSchema: SafetyAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
