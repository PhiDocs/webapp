'use server';

import { revalidatePath } from 'next/cache';
import { WorkRepository } from '@/repositories/work.repository';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { z } from 'zod';
import type { WorkClientFormValues } from '@/lib/types';
import { requireAuth } from '@/server/auth-guard';

function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object') {
        const record = error as { message?: string; details?: string; hint?: string; code?: string };
        return [record.message, record.details, record.hint, record.code].filter(Boolean).join(' ') || fallback;
    }
    return String(error || fallback);
}

// Server-side schema validation. Includes companyId.
const workServerSchema = z.object({
  name: z.string().min(3, "O nome da obra deve ter pelo menos 3 caracteres."),
  address: z.string().min(5, "O endereço deve ter pelo menos 5 caracteres."),
  workLocationDetails: z.string().min(3, "O local da obra deve ter pelo menos 3 caracteres."),
  startDate: z.string().min(1, "A data de início é obrigatória."),
  endDate: z.string().min(1, "A data de término é obrigatória."),
  companyId: z.string().min(1, "ID da empresa é obrigatório."),
  projeto_id: z.string().optional(),
  tipo_servico: z.string().optional(),
  status: z.string().optional(),
  cnpj: z.string().optional(),
  razao_social: z.string().optional(),
  nome_fantasia: z.string().optional(),
  situacao_cadastral: z.string().optional(),
  cnae_principal: z.string().optional(),
  logo_empresa_url: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  responsavel_obra: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().optional(),
  descricao_atividade: z.string().optional(),
  observacoes: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A data de término não pode ser anterior à data de início.",
            path: ['endDate'],
        });
    }
});


/**
 * Fetch all works for a company.
 */
export async function getWorks(companyId: string) {
    if (!companyId) {
        return { success: false, error: 'ID da empresa não fornecido.' };
    }
    try {
        await requireAuth({ matchCompanyId: companyId, requireCompany: true });
        const works = await WorkRepository.getAllByCompany(companyId);
        return { success: true, data: works };
    } catch (e: unknown) {
        const error = new Error(getErrorMessage(e, 'Erro desconhecido ao buscar obras.'));
        await ErrorLogRepository.log(error, 'getWorks');
        return { success: false, error: error.message };
    }
}

/**
 * Create a new work.
 */
export async function createWork(data: WorkClientFormValues & { companyId: string }) {
    try {
        await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
    } catch (error: any) {
        return { success: false, error: error.message || 'Acesso negado.' };
    }

    const validation = workServerSchema.safeParse(data);
    if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0];
        return { success: false, error: firstError || 'Dados inválidos.' };
    }

    try {
        await WorkRepository.create(validation.data);
        revalidatePath(`/company/${validation.data.companyId}`);
        return { success: true };
    } catch (e: unknown) {
        const error = new Error(getErrorMessage(e, 'Erro desconhecido ao criar obra.'));
        await ErrorLogRepository.log(error, 'createWork');
        return { success: false, error: error.message };
    }
}

/**
 * Update an existing work.
 */
export async function updateWork(id: string, data: WorkClientFormValues & { companyId: string }) {
    try {
        await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
    } catch (error: any) {
        return { success: false, error: error.message || 'Acesso negado.' };
    }

    const validation = workServerSchema.safeParse(data);
    if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0];
        return { success: false, error: firstError || 'Dados inválidos.' };
    }

    try {
        await WorkRepository.update(id, validation.data);
        revalidatePath(`/company/${validation.data.companyId}`);
        return { success: true };
    } catch (e: unknown) {
        const error = new Error(getErrorMessage(e, 'Erro desconhecido ao atualizar obra.'));
        await ErrorLogRepository.log(error, 'updateWork');
        return { success: false, error: error.message };
    }
}

/**
 * Delete a work.
 */
export async function deleteWork(id: string, companyId: string) {
    if (!id || !companyId) {
        return { success: false, error: 'ID da obra ou da empresa não fornecido.' };
    }
    
    try {
        await requireAuth({ role: 'admin', matchCompanyId: companyId, requireCompany: true });
        await WorkRepository.delete(id);
        revalidatePath(`/company/${companyId}`);
        return { success: true };
    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e ?? 'Erro desconhecido ao deletar obra.'));
        await ErrorLogRepository.log(error, 'deleteWork');
        return { success: false, error: error.message };
    }
}

