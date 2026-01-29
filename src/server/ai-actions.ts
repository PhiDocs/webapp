
'use server';

import { configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Configure Genkit once, right here in a server-only context.
configureGenkit({
    plugins: [googleAI()],
    logLevel: 'silent',
    enableTracingAndMetrics: false,
});

import { generateSafetyAnalysis, type SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import { recommendProtectiveEquipment, type ProtectiveEquipmentOutput } from '@/ai/flows/recommend-protective-equipment';
import { z } from 'zod';
import { ptBr } from '@/lib/data/strings';
import { ErrorLogRepository } from '@/repositories/error-log.repository';

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
  } catch (e: any) {
    console.error("Error in getSafetyAnalysis:", e);
    await ErrorLogRepository.log(e, 'getSafetyAnalysis');

    let errorMessage = ptBr.validations.safetyAnalysisFailed;
    if (e.message?.toLowerCase().includes('api key')) {
        errorMessage = 'A chave de API do Gemini não foi configurada corretamente no servidor. Verifique as variáveis de ambiente.';
    }

    return { data: null, error: errorMessage };
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
  } catch (e: any) {
    console.error("Error in getProtectiveEquipment:", e);
    await ErrorLogRepository.log(e, 'getProtectiveEquipment');
    
    let errorMessage = ptBr.validations.equipmentRecommendationFailed;
    if (e.message?.toLowerCase().includes('api key')) {
        errorMessage = 'A chave de API do Gemini não foi configurada corretamente no servidor. Verifique as variáveis de ambiente.';
    }
    
    return { data: null, error: errorMessage };
  }
}
