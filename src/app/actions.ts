'use server';

import { generateSafetyAnalysis, type SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import { z } from 'zod';

const actionSchema = z.object({
  activityDescription: z.string(),
});

export async function getSafetyAnalysis(data: { activityDescription: string }): Promise<{ data: SafetyAnalysisOutput | null; error: string | null }> {
  const parsed = actionSchema.safeParse(data);
  if (!parsed.success) {
    return { data: null, error: 'Invalid input.' };
  }

  try {
    const analysis = await generateSafetyAnalysis(parsed.data);
    return { data: analysis, error: null };
  } catch (e) {
    console.error(e);
    return { data: null, error: 'Failed to generate safety analysis. Please try again later.' };
  }
}
