'use server';

import { revalidatePath } from 'next/cache';
import { SubcontractorRepository } from '@/repositories/subcontractor.repository';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { z } from 'zod';
import type { SubcontractorFormValues } from '@/lib/types';

const subcontractorServerSchema = z.object({
  name: z.string().min(2, "O nome da empresa é obrigatório."),
  cnpj: z.string().min(14, "O CNPJ deve ser válido."),
  contractNumber: z.string().optional(),
  companyId: z.string().min(1, "ID da empresa é obrigatório."),
});

/**
 * Busca todas as empresas terceirizadas.
 */
export async function getSubcontractors(companyId: string) {
    if (!companyId) {
        return { success: false, error: 'ID da empresa não fornecido.' };
    }
    try {
        const subcontractors = await SubcontractorRepository.getAllByCompany(companyId);
        return { success: true, data: subcontractors };
    } catch (error: any) {
        await ErrorLogRepository.log(error, 'getSubcontractors');
        return { success: false, error: 'Falha ao buscar empresas terceirizadas.' };
    }
}

/**
 * Cria uma nova empresa terceirizada.
 */
export async function createSubcontractor(data: SubcontractorFormValues & { companyId: string }) {
    const validation = subcontractorServerSchema.safeParse(data);
    if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0];
        return { success: false, error: firstError || 'Dados inválidos.' };
    }

    try {
        await SubcontractorRepository.create(validation.data);
        revalidatePath(`/company/${validation.data.companyId}`);
        return { success: true };
    } catch (error: any) {
        await ErrorLogRepository.log(error, 'createSubcontractor');
        return { success: false, error: 'Falha ao criar empresa terceirizada.' };
    }
}

/**
 * Atualiza uma empresa terceirizada.
 */
export async function updateSubcontractor(id: string, data: SubcontractorFormValues & { companyId: string }) {
    const validation = subcontractorServerSchema.safeParse(data);
    if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0];
        return { success: false, error: firstError || 'Dados inválidos.' };
    }

    try {
        await SubcontractorRepository.update(id, validation.data);
        revalidatePath(`/company/${validation.data.companyId}`);
        return { success: true };
    } catch (error: any) {
        await ErrorLogRepository.log(error, 'updateSubcontractor');
        return { success: false, error: 'Falha ao atualizar empresa terceirizada.' };
    }
}

/**
 * Deleta uma empresa terceirizada.
 */
export async function deleteSubcontractor(id: string, companyId: string) {
    if (!id || !companyId) {
        return { success: false, error: 'ID da empresa ou da empresa principal não fornecido.' };
    }
    
    try {
        await SubcontractorRepository.delete(id, companyId);
        revalidatePath(`/company/${companyId}`);
        return { success: true };
    } catch (error: any) {
        await ErrorLogRepository.log(error, 'deleteSubcontractor');
        return { success: false, error: 'Falha ao deletar empresa terceirizada.' };
    }
}
