'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ResponsibleContactRepository } from '@/repositories/responsible-contact.repository';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { requireAuth } from '@/server/auth-guard';
import type { ResponsibleContactInput } from '@/lib/types';

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const record = error as { message?: string; details?: string; hint?: string; code?: string };
    return [record.message, record.details, record.hint, record.code].filter(Boolean).join(' ') || fallback;
  }
  return String(error || fallback);
}

function isMissingContactsTable(message: string) {
  return message.includes('responsible_contacts') || message.includes('PGRST205');
}

const responsibleContactSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do responsavel.'),
  role: z.string().trim().min(2, 'Informe a funcao do responsavel.'),
  organization: z.string().trim().nullish(),
  email: z.union([z.string().email('E-mail invalido.'), z.literal(''), z.null()]).optional(),
  phone: z.string().trim().nullish(),
  signsByDefault: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export async function getResponsibleContacts(companyId: string) {
  if (!companyId) {
    return { success: false, error: 'ID da empresa nao fornecido.' };
  }

  try {
    await requireAuth({ matchCompanyId: companyId, requireCompany: true });
    const contacts = await ResponsibleContactRepository.getAllByCompany(companyId);
    return { success: true, data: contacts };
  } catch (e: unknown) {
    const message = getErrorMessage(e, 'Erro desconhecido ao buscar responsaveis salvos.');
    // A tela funciona sem o cadastro: sem a tabela, a aba de responsaveis
    // salvos simplesmente nao aparece.
    if (isMissingContactsTable(message)) {
      return { success: true, data: [] };
    }

    const error = new Error(message);
    await ErrorLogRepository.log(error, 'getResponsibleContacts');
    return { success: false, error: error.message };
  }
}

export async function saveResponsibleContact(companyId: string, data: ResponsibleContactInput) {
  if (!companyId) {
    return { success: false, error: 'ID da empresa nao fornecido.' };
  }

  try {
    await requireAuth({ matchCompanyId: companyId, requireCompany: true });
  } catch (error: any) {
    return { success: false, error: error.message || 'Acesso negado.' };
  }

  const validation = responsibleContactSchema.safeParse(data);
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    const firstError = Object.values(errors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  const parsed = validation.data;

  try {
    const contact = await ResponsibleContactRepository.save(companyId, {
      name: parsed.name,
      role: parsed.role,
      organization: parsed.organization ?? null,
      email: parsed.email || null,
      phone: parsed.phone ?? null,
      signsByDefault: parsed.signsByDefault,
      isActive: parsed.isActive,
    });
    revalidatePath('/reports');
    return { success: true, data: contact };
  } catch (e: unknown) {
    const message = getErrorMessage(e, 'Erro desconhecido ao salvar o responsavel.');
    if (isMissingContactsTable(message)) {
      return { success: false, error: 'Cadastro de responsaveis ainda nao aplicado no banco. Rode as migrations.' };
    }

    const error = new Error(message);
    await ErrorLogRepository.log(error, 'saveResponsibleContact');
    return { success: false, error: error.message };
  }
}
