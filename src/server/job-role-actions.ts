'use server';

import { revalidatePath } from 'next/cache';
import { JobRoleRepository } from '@/repositories/job-role.repository';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { z } from 'zod';
import type { JobRoleFormValues } from '@/lib/types';

const jobRoleServerSchema = z.object({
  name: z.string().min(2, "O nome do cargo é obrigatório."),
  responsibilities: z.string().min(10, "A descrição das responsabilidades é obrigatória."),
  requiredCertificates: z.array(z.object({ value: z.string() })).optional(),
  companyId: z.string().min(1, "ID da empresa é obrigatório."),
});

/**
 * Busca todos os cargos de uma empresa.
 */
export async function getJobRoles(companyId: string) {
    if (!companyId) {
        return { success: false, error: 'ID da empresa não fornecido.' };
    }
    try {
        const jobRoles = await JobRoleRepository.getAllByCompany(companyId);
        return { success: true, data: jobRoles };
    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e) || 'Falha ao buscar cargos.');
        const specificError = e as { code?: string };
        if (specificError?.code === 'failed-precondition') {
            await ErrorLogRepository.log(new Error('Firestore index missing for getJobRoles'), 'getJobRoles-IndexMissing');
            return { success: false, error: 'Um índice do Firestore é necessário para esta consulta. Verifique os logs do servidor para o link de criação do índice.' };
        }
        await ErrorLogRepository.log(error, 'getJobRoles');
        return { success: false, error: 'Falha ao buscar cargos.' };
    }
}

/**
 * Cria um novo cargo.
 */
export async function createJobRole(data: JobRoleFormValues & { companyId: string }) {
    const validation = jobRoleServerSchema.safeParse(data);
    if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0];
        return { success: false, error: firstError || 'Dados inválidos.' };
    }

    try {
        const { companyId, name, responsibilities, requiredCertificates } = validation.data;
        const certificates = requiredCertificates?.map(c => c.value).filter(Boolean) || [];

        await JobRoleRepository.create({ companyId, name, responsibilities, requiredCertificates: certificates });
        revalidatePath(`/company/${companyId}`);
        return { success: true };
    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e) || 'Falha ao criar cargo.');
        await ErrorLogRepository.log(error, 'createJobRole');
        return { success: false, error: 'Falha ao criar cargo.' };
    }
}

/**
 * Atualiza um cargo existente.
 */
export async function updateJobRole(id: string, data: JobRoleFormValues & { companyId: string }) {
    const validation = jobRoleServerSchema.safeParse(data);
    if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0];
        return { success: false, error: firstError || 'Dados inválidos.' };
    }

    try {
        const { companyId, name, responsibilities, requiredCertificates } = validation.data;
        const certificates = requiredCertificates?.map(c => c.value).filter(Boolean) || [];

        await JobRoleRepository.update(id, { companyId, name, responsibilities, requiredCertificates: certificates });
        revalidatePath(`/company/${companyId}`);
        return { success: true };
    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e) || 'Falha ao atualizar cargo.');
        await ErrorLogRepository.log(error, 'updateJobRole');
        return { success: false, error: 'Falha ao atualizar cargo.' };
    }
}

/**
 * Deleta um cargo.
 */
export async function deleteJobRole(id: string, companyId: string) {
    if (!id || !companyId) {
        return { success: false, error: 'ID do cargo ou da empresa não fornecido.' };
    }
    
    try {
        await JobRoleRepository.delete(id, companyId);
        revalidatePath(`/company/${companyId}`);
        return { success: true };
    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e) || 'Falha ao deletar cargo.');
        await ErrorLogRepository.log(error, 'deleteJobRole');
        return { success: false, error: 'Falha ao deletar cargo.' };
    }
}
