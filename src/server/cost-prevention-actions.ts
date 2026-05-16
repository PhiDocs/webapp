'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { costPreventionFormSchema } from '@/lib/types';
import { CostPreventionRepository } from '@/repositories/cost-prevention.repository';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { requireAuth } from '@/server/auth-guard';

const costServerSchema = costPreventionFormSchema.extend({
  companyId: z.string().min(1, 'ID da empresa e obrigatorio.'),
});

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const message = record.message || record.details || record.error;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

export async function getCostPreventionModuleData(companyId: string) {
  if (!companyId) return { success: false, error: 'ID da empresa nao fornecido.' };

  try {
    await requireAuth({ matchCompanyId: companyId, requireCompany: true });
    const data = await CostPreventionRepository.getBundle(companyId);
    return { success: true, data };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao buscar custos.');
    await ErrorLogRepository.log(new Error(message), 'getCostPreventionModuleData');
    return { success: false, error: message };
  }
}

export async function createCostPrevention(data: z.infer<typeof costServerSchema>) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
  } catch (e: any) {
    return { success: false, error: e.message || 'Acesso negado.' };
  }

  const validation = costServerSchema.safeParse(data);
  if (!validation.success) {
    const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  try {
    const id = await CostPreventionRepository.create(validation.data);
    revalidatePath(`/company/${validation.data.companyId}`);
    return { success: true, id };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao criar custo.');
    await ErrorLogRepository.log(new Error(message), 'createCostPrevention');
    return { success: false, error: message };
  }
}

export async function updateCostPrevention(id: string, data: z.infer<typeof costServerSchema>) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
  } catch (e: any) {
    return { success: false, error: e.message || 'Acesso negado.' };
  }

  const validation = costServerSchema.safeParse(data);
  if (!validation.success) {
    const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  try {
    await CostPreventionRepository.update(id, validation.data);
    revalidatePath(`/company/${validation.data.companyId}`);
    return { success: true };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao atualizar custo.');
    await ErrorLogRepository.log(new Error(message), 'updateCostPrevention');
    return { success: false, error: message };
  }
}

export async function archiveCostPrevention(id: string, companyId: string) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: companyId, requireCompany: true });
    await CostPreventionRepository.archive(id, companyId);
    revalidatePath(`/company/${companyId}`);
    return { success: true };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao arquivar custo.');
    await ErrorLogRepository.log(new Error(message), 'archiveCostPrevention');
    return { success: false, error: message };
  }
}
