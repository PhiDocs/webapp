'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { AprProjectRepository } from '@/repositories/apr-project.repository';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { requireAuth } from '@/server/auth-guard';
import type { AprPtProjectFormValues } from '@/lib/types';

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const record = error as { message?: string; details?: string; hint?: string; code?: string };
    return [record.message, record.details, record.hint, record.code].filter(Boolean).join(' ') || fallback;
  }
  return String(error || fallback);
}

function isMissingProjectsTable(message: string) {
  return message.includes('projetos_apr_pt') || message.includes('PGRST205');
}

const aprProjectSchema = z.object({
  companyId: z.string().min(1, 'Empresa obrigatoria.'),
  nome_projeto: z.string().min(2, 'Nome do projeto obrigatorio.'),
  descricao: z.string().optional(),
  responsavel_interno: z.string().optional(),
  data_inicio: z.string().optional(),
  data_termino_prevista: z.string().optional(),
  cliente_principal: z.string().optional(),
  nome_empresa: z.string().optional(),
  razao_social: z.string().optional(),
  nome_fantasia: z.string().optional(),
  cnpj_empresa: z.string().optional(),
  logo_empresa_url: z.string().optional(),
  situacao_cadastral: z.string().optional(),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  responsavel: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('E-mail invalido.').optional().or(z.literal('')),
  cnae_principal: z.string().optional(),
  observacoes: z.string().optional(),
  status: z.enum(['ativo', 'em_andamento', 'arquivado', 'concluido']).default('ativo'),
});

export async function getAprProjects(companyId: string) {
  if (!companyId) {
    return { success: false, error: 'ID da empresa nao fornecido.' };
  }

  try {
    await requireAuth({ matchCompanyId: companyId, requireCompany: true });
    const projects = await AprProjectRepository.getAllByCompany(companyId);
    return { success: true, data: projects };
  } catch (e: unknown) {
    const message = getErrorMessage(e, 'Erro desconhecido ao buscar projetos APR/PT.');
    if (isMissingProjectsTable(message)) {
      return { success: true, data: [] };
    }

    const error = new Error(message);
    await ErrorLogRepository.log(error, 'getAprProjects');
    return { success: false, error: error.message };
  }
}

export async function createAprProject(data: AprPtProjectFormValues) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
  } catch (error: any) {
    return { success: false, error: error.message || 'Acesso negado.' };
  }

  const validation = aprProjectSchema.safeParse(data);
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    const firstError = Object.values(errors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  try {
    const id = await AprProjectRepository.create(validation.data);
    revalidatePath('/reports');
    return { success: true, id };
  } catch (e: unknown) {
    const message = getErrorMessage(e, 'Erro desconhecido ao criar projeto APR/PT.');
    if (isMissingProjectsTable(message)) {
      return { success: false, error: 'Tabela de projetos APR/PT ainda nao aplicada no banco.' };
    }

    const error = new Error(message);
    await ErrorLogRepository.log(error, 'createAprProject');
    return { success: false, error: error.message };
  }
}
