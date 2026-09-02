'use server';

import { UserRepository, type UserData } from '@/repositories/user.repository';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { requireAuth } from '@/server/auth-guard';

export type PessoaAguardando = {
  uid: string;
  name: string;
  email: string;
};

export type PessoaDaEquipe = PessoaAguardando & {
  role: 'admin' | 'user';
  ehVoce: boolean;
};

function paraPessoa(usuario: UserData): PessoaAguardando {
  return {
    uid: usuario.uid,
    name: usuario.name || 'Sem nome',
    email: usuario.email,
  };
}

/**
 * Quem se cadastrou e esta esperando liberacao.
 *
 * Aberto a qualquer admin, mas ele so consegue liberar para a propria empresa
 * (ver liberarAcesso). Uma pessoa que se cadastra sozinha nao entra em lugar
 * nenhum ate alguem aprovar — e o que mantem a URL publica segura.
 */
export async function listarAcessosPendentes(): Promise<{
  data: PessoaAguardando[] | null;
  error: string | null;
}> {
  try {
    await requireAuth({ role: 'admin', requireCompany: true });
    const pendentes = await UserRepository.listSemEmpresa();
    return { data: pendentes.map(paraPessoa), error: null };
  } catch (e: unknown) {
    const erro = e instanceof Error ? e : new Error(String(e ?? 'Erro ao listar acessos.'));
    await ErrorLogRepository.log(erro, 'listarAcessosPendentes');
    return { data: null, error: erro.message };
  }
}

/** Quem ja faz parte da empresa de quem esta pedindo. */
export async function listarEquipe(): Promise<{
  data: PessoaDaEquipe[] | null;
  error: string | null;
}> {
  try {
    const sessao = await requireAuth({ role: 'admin', requireCompany: true });
    const equipe = await UserRepository.listByCompany(sessao.companyId!);
    return {
      data: equipe.map((pessoa) => ({
        ...paraPessoa(pessoa),
        role: pessoa.role,
        ehVoce: pessoa.uid === sessao.uid,
      })),
      error: null,
    };
  } catch (e: unknown) {
    const erro = e instanceof Error ? e : new Error(String(e ?? 'Erro ao listar a equipe.'));
    await ErrorLogRepository.log(erro, 'listarEquipe');
    return { data: null, error: erro.message };
  }
}

/**
 * Libera o acesso de alguem para a empresa de quem esta aprovando.
 *
 * A empresa vem da sessao, nunca do cliente: assim um admin nao consegue
 * empurrar uma pessoa para dentro de outra empresa. E so libera quem esta
 * realmente sem empresa, para nao roubar usuario de outra companhia.
 */
export async function liberarAcesso(uid: string, papel: 'admin' | 'user' = 'user'): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const sessao = await requireAuth({ role: 'admin', requireCompany: true });

    const alvo = await UserRepository.get(uid);
    if (!alvo) {
      return { success: false, error: 'Usuario nao encontrado.' };
    }
    if (alvo.companyId) {
      return { success: false, error: 'Esta pessoa ja pertence a uma empresa.' };
    }

    await UserRepository.update(uid, { companyId: sessao.companyId, role: papel });
    return { success: true };
  } catch (e: unknown) {
    const erro = e instanceof Error ? e : new Error(String(e ?? 'Erro ao liberar o acesso.'));
    await ErrorLogRepository.log(erro, 'liberarAcesso');
    return { success: false, error: erro.message };
  }
}

/**
 * Tira alguem da empresa. A pessoa volta para a fila de espera, nao e apagada:
 * excluir conta e outra decisao, e nao cabe a esta tela.
 */
export async function revogarAcesso(uid: string): Promise<{ success: boolean; error?: string }> {
  try {
    const sessao = await requireAuth({ role: 'admin', requireCompany: true });

    if (uid === sessao.uid) {
      return { success: false, error: 'Voce nao pode remover o proprio acesso.' };
    }

    const alvo = await UserRepository.get(uid);
    if (!alvo || alvo.companyId !== sessao.companyId) {
      return { success: false, error: 'Esta pessoa nao pertence a sua empresa.' };
    }

    await UserRepository.update(uid, { companyId: null });
    return { success: true };
  } catch (e: unknown) {
    const erro = e instanceof Error ? e : new Error(String(e ?? 'Erro ao revogar o acesso.'));
    await ErrorLogRepository.log(erro, 'revogarAcesso');
    return { success: false, error: erro.message };
  }
}
