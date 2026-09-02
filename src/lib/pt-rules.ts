import { ptChecklistItems } from '@/lib/data/pt-checklist';

/**
 * Regras da Permissao de Trabalho.
 *
 * Sao deterministicas de proposito: num documento que vai para fiscalizacao,
 * uma regra previsivel e auditavel vale mais que um modelo que acerta quase
 * sempre. A IA sugere; quem define o que e obrigatorio e este arquivo.
 *
 * Toda regra referencia ids que existem em pt-checklist.ts. A funcao
 * `idsValidos()` no fim do arquivo e a fonte de verdade usada para descartar
 * qualquer id inventado — inclusive os que vierem da IA.
 */

export type PtChecklist = Record<string, boolean>;

/** Itens do bloco "tipo de atividade". Sao eles que disparam as regras. */
export const GATILHOS = {
  TRABALHO_FRIO: 'trabalho_frio',
  ESPACO_CONFINADO: 'espaco_confinado',
  ESCAVACOES: 'escavacoes',
  MOVIMENTACAO_CARGA: 'movimentacao_carga',
  TRABALHO_QUENTE: 'trabalho_quente',
  TRABALHO_ALTURA: 'trabalho_altura',
  ELETRICIDADE: 'eletricidade',
  LIMPEZA_MAQUINAS: 'limpeza_maquinas',
} as const;

export type Gatilho = (typeof GATILHOS)[keyof typeof GATILHOS];

export type RegraDeAtividade = {
  atividade: Gatilho;
  rotulo: string;
  /** Secoes do checklist que passam a aparecer. */
  secoesObrigatorias: string[];
  /** Controles do inventario que a regra considera relevantes. */
  controlesSugeridos: string[];
  /** EPIs do inventario relevantes para esta atividade. */
  episSugeridos: string[];
  /** Campos do formData que precisam estar preenchidos. */
  camposObrigatorios: Array<'ptOxigenio' | 'ptLE' | 'ptH2S' | 'ptCO2'>;
  /** Grupos de pessoas que a atividade exige. */
  participantesObrigatorios: Array<'vigia' | 'resgatista'>;
  /** Evidencias exigidas. Vazio ate o sistema ter armazenamento de arquivo. */
  evidenciasObrigatorias: string[];
};

export const REGRAS: RegraDeAtividade[] = [
  {
    atividade: GATILHOS.TRABALHO_ALTURA,
    rotulo: 'Trabalho em altura',
    secoesObrigatorias: ['precaucoes_altura'],
    controlesSugeridos: [
      'habilitacao_altura',
      'verificar_atracamento_escadas',
      'inspecionar_eqptos_altura',
      'isolar_guarda_corpo',
      'instalar_cabos_guias',
      'condicao_climatica',
      'plano_resgate_altura',
      'isolar_fita_zebrada',
      'amarrar_ferramentas',
    ],
    episSugeridos: ['epi_cinto_paraquedista', 'epi_trava_quedas', 'epi_capacete', 'epi_cordas'],
    camposObrigatorios: [],
    participantesObrigatorios: [],
    evidenciasObrigatorias: [],
  },
  {
    atividade: GATILHOS.TRABALHO_QUENTE,
    rotulo: 'Trabalho a quente',
    secoesObrigatorias: ['precaucoes_quente'],
    controlesSugeridos: [
      'detectar_inflamaveis',
      'prover_eqptos_incendio',
      'isolar_sinalizar_agua',
      'controlar_fagulhas',
      'ventilacao_quente',
      'verificar_valvulas_corta_chama',
      'solicitar_liberacao_operador',
    ],
    episSugeridos: ['epi_avental', 'epi_prot_facial', 'epi_luva', 'epi_camisa_longa'],
    camposObrigatorios: [],
    participantesObrigatorios: [],
    evidenciasObrigatorias: [],
  },
  {
    atividade: GATILHOS.ESPACO_CONFINADO,
    rotulo: 'Espaco confinado',
    secoesObrigatorias: ['precaucoes_confinado'],
    controlesSugeridos: [
      'identificar_espaco',
      'monitoramento_continuo',
      'ventilacao_confinado',
      'equipe_autorizada',
      'plano_emergencia_confinado',
      'verificar_acesso_saida',
      'bloqueio_energias_perigosas',
    ],
    episSugeridos: ['epi_mascara', 'epi_cinto_paraquedista', 'epi_lanternas', 'epi_capacete'],
    camposObrigatorios: ['ptOxigenio', 'ptLE'],
    participantesObrigatorios: ['vigia', 'resgatista'],
    evidenciasObrigatorias: [],
  },
  {
    atividade: GATILHOS.ELETRICIDADE,
    rotulo: 'Eletricidade',
    secoesObrigatorias: [],
    controlesSugeridos: [
      'bloqueio_energias_perigosas',
      'emitir_cartao_bloqueio',
      'aterrar_eletricamente',
      'bloqueio_eqptos',
      'verificar_cabos_eletricos',
    ],
    episSugeridos: ['epi_luva', 'epi_capacete', 'epi_prot_facial', 'epi_bota'],
    camposObrigatorios: [],
    participantesObrigatorios: [],
    evidenciasObrigatorias: [],
  },
  {
    atividade: GATILHOS.MOVIMENTACAO_CARGA,
    rotulo: 'Movimentacao de carga',
    secoesObrigatorias: [],
    controlesSugeridos: [
      'verificar_acesso_pessoas',
      'isolar_fita_zebrada',
      'art_responsavel',
      'treinar_orientar_equipe',
    ],
    episSugeridos: ['epi_capacete', 'epi_bota', 'epi_luva'],
    camposObrigatorios: [],
    participantesObrigatorios: [],
    evidenciasObrigatorias: [],
  },
  {
    atividade: GATILHOS.ESCAVACOES,
    rotulo: 'Escavacoes',
    secoesObrigatorias: [],
    controlesSugeridos: [
      'verificar_acesso_saida',
      'proteger_canaletas',
      'art_responsavel',
      'isolar_fita_zebrada',
    ],
    episSugeridos: ['epi_capacete', 'epi_bota', 'epi_oculos'],
    camposObrigatorios: [],
    participantesObrigatorios: [],
    evidenciasObrigatorias: [],
  },
  {
    atividade: GATILHOS.LIMPEZA_MAQUINAS,
    rotulo: 'Limpeza de maquinas',
    secoesObrigatorias: [],
    controlesSugeridos: [
      'parar_drenar',
      'limpar_equipamentos',
      'bloqueio_eqptos',
      'emitir_cartao_bloqueio',
      'retirar_correntes',
      'rasquetear_fluido',
    ],
    episSugeridos: ['epi_luva', 'epi_oculos', 'epi_macacao'],
    camposObrigatorios: [],
    participantesObrigatorios: [],
    evidenciasObrigatorias: [],
  },
  {
    atividade: GATILHOS.TRABALHO_FRIO,
    rotulo: 'Trabalho a frio',
    secoesObrigatorias: [],
    controlesSugeridos: ['treinar_orientar_equipe', 'manter_apr_pt_visivel'],
    episSugeridos: ['epi_capacete', 'epi_bota', 'epi_luva', 'epi_oculos'],
    camposObrigatorios: [],
    participantesObrigatorios: [],
    evidenciasObrigatorias: [],
  },
];

/** Todos os ids que existem no checklist. Nada fora daqui e aceito. */
export function idsValidos(): Set<string> {
  const ids = new Set<string>();
  for (const secao of ptChecklistItems) {
    for (const item of secao.items) ids.add(item.id);
  }
  return ids;
}

export function regrasAtivas(checklist: PtChecklist): RegraDeAtividade[] {
  return REGRAS.filter((regra) => Boolean(checklist?.[regra.atividade]));
}

/** Secoes sempre visiveis: nao dependem do tipo de atividade. */
const SECOES_GERAIS = ['tipo_atividade', 'equipamentos_utilizados', 'precaucoes_risco', 'epis'];

export function secaoVisivel(sectionId: string, checklist: PtChecklist): boolean {
  if (SECOES_GERAIS.includes(sectionId)) return true;
  return regrasAtivas(checklist).some((regra) => regra.secoesObrigatorias.includes(sectionId));
}

/** Controles que as regras consideram relevantes e ainda nao foram marcados. */
export function controlesSugeridos(checklist: PtChecklist) {
  const validos = idsValidos();
  const vistos = new Set<string>();
  const saida: Array<{ itemId: string; motivo: string }> = [];

  for (const regra of regrasAtivas(checklist)) {
    for (const itemId of [...regra.controlesSugeridos, ...regra.episSugeridos]) {
      if (!validos.has(itemId) || vistos.has(itemId) || checklist?.[itemId]) continue;
      vistos.add(itemId);
      saida.push({ itemId, motivo: regra.rotulo });
    }
  }
  return saida;
}

export function exigeEspacoConfinado(checklist: PtChecklist) {
  return Boolean(checklist?.[GATILHOS.ESPACO_CONFINADO]);
}

export function exigeVigia(checklist: PtChecklist) {
  return regrasAtivas(checklist).some((regra) => regra.participantesObrigatorios.includes('vigia'));
}

export function exigeResgatista(checklist: PtChecklist) {
  return regrasAtivas(checklist).some((regra) => regra.participantesObrigatorios.includes('resgatista'));
}

// ---------------------------------------------------------------------------
// Proveniencia: de onde veio cada controle marcado.
// ---------------------------------------------------------------------------

export type OrigemControle = 'regra' | 'ia' | 'manual';

export type RegistroDeControle = {
  itemId: string;
  origem: OrigemControle;
  em: string;
  por?: string;
  removidoEm?: string;
};

export const ROTULO_ORIGEM: Record<OrigemControle, string> = {
  regra: 'Regra do sistema',
  ia: 'Sugerido pela IA',
  manual: 'Adicionado manualmente',
};

// ---------------------------------------------------------------------------
// Pendencias que impedem a emissao.
// ---------------------------------------------------------------------------

export type PendenciaPt = { texto: string; passo: number };

export function pendenciasDaPt(pt: {
  ptLocalAtividade?: string;
  ptData?: string;
  ptHoraInicio?: string;
  ptHoraFim?: string;
  ptDescricaoTarefa?: string;
  ptChecklist?: PtChecklist;
  ptColaboradores?: Array<{ name?: string; rgCpf?: string }>;
  ptResponsaveis?: Array<{ name?: string; role?: string }>;
  ptVigias?: Array<{ name?: string }>;
  ptResgatistas?: Array<{ name?: string }>;
  ptOxigenio?: string;
  ptLE?: string;
  ptH2S?: string;
  ptCO2?: string;
}): PendenciaPt[] {
  const pendencias: PendenciaPt[] = [];
  const checklist = pt.ptChecklist || {};

  if (!pt.ptLocalAtividade?.trim()) {
    pendencias.push({ texto: 'Informe o local da atividade.', passo: 1 });
  }
  if (!pt.ptData?.trim()) {
    pendencias.push({ texto: 'Informe a data da permissao.', passo: 1 });
  }
  if (!pt.ptHoraInicio?.trim() || !pt.ptHoraFim?.trim()) {
    pendencias.push({ texto: 'Informe o horario de inicio e de termino.', passo: 1 });
  }
  if (!pt.ptDescricaoTarefa?.trim()) {
    pendencias.push({ texto: 'Descreva a tarefa que sera executada.', passo: 1 });
  }

  const ativas = regrasAtivas(checklist);
  if (ativas.length === 0) {
    pendencias.push({ texto: 'Marque ao menos um tipo de atividade.', passo: 2 });
  }

  // Campos e participantes exigidos pelas atividades marcadas.
  for (const regra of ativas) {
    const faltando = regra.camposObrigatorios.filter((campo) => !String(pt[campo] || '').trim());
    if (faltando.length > 0) {
      pendencias.push({
        texto: `${regra.rotulo} exige a avaliacao de atmosfera (${faltando.join(', ')}).`,
        passo: 2,
      });
    }
    if (regra.participantesObrigatorios.includes('vigia')
      && !(pt.ptVigias || []).some((pessoa) => pessoa?.name?.trim())) {
      pendencias.push({ texto: `${regra.rotulo} exige ao menos um vigia.`, passo: 3 });
    }
    if (regra.participantesObrigatorios.includes('resgatista')
      && !(pt.ptResgatistas || []).some((pessoa) => pessoa?.name?.trim())) {
      pendencias.push({ texto: `${regra.rotulo} exige equipe de resgate.`, passo: 3 });
    }
  }

  const colaboradores = (pt.ptColaboradores || []).filter((pessoa) => pessoa?.name?.trim());
  if (colaboradores.length === 0) {
    pendencias.push({ texto: 'Adicione ao menos um colaborador.', passo: 3 });
  } else {
    const semDocumento = colaboradores.filter((pessoa) => !pessoa?.rgCpf?.trim()).length;
    if (semDocumento > 0) {
      pendencias.push({ texto: `${semDocumento} colaborador(es) sem RG ou CPF.`, passo: 3 });
    }
  }

  const responsaveis = (pt.ptResponsaveis || []).filter((pessoa) => pessoa?.name?.trim());
  if (responsaveis.length === 0) {
    pendencias.push({ texto: 'Adicione quem libera a atividade.', passo: 4 });
  } else {
    const semFuncao = responsaveis.filter((pessoa) => !pessoa?.role?.trim()).length;
    if (semFuncao > 0) {
      pendencias.push({ texto: `${semFuncao} responsavel(is) sem funcao informada.`, passo: 4 });
    }
  }

  return pendencias;
}
