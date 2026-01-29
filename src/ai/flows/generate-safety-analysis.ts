'use server';

/**
 * @fileOverview AI-powered safety analysis flow based on a work activity description.
 *
 * - generateSafetyAnalysis - A function that generates a safety analysis.
 * - SafetyAnalysisInput - The input type for the generateSafetyAnalysis function.
 * - SafetyAnalysisOutput - The return type for the generateSafetyAnalysis function.
 */

import { defineFlow, generate } from 'genkit';
import { geminiPro } from '@genkit-ai/googleai';
import * as z from 'zod';

const SafetyAnalysisInputSchema = z.object({
  activityDescription: z
    .string()
    .describe('A description of the work activity to be performed.'),
});
export type SafetyAnalysisInput = z.infer<typeof SafetyAnalysisInputSchema>;

const ProceduralStepSchema = z.object({
    item: z.number().describe('The sequential item number for the operational procedure step.'),
    activity: z.string().describe('The specific activity or step in the operational procedure.'),
    potentialRisks: z.string().describe('The potential risks associated with this specific activity. What could go wrong.'),
    preventiveMeasures: z.string().describe('The preventive measures and safety recommendations for this step, based on Brazilian NRs. This should include necessary EPIs.'),
});

const SafetyAnalysisOutputSchema = z.object({
  proceduralSteps: z.array(ProceduralStepSchema).describe('An array of detailed operational procedure steps for the described work activity. Generate a comprehensive list of steps, from preparation to completion.'),
});
export type SafetyAnalysisOutput = z.infer<typeof SafetyAnalysisOutputSchema>;

export async function generateSafetyAnalysis(
  input: SafetyAnalysisInput
): Promise<SafetyAnalysisOutput> {
  return generateSafetyAnalysisFlow(input);
}

const generateSafetyAnalysisFlow = defineFlow(
  {
    name: 'generateSafetyAnalysisFlow',
    inputSchema: SafetyAnalysisInputSchema,
    outputSchema: SafetyAnalysisOutputSchema,
  },
  async (input) => {
    const prompt = `You are an AI assistant specialized in workplace safety, with expertise in Brazilian Normas Regulamentadoras (NRs).

    Based on the following work activity description, generate a detailed operational procedure. For each step of the procedure, identify the activity, its potential risks, and the corresponding preventive measures and safety recommendations.

    The output must be a valid JSON object that conforms to the following Zod schema. Do not include any text or markdown formatting outside of the JSON object itself.
    Schema: ${JSON.stringify(SafetyAnalysisOutputSchema.shape)}

    Example of a step:
    - item: 1
    - activity: "1. TREINAMENTO DE 'ST' DA ATIVIDADE;"
    - potentialRisks: "1.1. Passar pelo Treinamento e/ou retirada da Obra."
    - preventiveMeasures: "1.1.1. Antes de iniciar as atividades contidas nesta APR, deverá ser realizado um treinamento aos envolvidos nas tarefas, e instruí-los sobre os EPI's necessários: Capacete de Segurança, Botinas de couro, Luvas de multitato, Óculos de segurança, Protetor solar; Protetor Auditivo (Plug ou Concha);\\n1.1.2. As recomendações contidas neste documento deverão ser usadas neste treinamento;\\n1.1.3. O treinamento deverá ser ministrado pelo encarregado responsável e emitido lista de assinatura no verso de APR;\\n1.1.4. Antes de iniciar as atividades fornecer conhecimento aos envolvidos dos riscos inerentes a função."

    Activity Description: ${input.activityDescription}

    Generate a comprehensive list of procedural steps based on the user's activity description.
    `;

    const response = await generate({
      model: geminiPro,
      prompt: prompt,
      output: {
        format: 'json',
      },
    });

    const output = response.output();
    if (!output) {
      throw new Error("AI response is empty or invalid.");
    }

    // Validate the output against the schema before returning
    return SafetyAnalysisOutputSchema.parse(output);
  }
);
