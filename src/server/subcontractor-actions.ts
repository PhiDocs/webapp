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
    } catch (e: unknown) {
        let error: Error;
        if (e instanceof Error) {
            error = e;
        } else {
            error = new Error(String(e ?? 'Falha ao buscar empresas terceirizadas.'));
        }

        console.error("Error fetching subcontractors: ", error);

        const specificError = e as { code?: string };
        if (specificError?.code === 'failed-precondition') {
            await ErrorLogRepository.log(new Error('Firestore index missing for getSubcontractors. Please create it.'), 'getSubcontractors-IndexMissing');
            return { success: false, error: 'Um índice do Firestore é necessário para esta consulta. Verifique os logs do servidor para o link de criação do índice.' };
        }
        await ErrorLogRepository.log(error, 'getSubcontractors');
        return { success: false, error: 'Falha ao buscar empresas terceirizadas.' };
    }
}

/**
 * Cria um novo subcontratado.
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
    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e ?? 'Falha ao criar subcontratado.'));
        await ErrorLogRepository.log(error, 'createSubcontractor');
        return { success: false, error: 'Falha ao criar subcontratado.' };
    }
}

/**
 * Atualiza um subcontratado existente.
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
    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e ?? 'Falha ao atualizar subcontratado.'));
        await ErrorLogRepository.log(error, 'updateSubcontractor');
        return { success: false, error: 'Falha ao atualizar subcontratado.' };
    }
}

/**
 * Deleta um subcontratado.
 */
export async function deleteSubcontractor(id: string, companyId: string) {
    if (!id || !companyId) {
        return { success: false, error: 'ID do subcontratado ou da empresa não fornecido.' };
    }
    
    try {
        await SubcontractorRepository.delete(id, companyId);
        revalidatePath(`/company/${companyId}`);
        return { success: true };
    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e ?? 'Falha ao deletar subcontratado.'));
        await ErrorLogRepository.log(error, 'deleteSubcontractor');
        return { success: false, error: 'Falha ao deletar subcontratado.' };
    }
}