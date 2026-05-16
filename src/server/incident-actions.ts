'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { incidentConclusionSchema, incidentFormSchema } from '@/lib/types';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { IncidentRepository } from '@/repositories/incident.repository';
import { NonconformityRepository } from '@/repositories/nonconformity.repository';
import { requireAuth } from '@/server/auth-guard';

const incidentServerSchema = incidentFormSchema.extend({
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

export async function getIncidentModuleData(companyId: string) {
  if (!companyId) return { success: false, error: 'ID da empresa nao fornecido.' };

  try {
    await requireAuth({ matchCompanyId: companyId, requireCompany: true });
    const data = await IncidentRepository.getBundle(companyId);
    return { success: true, data };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao buscar incidentes.');
    await ErrorLogRepository.log(new Error(message), 'getIncidentModuleData');
    return { success: false, error: message };
  }
}

export async function createIncident(data: z.infer<typeof incidentServerSchema>) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
  } catch (e: any) {
    return { success: false, error: e.message || 'Acesso negado.' };
  }

  const validation = incidentServerSchema.safeParse(data);
  if (!validation.success) {
    const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  try {
    const id = await IncidentRepository.create(validation.data);
    revalidatePath(`/company/${validation.data.companyId}`);
    return { success: true, id };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao criar incidente.');
    await ErrorLogRepository.log(new Error(message), 'createIncident');
    return { success: false, error: message };
  }
}

export async function updateIncident(id: string, data: z.infer<typeof incidentServerSchema>) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
  } catch (e: any) {
    return { success: false, error: e.message || 'Acesso negado.' };
  }

  const validation = incidentServerSchema.safeParse(data);
  if (!validation.success) {
    const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  try {
    await IncidentRepository.update(id, validation.data);
    revalidatePath(`/company/${validation.data.companyId}`);
    return { success: true };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao atualizar incidente.');
    await ErrorLogRepository.log(new Error(message), 'updateIncident');
    return { success: false, error: message };
  }
}

export async function concludeIncident(id: string, companyId: string, data: z.infer<typeof incidentConclusionSchema>) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: companyId, requireCompany: true });
  } catch (e: any) {
    return { success: false, error: e.message || 'Acesso negado.' };
  }

  const validation = incidentConclusionSchema.safeParse(data);
  if (!validation.success) {
    const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  try {
    await IncidentRepository.conclude(id, companyId, validation.data);
    revalidatePath(`/company/${companyId}`);
    return { success: true };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao concluir investigacao.');
    await ErrorLogRepository.log(new Error(message), 'concludeIncident');
    return { success: false, error: message };
  }
}

export async function archiveIncident(id: string, companyId: string) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: companyId, requireCompany: true });
    await IncidentRepository.archive(id, companyId);
    revalidatePath(`/company/${companyId}`);
    return { success: true };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao arquivar incidente.');
    await ErrorLogRepository.log(new Error(message), 'archiveIncident');
    return { success: false, error: message };
  }
}

export async function createNonconformityFromIncident(id: string, companyId: string) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: companyId, requireCompany: true });
    const incident = (await IncidentRepository.getAll(companyId)).find((item) => item.id === id);
    if (!incident) return { success: false, error: 'Incidente nao encontrado.' };

    const payload = IncidentRepository.buildNonconformity(companyId, incident);
    const nonconformityId = await NonconformityRepository.create(payload);
    revalidatePath(`/company/${companyId}`);
    return { success: true, id: nonconformityId };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao criar nao conformidade a partir do incidente.');
    await ErrorLogRepository.log(new Error(message), 'createNonconformityFromIncident');
    return { success: false, error: message };
  }
}
