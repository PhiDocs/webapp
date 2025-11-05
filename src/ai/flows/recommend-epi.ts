'use server';
/**
 * @fileOverview Recommends necessary EPIs (Equipamento de Proteção Individual) based on the described work activity.
 *
 * - recommendEPI - A function that handles the EPI recommendation process.
 * - RecommendEPIInput - The input type for the recommendEPI function.
 * - RecommendEPIOutput - The return type for the recommendEPI function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendEPIInputSchema = z.object({
  activityDescription: z.string().describe('The description of the work activity to be performed.'),
});
export type RecommendEPIInput = z.infer<typeof RecommendEPIInputSchema>;

const RecommendEPIOutputSchema = z.object({
  epiRecommendations: z.string().describe('The recommended EPIs for the described work activity.'),
});
export type RecommendEPIOutput = z.infer<typeof RecommendEPIOutputSchema>;

export async function recommendEPI(input: RecommendEPIInput): Promise<RecommendEPIOutput> {
  return recommendEPIFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendEPIPrompt',
  input: {schema: RecommendEPIInputSchema},
  output: {schema: RecommendEPIOutputSchema},
  prompt: `Based on the following work activity description, recommend the necessary EPIs (Equipamento de Proteção Individual) according to Brazilian Normas Regulamentadoras (NRs).

Activity Description: {{{activityDescription}}}

Provide a list of EPIs.`,
});

const recommendEPIFlow = ai.defineFlow(
  {
    name: 'recommendEPIFlow',
    inputSchema: RecommendEPIInputSchema,
    outputSchema: RecommendEPIOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
