
'use server';

import { generateSafetyAnalysis, type SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import { recommendProtectiveEquipment, type ProtectiveEquipmentOutput } from '@/ai/flows/recommend-protective-equipment';
import { z } from 'zod';
import { ptBr } from '@/lib/data/strings';

// Define a schema specifically for the input of these functions
const activitySchema = z.object({
    activityDescription: z.string().min(10, ptBr.validations.activityDescription),
});

export async function getSafetyAnalysis(data: { activityDescription: string }): Promise<{ data: SafetyAnalysisOutput | null; error: string | null }> {
  const parsed = activitySchema.safeParse(data);
  
  if (!parsed.success) {
    const errorMessage = parsed.error.errors.map((e) => e.message).join(', ');
    return { data: null, error: ptBr.validations.invalidInput.replace('{{details}}', errorMessage) };
  }

  try {
    const analysis = await generateSafetyAnalysis(parsed.data);
    return { data: analysis, error: null };
  } catch (e) {
    console.error(e);
    return { data: null, error: ptBr.validations.safetyAnalysisFailed };
  }
}

export async function getProtectiveEquipment(data: { activityDescription: string }): Promise<{ data: ProtectiveEquipmentOutput | null; error: string | null }> {
  const parsed = activitySchema.safeParse(data);

  if (!parsed.success) {
    const errorMessage = parsed.error.errors.map((e) => e.message).join(', ');
    return { data: null, error: ptBr.validations.invalidInput.replace('{{details}}', errorMessage) };
  }

  try {
    const equipment = await recommendProtectiveEquipment(parsed.data);
    return { data: equipment, error: null };
  } catch (e) {
    console.error(e);
    return { data: null, error: ptBr.validations.equipmentRecommendationFailed };
  }
}
