'use server';
/**
 * @fileOverview Recommends necessary EPIs (Equipamento de Proteção Individual) based on the described work activity.
 *
 * - recommendEPI - A function that handles the EPI recommendation process.
 * - RecommendEPIInput - The input type for the recommendEPI function.
 * - RecommendEPIOutput - The return type for the recommendEPI function.
 */

import { ai, geminiPro } from '@/ai/genkit';
import * as z from 'zod';

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

const recommendEPIFlow = ai.defineFlow(
  {
    name: 'recommendEPIFlow',
    inputSchema: RecommendEPIInputSchema,
    outputSchema: RecommendEPIOutputSchema,
  },
  async (input) => {
    const prompt = `Based on the following work activity description, recommend the necessary EPIs (Equipamento de Proteção Individual) according to Brazilian Normas Regulamentadoras (NRs).

    Activity Description: ${input.activityDescription}

    Provide the output as a JSON object with a single key "epiRecommendations" containing a string list of EPIs.
    Schema: ${JSON.stringify(RecommendEPIOutputSchema.shape)}`;
    
    const response = await ai.generate({
      model: geminiPro,
      prompt: prompt,
      output: {
        format: 'json',
        schema: RecommendEPIOutputSchema,
      },
    });
    
    const output = response.output();
    if (!output) {
      throw new Error("AI response is empty or invalid.");
    }
    
    return output;
  }
);
