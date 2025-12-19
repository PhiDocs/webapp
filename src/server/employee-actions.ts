'use server';

import { revalidatePath } from 'next/cache';
import { EmployeeRepository } from '@/repositories/employee.repository';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { z } from 'zod';
import type { EmployeeFormValues } from '@/lib/types';
import { ptBr } from '@/lib/data/strings';

// Schema para validação do formulário no servidor. Inclui o companyId.
const employeeServerSchema = z.object({
  firstName: z.string().min(1, ptBr.validations.firstName),
  lastName: z.string().min(1, ptBr.validations.lastName),
  role: z.string().min(1, ptBr.validations.role),
  email: z.string().email(ptBr.validations.invalidEmail),
  cpf: z.string().min(1, ptBr.validations.cpf),
  company: z.string().optional(),
  companyId: z.string().min(1, "ID da empresa é obrigatório."),
});

/**
 * Busca todos os funcionários de uma empresa.
 */
export async function getEmployees(companyId: string) {
    if (!companyId) {
        return { success: false, error: 'ID da empresa não fornecido.' };
    }
    try {
        const employees = await EmployeeRepository.getAllByCompany(companyId);
        return { success: true, data: employees };
    } catch (error: any) {
        console.error("Error fetching employees: ", error);
        if (error.code === 'failed-precondition') {
             await ErrorLogRepository.log(error, 'getEmployees-IndexMissing');
             return { success: false, error: 'Um índice do Firestore é necessário para esta consulta. Verifique os logs do servidor para o link de criação do índice.' };
        }
        await ErrorLogRepository.log(error, 'getEmployees');
        return { success: false, error: 'Falha ao buscar funcionários.' };
    }
}

/**
 * Cria um novo funcionário.
 */
export async function createEmployee(data: EmployeeFormValues & { companyId: string }) {
    const validation = employeeServerSchema.safeParse(data);
    if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0];
        return { success: false, error: firstError || 'Dados inválidos.' };
    }

    try {
        await EmployeeRepository.create(validation.data);
        revalidatePath(`/company/${validation.data.companyId}`);
        return { success: true };
    } catch (error: any) {
        await ErrorLogRepository.log(error, 'createEmployee', data.email);
        return { success: false, error: 'Falha ao criar funcionário.' };
    }
}

/**
 * Atualiza um funcionário existente.
 */
export async function updateEmployee(id: string, data: EmployeeFormValues & { companyId: string }) {
    const validation = employeeServerSchema.safeParse(data);
    if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0];
        return { success: false, error: firstError || 'Dados inválidos.' };
    }

    try {
        await EmployeeRepository.update(id, validation.data);
        revalidatePath(`/company/${validation.data.companyId}`);
        return { success: true };
    } catch (error: any) {
        await ErrorLogRepository.log(error, 'updateEmployee', data.email);
        return { success: false, error: 'Falha ao atualizar funcionário.' };
    }
}

/**
 * Deleta um funcionário.
 */
export async function deleteEmployee(id: string, companyId: string) {
    if (!id || !companyId) {
        return { success: false, error: 'ID do funcionário ou da empresa não fornecido.' };
    }
    
    try {
        await EmployeeRepository.delete(id, companyId);
        revalidatePath(`/company/${companyId}`);
        return { success: true };
    } catch (error: any) {
        await ErrorLogRepository.log(error, 'deleteEmployee');
        return { success: false, error: 'Falha ao deletar funcionário.' };
    }
}
