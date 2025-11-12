'use server';

import { generateSafetyAnalysis, type SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import { recommendProtectiveEquipment, type ProtectiveEquipmentOutput } from '@/ai/flows/recommend-protective-equipment';
import { z } from 'zod';

const actionSchema = z.object({
  activityDescription: z.string().min(10, 'A descrição da atividade deve ter pelo menos 10 caracteres.'),
});

export async function getSafetyAnalysis(data: { activityDescription: string }): Promise<{ data: SafetyAnalysisOutput | null; error: string | null }> {
  const parsed = actionSchema.safeParse(data);
  if (!parsed.success) {
    return { data: null, error: 'Entrada inválida.' };
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
  const parsed = actionSchema.safeParse(data);
  if (!parsed.success) {
    return { data: null, error: 'Entrada inválida.' };
  }

  try {
    const equipment = await recommendProtectiveEquipment(parsed.data);
    return { data: equipment, error: null };
  } catch (e) {
    console.error(e);
    return { data: null, error: 'Falha ao gerar recomendações de equipamento. Por favor, tente novamente mais tarde.' };
  }
}

export async function testN8nConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    // Use a relative path for the API call to ensure it works in any environment.
    const response = await fetch('/api/n8n-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'Conexão com n8n funcionando!', timestamp: new Date().toISOString() }),
    });

    if (!response.ok) {
        const errorDetails = await response.json();
        console.error('Falha ao notificar o n8n (testN8nConnection):', errorDetails);
        return { success: false, error: 'A API retornou um erro.', details: errorDetails };
    }
    
    const responseData = await response.json();
    return { success: true, details: responseData };
  } catch (error: any) {
    console.error('Erro ao chamar o webhook de teste do n8n:', error);
    return { success: false, error: 'Falha na conexão com a API de webhook.', details: error.message };
  }
}
