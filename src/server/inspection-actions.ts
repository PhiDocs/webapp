'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { inspectionActionFormSchema, inspectionFormSchema, inspectionItemFormSchema } from '@/lib/types';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { InspectionRepository } from '@/repositories/inspection.repository';
import { requireAuth } from '@/server/auth-guard';

const inspectionServerSchema = inspectionFormSchema.extend({
  companyId: z.string().min(1, 'ID da empresa e obrigatorio.'),
});

const itemListSchema = z.object({
  companyId: z.string().min(1, 'ID da empresa e obrigatorio.'),
  items: z.array(inspectionItemFormSchema),
});

const actionServerSchema = inspectionActionFormSchema.extend({
  companyId: z.string().min(1, 'ID da empresa e obrigatorio.'),
  inspecao_id: z.string().min(1, 'ID da inspecao e obrigatorio.'),
  item_id: z.string().optional(),
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

export async function getInspectionModuleData(companyId: string) {
  if (!companyId) return { success: false, error: 'ID da empresa nao fornecido.' };

  try {
    await requireAuth({ matchCompanyId: companyId, requireCompany: true });
    const data = await InspectionRepository.getBundle(companyId);
    return { success: true, data };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao buscar inspecoes.');
    await ErrorLogRepository.log(new Error(message), 'getInspectionModuleData');
    return { success: false, error: message };
  }
}

export async function createInspection(data: z.infer<typeof inspectionServerSchema>) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
  } catch (e: any) {
    return { success: false, error: e.message || 'Acesso negado.' };
  }

  const validation = inspectionServerSchema.safeParse(data);
  if (!validation.success) {
    const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  try {
    const templateItems = await InspectionRepository.getTemplateItems(validation.data.companyId);
    const initialItems = InspectionRepository.getInitialItems(
      validation.data.companyId,
      validation.data.checklist_modelo_id || '',
      templateItems,
    );
    const id = await InspectionRepository.createInspection(validation.data, initialItems);
    revalidatePath(`/company/${validation.data.companyId}`);
    return { success: true, id };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao criar inspecao.');
    await ErrorLogRepository.log(new Error(message), 'createInspection');
    return { success: false, error: message };
  }
}

export async function updateInspection(id: string, data: z.infer<typeof inspectionServerSchema>) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
  } catch (e: any) {
    return { success: false, error: e.message || 'Acesso negado.' };
  }

  const validation = inspectionServerSchema.safeParse(data);
  if (!validation.success) {
    const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  try {
    await InspectionRepository.updateInspection(id, validation.data);
    revalidatePath(`/company/${validation.data.companyId}`);
    return { success: true };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao atualizar inspecao.');
    await ErrorLogRepository.log(new Error(message), 'updateInspection');
    return { success: false, error: message };
  }
}

export async function saveInspectionItems(inspectionId: string, data: z.infer<typeof itemListSchema>) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
  } catch (e: any) {
    return { success: false, error: e.message || 'Acesso negado.' };
  }

  const validation = itemListSchema.safeParse(data);
  if (!validation.success) {
    const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  try {
    await InspectionRepository.replaceItems(inspectionId, validation.data.companyId, validation.data.items);
    revalidatePath(`/company/${validation.data.companyId}`);
    return { success: true };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao salvar checklist.');
    await ErrorLogRepository.log(new Error(message), 'saveInspectionItems');
    return { success: false, error: message };
  }
}

export async function archiveInspection(id: string, companyId: string) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: companyId, requireCompany: true });
    await InspectionRepository.archiveInspection(id, companyId);
    revalidatePath(`/company/${companyId}`);
    return { success: true };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao arquivar inspecao.');
    await ErrorLogRepository.log(new Error(message), 'archiveInspection');
    return { success: false, error: message };
  }
}

export async function createInspectionAction(data: z.infer<typeof actionServerSchema>) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
  } catch (e: any) {
    return { success: false, error: e.message || 'Acesso negado.' };
  }

  const validation = actionServerSchema.safeParse(data);
  if (!validation.success) {
    const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  try {
    const id = await InspectionRepository.createAction(validation.data);
    revalidatePath(`/company/${validation.data.companyId}`);
    return { success: true, id };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao criar plano de acao.');
    await ErrorLogRepository.log(new Error(message), 'createInspectionAction');
    return { success: false, error: message };
  }
}
