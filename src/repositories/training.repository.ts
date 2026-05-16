import type {
  Collaborator,
  CollaboratorTraining,
  CollaboratorTrainingFormValues,
  RequiredTrainingItem,
  Training,
  TrainingByFunction,
  TrainingFormValues,
} from '@/lib/types';
import { CollaboratorRepository } from '@/repositories/collaborator.repository';
import { createSupabaseAdminClient } from '@/supabase/server';

type DocumentRow<T> = {
  id: string;
  documentName: string;
  formData: T | null;
  createdAt: string;
  updatedAt: string;
};

type TrainingData = TrainingFormValues & { companyId: string };
type CollaboratorTrainingData = CollaboratorTrainingFormValues & { companyId: string };

const DEFAULT_TRAININGS: Array<Omit<Training, 'id' | 'companyId' | 'created_at' | 'updated_at'>> = [
  { nome: 'NR10 - Seguranca em Instalacoes e Servicos em Eletricidade', norma: 'NR10', descricao: 'Treinamento para atividades com eletricidade.', carga_horaria: 40, validade_meses: 24, obrigatorio: true, ativo: true, observacoes: '' },
  { nome: 'NR10 SEP', norma: 'NR10', descricao: 'Sistema Eletrico de Potencia, quando aplicavel.', carga_horaria: 40, validade_meses: 24, obrigatorio: true, ativo: true, observacoes: '' },
  { nome: 'NR11 - Movimentacao de Materiais', norma: 'NR11', descricao: 'Transporte, movimentacao, armazenagem e manuseio.', carga_horaria: 16, validade_meses: 24, obrigatorio: true, ativo: true, observacoes: '' },
  { nome: 'NR12 - Maquinas e Equipamentos', norma: 'NR12', descricao: 'Seguranca em maquinas e equipamentos.', carga_horaria: 8, validade_meses: 24, obrigatorio: true, ativo: true, observacoes: '' },
  { nome: 'NR18 - Industria da Construcao', norma: 'NR18', descricao: 'Condicoes de seguranca na construcao.', carga_horaria: 6, validade_meses: 24, obrigatorio: true, ativo: true, observacoes: '' },
  { nome: 'NR33 - Espacos Confinados', norma: 'NR33', descricao: 'Seguranca em espacos confinados.', carga_horaria: 16, validade_meses: 12, obrigatorio: true, ativo: true, observacoes: '' },
  { nome: 'NR35 - Trabalho em Altura', norma: 'NR35', descricao: 'Trabalho em altura.', carga_horaria: 8, validade_meses: 24, obrigatorio: true, ativo: true, observacoes: '' },
  { nome: 'Integracao de Seguranca', norma: 'Interno', descricao: 'Integracao inicial de seguranca.', carga_horaria: 2, validade_meses: 12, obrigatorio: true, ativo: true, observacoes: '' },
  { nome: 'Uso correto de EPIs', norma: 'NR06', descricao: 'Uso, guarda e conservacao de EPIs.', carga_horaria: 2, validade_meses: 12, obrigatorio: true, ativo: true, observacoes: '' },
  { nome: 'Combate a incendio', norma: 'Brigada', descricao: 'Nocoes de combate a incendio.', carga_horaria: 4, validade_meses: 12, obrigatorio: true, ativo: true, observacoes: '' },
  { nome: 'Primeiros socorros', norma: 'Brigada', descricao: 'Atendimento inicial de emergencia.', carga_horaria: 4, validade_meses: 12, obrigatorio: true, ativo: true, observacoes: '' },
  { nome: 'Direcao defensiva', norma: 'Transito', descricao: 'Direcao segura.', carga_horaria: 4, validade_meses: 24, obrigatorio: true, ativo: true, observacoes: '' },
  { nome: 'Operacao de empilhadeira', norma: 'NR11', descricao: 'Operacao segura de empilhadeira.', carga_horaria: 16, validade_meses: 12, obrigatorio: true, ativo: true, observacoes: '' },
  { nome: 'Operacao de ponte rolante', norma: 'NR11', descricao: 'Operacao segura de ponte rolante.', carga_horaria: 16, validade_meses: 12, obrigatorio: true, ativo: true, observacoes: '' },
  { nome: 'Permissao de trabalho', norma: 'PT', descricao: 'Permissao de trabalho e analise previa.', carga_horaria: 2, validade_meses: 12, obrigatorio: true, ativo: true, observacoes: '' },
  { nome: 'Trabalho a quente', norma: 'PT', descricao: 'Solda, corte e atividades com fonte de ignicao.', carga_horaria: 4, validade_meses: 12, obrigatorio: true, ativo: true, observacoes: '' },
];

const DEFAULT_RULES: Record<string, string[]> = {
  eletricista: ['NR10 - Seguranca em Instalacoes e Servicos em Eletricidade', 'NR10 SEP', 'NR35 - Trabalho em Altura', 'Integracao de Seguranca', 'Uso correto de EPIs'],
  empilhadeira: ['NR11 - Movimentacao de Materiais', 'Operacao de empilhadeira', 'Direcao defensiva', 'Integracao de Seguranca', 'Uso correto de EPIs'],
  operador: ['NR11 - Movimentacao de Materiais', 'NR12 - Maquinas e Equipamentos', 'Integracao de Seguranca', 'Uso correto de EPIs'],
  pedreiro: ['NR18 - Industria da Construcao', 'NR35 - Trabalho em Altura', 'Integracao de Seguranca', 'Uso correto de EPIs'],
  soldador: ['Trabalho a quente', 'Uso correto de EPIs', 'Combate a incendio', 'Integracao de Seguranca', 'NR35 - Trabalho em Altura'],
};

function nowIso() {
  return new Date().toISOString();
}

function normalize(value?: string) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function isMissingTable(error: unknown, table: string) {
  if (!error || typeof error !== 'object') return false;
  const record = error as Record<string, unknown>;
  const message = [record.message, record.details, record.hint, record.code].filter((value): value is string => typeof value === 'string').join(' ');
  return message.includes(`public.${table}`) || message.includes(`relation "public.${table}" does not exist`) || message.includes('PGRST205');
}

function defaultTrainings(companyId: string): Training[] {
  const now = nowIso();
  return DEFAULT_TRAININGS.map((training, index) => ({
    ...training,
    id: `default-training-${index + 1}-${normalize(training.nome).replace(/[^a-z0-9]+/g, '-')}`,
    companyId,
    created_at: now,
    updated_at: now,
  }));
}

function mapDocToTraining(row: DocumentRow<Partial<Training>>): Training {
  const data = row.formData ?? {};
  return {
    id: row.id,
    companyId: data.companyId || '',
    nome: data.nome || row.documentName,
    norma: data.norma || '',
    descricao: data.descricao || '',
    carga_horaria: data.carga_horaria || 0,
    validade_meses: data.validade_meses || 0,
    obrigatorio: data.obrigatorio ?? true,
    ativo: data.ativo ?? true,
    observacoes: data.observacoes || '',
    created_at: data.created_at || row.createdAt,
    updated_at: data.updated_at || row.updatedAt,
  };
}

function mapDocToMapping(row: DocumentRow<Partial<TrainingByFunction>>): TrainingByFunction {
  const data = row.formData ?? {};
  return {
    id: row.id,
    companyId: data.companyId || '',
    funcao: data.funcao || row.documentName,
    treinamento_id: data.treinamento_id || '',
    obrigatorio: data.obrigatorio ?? true,
    observacao: data.observacao || '',
    created_at: data.created_at || row.createdAt,
    updated_at: data.updated_at || row.updatedAt,
  };
}

function mapDocToRecord(row: DocumentRow<Partial<CollaboratorTraining>>): CollaboratorTraining {
  const data = row.formData ?? {};
  return {
    id: row.id,
    companyId: data.companyId || '',
    colaborador_id: data.colaborador_id || '',
    treinamento_id: data.treinamento_id || '',
    data_realizacao: data.data_realizacao || '',
    data_vencimento: data.data_vencimento || '',
    instrutor: data.instrutor || '',
    empresa_treinamento: data.empresa_treinamento || '',
    carga_horaria_realizada: data.carga_horaria_realizada || 0,
    certificado_url: data.certificado_url || '',
    lista_presenca_url: data.lista_presenca_url || '',
    status: data.status || 'valido',
    observacoes: data.observacoes || '',
    created_at: data.created_at || row.createdAt,
    updated_at: data.updated_at || row.updatedAt,
    archived_at: data.archived_at || null,
  };
}

async function getDocuments<T>(companyId: string, documentType: string): Promise<Array<DocumentRow<T>>> {
  const { data, error } = await createSupabaseAdminClient()
    .from('documents')
    .select('id, documentName, formData, createdAt, updatedAt')
    .eq('companyId', companyId)
    .eq('documentType', documentType)
    .order('updatedAt', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<DocumentRow<T>>;
}

async function createDocument(companyId: string, documentType: string, documentName: string, formData: object) {
  const now = nowIso();
  const { data, error } = await createSupabaseAdminClient()
    .from('documents')
    .insert({ companyId, documentType, documentName, status: 'draft', formData, analysisData: null, equipmentData: null, signatureDocumentId: null, createdAt: now, updatedAt: now })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

async function updateDocument(id: string, companyId: string, documentType: string, documentName: string, formData: object) {
  const { error } = await createSupabaseAdminClient()
    .from('documents')
    .update({ documentName, formData, updatedAt: nowIso() })
    .eq('id', id)
    .eq('companyId', companyId)
    .eq('documentType', documentType);
  if (error) throw error;
}

function statusFromDate(record: CollaboratorTraining): CollaboratorTraining['status'] {
  if (['cancelado', 'dispensado', 'pendente'].includes(record.status)) return record.status;
  if (!record.data_vencimento) return record.status;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(record.data_vencimento);
  if (date < today) return 'vencido';
  const diff = Math.ceil((date.getTime() - today.getTime()) / 86400000);
  if (diff <= 30) return 'proximo_vencimento';
  return 'valido';
}

function attachRelations(records: CollaboratorTraining[], collaborators: Collaborator[], trainings: Training[]) {
  return records.map((record) => ({
    ...record,
    status: statusFromDate(record),
    colaborador: collaborators.find((collaborator) => collaborator.id === record.colaborador_id) || null,
    treinamento: trainings.find((training) => training.id === record.treinamento_id) || null,
  }));
}

export const TrainingRepository = {
  async getTrainings(companyId: string): Promise<Training[]> {
    const { data, error } = await createSupabaseAdminClient()
      .from('treinamentos')
      .select('*')
      .eq('companyId', companyId)
      .order('created_at', { ascending: false });
    if (error && !isMissingTable(error, 'treinamentos')) throw error;
    const saved = error ? (await getDocuments<Partial<Training>>(companyId, 'training_catalog')).map(mapDocToTraining) : ((data ?? []) as Training[]);
    const defaults = defaultTrainings(companyId);
    const existing = new Set(saved.map((item) => normalize(item.nome)));
    return [...saved, ...defaults.filter((item) => !existing.has(normalize(item.nome)))];
  },

  async getMappings(companyId: string): Promise<TrainingByFunction[]> {
    const { data, error } = await createSupabaseAdminClient()
      .from('treinamentos_por_funcao')
      .select('*')
      .eq('companyId', companyId);
    if (error && !isMissingTable(error, 'treinamentos_por_funcao')) throw error;
    return error ? (await getDocuments<Partial<TrainingByFunction>>(companyId, 'training_function')).map(mapDocToMapping) : ((data ?? []) as TrainingByFunction[]);
  },

  async getRecords(companyId: string): Promise<CollaboratorTraining[]> {
    const [collaborators, trainings] = await Promise.all([CollaboratorRepository.getAllByCompany(companyId), this.getTrainings(companyId)]);
    const { data, error } = await createSupabaseAdminClient()
      .from('treinamentos_colaboradores')
      .select('*')
      .eq('companyId', companyId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (error && !isMissingTable(error, 'treinamentos_colaboradores')) throw error;
    const records = error
      ? (await getDocuments<Partial<CollaboratorTraining>>(companyId, 'training_record')).map(mapDocToRecord).filter((record) => !record.archived_at)
      : ((data ?? []) as CollaboratorTraining[]);
    return attachRelations(records, collaborators, trainings);
  },

  async getBundle(companyId: string) {
    const [collaborators, trainings, mappings, records] = await Promise.all([
      CollaboratorRepository.getAllByCompany(companyId),
      this.getTrainings(companyId),
      this.getMappings(companyId),
      this.getRecords(companyId),
    ]);
    return { collaborators, trainings, mappings, records };
  },

  getRequiredTrainings(collaborator: Collaborator, trainings: Training[], mappings: TrainingByFunction[]): RequiredTrainingItem[] {
    const functionKey = normalize(collaborator.funcao);
    const byId = new Map(trainings.map((training) => [training.id, training]));
    const byName = new Map(trainings.map((training) => [normalize(training.nome), training]));
    const required = new Map<string, RequiredTrainingItem>();

    mappings.filter((mapping) => normalize(mapping.funcao) === functionKey).forEach((mapping) => {
      const training = byId.get(mapping.treinamento_id);
      if (training) required.set(training.id, { treinamento: training, obrigatorio: mapping.obrigatorio, observacao: mapping.observacao, source: 'funcao' });
    });

    Object.entries(DEFAULT_RULES).forEach(([key, names]) => {
      if (!functionKey.includes(key)) return;
      names.forEach((name) => {
        const training = byName.get(normalize(name));
        if (training && !required.has(training.id)) required.set(training.id, { treinamento: training, obrigatorio: true, observacao: 'Regra padrao por funcao.', source: 'padrao' });
      });
    });

    collaborator.ai_recommendations?.treinamentos_obrigatorios.forEach((name) => {
      const training = byName.get(normalize(name)) || trainings.find((item) => normalize(name).includes(normalize(item.nome)) || normalize(item.nome).includes(normalize(name)));
      if (training && !required.has(training.id)) required.set(training.id, { treinamento: training, obrigatorio: true, observacao: 'Sugerido pela IA na ficha do colaborador.', source: 'ia' });
    });

    return Array.from(required.values());
  },

  async createTraining(data: TrainingData): Promise<string> {
    const now = nowIso();
    const { data: created, error } = await createSupabaseAdminClient()
      .from('treinamentos')
      .insert({ ...data, created_at: now, updated_at: now })
      .select('id')
      .single();
    if (error) {
      if (isMissingTable(error, 'treinamentos')) return createDocument(data.companyId, 'training_catalog', data.nome, { ...data, created_at: now, updated_at: now });
      throw error;
    }
    return created.id;
  },

  async createRecord(data: CollaboratorTrainingData): Promise<string> {
    const now = nowIso();
    const { data: created, error } = await createSupabaseAdminClient()
      .from('treinamentos_colaboradores')
      .insert({ ...data, created_at: now, updated_at: now, archived_at: null })
      .select('id')
      .single();
    if (error) {
      if (isMissingTable(error, 'treinamentos_colaboradores')) return createDocument(data.companyId, 'training_record', `${data.colaborador_id}-${data.treinamento_id}`, { ...data, created_at: now, updated_at: now, archived_at: null });
      throw error;
    }
    return created.id;
  },

  async updateRecord(id: string, data: CollaboratorTrainingData): Promise<void> {
    const now = nowIso();
    const { error } = await createSupabaseAdminClient()
      .from('treinamentos_colaboradores')
      .update({ ...data, updated_at: now })
      .eq('id', id)
      .eq('companyId', data.companyId);
    if (error) {
      if (isMissingTable(error, 'treinamentos_colaboradores')) {
        await updateDocument(id, data.companyId, 'training_record', `${data.colaborador_id}-${data.treinamento_id}`, { ...data, updated_at: now });
        return;
      }
      throw error;
    }
  },

  async archiveRecord(id: string, companyId: string): Promise<void> {
    const now = nowIso();
    const { error } = await createSupabaseAdminClient()
      .from('treinamentos_colaboradores')
      .update({ status: 'cancelado', archived_at: now, updated_at: now })
      .eq('id', id)
      .eq('companyId', companyId);
    if (error) {
      if (isMissingTable(error, 'treinamentos_colaboradores')) {
        const rows = await getDocuments<Partial<CollaboratorTraining>>(companyId, 'training_record');
        const row = rows.find((item) => item.id === id);
        if (row) await updateDocument(id, companyId, 'training_record', row.documentName, { ...(row.formData ?? {}), status: 'cancelado', archived_at: now, updated_at: now });
        return;
      }
      throw error;
    }
  },
};
