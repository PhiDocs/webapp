import type { SavedDocument, SignatureDocument } from '@/lib/types';

/**
 * Estados do documento. 'sent' e legado: linhas gravadas antes da migration
 * usam esse valor e ele significa exatamente 'awaiting_signature'.
 */
export const DOCUMENT_STATUS = {
  DRAFT: 'draft',
  IN_REVIEW: 'in_review',
  AWAITING_SIGNATURE: 'awaiting_signature',
  SIGNED: 'signed',
  COMPLETED: 'completed',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
} as const;

export type DocumentStatus = (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS];

/** Estados em que o conteudo nao pode mais ser alterado em silencio. */
export const STATUS_BLOQUEADOS: DocumentStatus[] = [
  DOCUMENT_STATUS.AWAITING_SIGNATURE,
  DOCUMENT_STATUS.SIGNED,
  DOCUMENT_STATUS.COMPLETED,
];

type Tom = 'neutro' | 'andamento' | 'ok' | 'alerta';

export const STATUS_INFO: Record<DocumentStatus, { rotulo: string; tom: Tom; descricao: string }> = {
  draft: {
    rotulo: 'Rascunho',
    tom: 'neutro',
    descricao: 'Em preenchimento. Nada foi enviado ainda.',
  },
  in_review: {
    rotulo: 'Em revisão',
    tom: 'andamento',
    descricao: 'Aguardando a conferência do responsável técnico.',
  },
  awaiting_signature: {
    rotulo: 'Aguardando assinatura',
    tom: 'andamento',
    descricao: 'Enviado. Faltam assinaturas.',
  },
  signed: {
    rotulo: 'Assinado',
    tom: 'ok',
    descricao: 'Todos os signatários assinaram.',
  },
  completed: {
    rotulo: 'Finalizado',
    tom: 'ok',
    descricao: 'Documento concluído e arquivado.',
  },
  declined: {
    rotulo: 'Recusado',
    tom: 'alerta',
    descricao: 'Um signatário recusou a assinatura.',
  },
  cancelled: {
    rotulo: 'Cancelado',
    tom: 'alerta',
    descricao: 'Fluxo interrompido antes da conclusão.',
  },
};

export const CORES_POR_TOM: Record<Tom, { fundo: string; texto: string; borda: string; ponto: string }> = {
  neutro: { fundo: '#f2f1ed', texto: '#6e6a61', borda: '#cfcbc0', ponto: '#6e6a61' },
  andamento: { fundo: '#faf3e4', texto: '#8a5a00', borda: '#e8d9ae', ponto: '#8a5a00' },
  ok: { fundo: '#eaf2ed', texto: '#1b5e3f', borda: '#dde9e2', ponto: '#1b5e3f' },
  alerta: { fundo: '#f6edec', texto: '#7a1f1f', borda: '#e4cfcc', ponto: '#7a1f1f' },
};

/**
 * O estado que vale para exibicao. Combina o que esta em documents com o que a
 * Assinafy devolveu, sem inventar um terceiro lugar de verdade.
 */
export function resolverStatus(
  documento: Pick<SavedDocument, 'status'> & { lockedAt?: string | null },
  assinatura?: Pick<SignatureDocument, 'status' | 'signers'> | null,
): DocumentStatus {
  const bruto = String(documento?.status || DOCUMENT_STATUS.DRAFT);

  // Valores ja migrados mandam.
  if (bruto !== 'sent' && bruto in STATUS_INFO) {
    return bruto as DocumentStatus;
  }

  // 'sent' e o legado: quem decide e a assinatura.
  if (!assinatura) return DOCUMENT_STATUS.AWAITING_SIGNATURE;
  if (assinatura.status === 'declined') return DOCUMENT_STATUS.DECLINED;
  if (assinatura.status === 'expired') return DOCUMENT_STATUS.CANCELLED;
  if (assinatura.status === 'signed' || assinatura.status === 'certificated') {
    return DOCUMENT_STATUS.SIGNED;
  }
  return DOCUMENT_STATUS.AWAITING_SIGNATURE;
}

/** Quantas assinaturas ja sairam, para o "2 de 3 assinaturas concluidas". */
export function progressoAssinaturas(assinatura?: Pick<SignatureDocument, 'signers'> | null) {
  const signatarios = assinatura?.signers || [];
  const concluidas = signatarios.filter((pessoa) => pessoa.status === 'signed').length;
  return { concluidas, total: signatarios.length };
}

export function podeEditarConteudo(status: DocumentStatus) {
  return !STATUS_BLOQUEADOS.includes(status);
}

// ---------------------------------------------------------------------------
// Ciclo de vida: o que cada estado permite e o que bloqueia.
// ---------------------------------------------------------------------------

export type AcaoDocumento =
  | 'editar'
  | 'salvar'
  | 'gerar_pdf'
  | 'enviar_assinatura'
  | 'acompanhar_assinatura'
  | 'concluir'
  | 'nova_versao';

/** A ordem em que os estados aparecem na trilha do documento. */
export const TRILHA: DocumentStatus[] = [
  DOCUMENT_STATUS.DRAFT,
  DOCUMENT_STATUS.IN_REVIEW,
  DOCUMENT_STATUS.AWAITING_SIGNATURE,
  DOCUMENT_STATUS.SIGNED,
  DOCUMENT_STATUS.COMPLETED,
];

const PERMITIDAS: Record<DocumentStatus, AcaoDocumento[]> = {
  draft: ['editar', 'salvar', 'gerar_pdf', 'enviar_assinatura'],
  in_review: ['editar', 'salvar', 'gerar_pdf', 'enviar_assinatura'],
  awaiting_signature: ['gerar_pdf', 'acompanhar_assinatura', 'nova_versao'],
  signed: ['gerar_pdf', 'acompanhar_assinatura', 'concluir', 'nova_versao'],
  completed: ['gerar_pdf', 'acompanhar_assinatura', 'nova_versao'],
  declined: ['gerar_pdf', 'acompanhar_assinatura', 'nova_versao'],
  cancelled: ['gerar_pdf', 'nova_versao'],
};

/** Por que a acao esta bloqueada. Serve de texto na tela, nao so de regra. */
const MOTIVO_BLOQUEIO: Partial<Record<DocumentStatus, string>> = {
  awaiting_signature: 'O documento foi enviado para assinatura e nao pode mais ser alterado.',
  signed: 'O documento ja foi assinado. Para mudar algo, gere uma nova versao.',
  completed: 'Documento finalizado e arquivado.',
  declined: 'A assinatura foi recusada. Gere uma nova versao para corrigir.',
  cancelled: 'Documento cancelado.',
};

export function podeFazer(status: DocumentStatus, acao: AcaoDocumento) {
  return (PERMITIDAS[status] || []).includes(acao);
}

export function acoesPermitidas(status: DocumentStatus) {
  return PERMITIDAS[status] || [];
}

export function motivoDoBloqueio(status: DocumentStatus) {
  return MOTIVO_BLOQUEIO[status] || null;
}

export const ROTULO_ACAO: Record<AcaoDocumento, string> = {
  editar: 'Editar conteudo',
  salvar: 'Salvar rascunho',
  gerar_pdf: 'Gerar PDF',
  enviar_assinatura: 'Enviar para assinatura',
  acompanhar_assinatura: 'Acompanhar assinaturas',
  concluir: 'Concluir documento',
  nova_versao: 'Gerar nova versao',
};
