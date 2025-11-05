'use server';
/**
 * @fileOverview Recommends necessary EPIs (Equipamento de Proteção Individual) 
 * and EPCs (Equipamento de Proteção Coletiva) based on the described work activity.
 *
 * - recommendProtectiveEquipment - A function that handles the EPI and EPC recommendation process.
 * - ProtectiveEquipmentInput - The input type for the recommendProtectiveEquipment function.
 * - ProtectiveEquipmentOutput - The return type for the recommendProtectiveEquipment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProtectiveEquipmentInputSchema = z.object({
  activityDescription: z.string().describe('The description of the work activity to be performed.'),
});
export type ProtectiveEquipmentInput = z.infer<typeof ProtectiveEquipmentInputSchema>;

const ProtectiveEquipmentOutputSchema = z.object({
  epiItems: z.array(z.string()).describe('A list of recommended Individual Protection Equipment (EPI) items.'),
  epiNote: z.string().describe('An observation note regarding EPI regulations and requirements, mentioning NR06.'),
  epcItems: z.array(z.string()).describe('A list of recommended Collective Protection Equipment (EPC) items.'),
  epcNote: z.string().describe('An observation note regarding EPC integrity and project conformity.'),
});
export type ProtectiveEquipmentOutput = z.infer<typeof ProtectiveEquipmentOutputSchema>;

export async function recommendProtectiveEquipment(input: ProtectiveEquipmentInput): Promise<ProtectiveEquipmentOutput> {
  return recommendProtectiveEquipmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendProtectiveEquipmentPrompt',
  input: {schema: ProtectiveEquipmentInputSchema},
  output: {schema: ProtectiveEquipmentOutputSchema},
  prompt: `You are an expert in Brazilian workplace safety regulations (Normas Regulamentadoras - NRs). Based on the following work activity description, provide a list of necessary Individual Protection Equipment (EPI) and Collective Protection Equipment (EPC).

Activity Description: {{{activityDescription}}}

Provide the output as a structured JSON object.

For the EPIs, list the essential equipment. Then, for the 'epiNote', provide a standard observation referencing NR06 and the need for equipment to be certified. For example: "Todos os Equipamentos de Proteção Individual (EPI), devem atender os requisitos da NR06, estar válido e conformidade com os órgãos fiscalizadores para utilização na atividade."

For the EPCs, list the necessary collective equipment. Then, for the 'epcNote', provide a standard observation about verifying the integrity and conformity of the equipment. For example: "Todos os Equipamentos de Proteção Coletiva (EPC), devem ser verificados quanto a integridade e conformidade com o projeto específico antes de iniciar a atividade."
`,
});

const recommendProtectiveEquipmentFlow = ai.defineFlow(
  {
    name: 'recommendProtectiveEquipmentFlow',
    inputSchema: ProtectiveEquipmentInputSchema,
    outputSchema: ProtectiveEquipmentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
