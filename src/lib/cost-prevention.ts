import type {
  CostPrevention,
  CostPreventionCategory,
  CostPreventionOrigin,
  CostPreventionType,
} from '@/lib/types';

export const costCategoryLabels: Record<CostPreventionCategory, string> = {
  prevencao: 'Prevencao',
  correcao: 'Correcao',
  incidente: 'Incidente',
  treinamento: 'Treinamento',
  EPI: 'EPI',
  exame_ocupacional: 'Exame ocupacional',
  manutencao_preventiva: 'Manutencao preventiva',
  manutencao_corretiva: 'Manutencao corretiva',
  sinalizacao: 'Sinalizacao',
  adequacao_de_seguranca: 'Adequacao de seguranca',
  afastamento: 'Afastamento',
  multa_autuacao: 'Multa/autuacao',
  retrabalho: 'Retrabalho',
  consultoria: 'Consultoria',
  auditoria: 'Auditoria',
  outros: 'Outros',
};

export const costTypeLabels: Record<CostPreventionType, string> = {
  investimento_preventivo: 'Investimento preventivo',
  custo_corretivo: 'Custo corretivo',
  custo_operacional: 'Custo operacional',
  custo_emergencial: 'Custo emergencial',
  custo_recorrente: 'Custo recorrente',
  custo_pontual: 'Custo pontual',
  custo_estimado: 'Custo estimado',
  custo_real: 'Custo real',
};

export const costOriginLabels: Record<CostPreventionOrigin, string> = {
  manual: 'Manual',
  entrega_de_epi: 'Entrega de EPI',
  treinamento: 'Treinamento',
  inspecao: 'Inspecao',
  nao_conformidade: 'Nao conformidade',
  incidente: 'Incidente',
  manutencao: 'Manutencao',
  exame: 'Exame',
  auditoria: 'Auditoria',
};

export function formatCurrency(value?: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

export function sumCosts(items: CostPrevention[]) {
  return items.reduce((total, item) => total + Number(item.valor || 0), 0);
}

export function preventionCosts(items: CostPrevention[]) {
  return items.filter((item) => ['prevencao', 'EPI', 'treinamento', 'exame_ocupacional', 'manutencao_preventiva', 'sinalizacao', 'adequacao_de_seguranca'].includes(item.categoria));
}

export function correctiveCosts(items: CostPrevention[]) {
  return items.filter((item) => ['correcao', 'incidente', 'afastamento', 'multa_autuacao', 'retrabalho', 'manutencao_corretiva'].includes(item.categoria));
}

export function filterCostsByRelation(items: CostPrevention[], key: 'colaborador_id' | 'incidente_id' | 'nao_conformidade_id' | 'inspecao_id' | 'treinamento_id' | 'epi_id', value?: string) {
  if (!value) return [];
  return items.filter((item) => item[key] === value);
}
