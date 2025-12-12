'use server';

import { generateSafetyAnalysis, type SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import { recommendProtectiveEquipment, type ProtectiveEquipmentOutput } from '@/ai/flows/recommend-protective-equipment';
import { formSchema } from '@/lib/types';

export async function getSafetyAnalysis(data: { activityDescription: string }): Promise<{ data: SafetyAnalysisOutput | null; error: string | null }> {
  const parsed = formSchema.partial().safeParse({ activityDescription: data.activityDescription });
  
  if (!parsed.success) {
    const errorMessage = parsed.error.errors.map((e) => e.message).join(', ');
    return { data: null, error: `Entrada inválida: ${errorMessage}` };
  }

  try {
    const analysis = await generateSafetyAnalysis(parsed.data);
    return { data: analysis, error: null };
  } catch (e) {
    console.error(e);
    return { data: null, error: 'Falha ao gerar a análise de segurança. Por favor, tente novamente mais tarde.' };
  }
}

export async function getProtectiveEquipment(data: { activityDescription: string }): Promise<{ data: ProtectiveEquipmentOutput | null; error: string | null }> {
    const parsed = formSchema.partial().safeParse({ activityDescription: data.activityDescription });

  if (!parsed.success) {
    const errorMessage = parsed.error.errors.map((e) => e.message).join(', ');
    return { data: null, error: `Entrada inválida: ${errorMessage}` };
  }

  try {
    const equipment = await recommendProtectiveEquipment(parsed.data);
    return { data: equipment, error: null };
  } catch (e) {
    console.error(e);
    return { data: null, error: 'Falha ao gerar recomendações de equipamento. Por favor, tente novamente mais tarde.' };
  }
}
