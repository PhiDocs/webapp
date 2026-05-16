import type {
  ChecklistTemplate,
  ChecklistTemplateItem,
  Collaborator,
  Inspection,
  InspectionAction,
  InspectionActionFormValues,
  InspectionFormValues,
  InspectionItem,
  InspectionItemFormValues,
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

type InspectionData = InspectionFormValues & { companyId: string };
type InspectionItemData = InspectionItemFormValues & { companyId: string; inspecao_id: string };
type InspectionActionData = InspectionActionFormValues & { companyId: string; inspecao_id: string; item_id?: string };

const INSPECTION_TYPES = [
  'Inspecao de area',
  'Inspecao de maquinas',
  'Inspecao de ferramentas',
  'Inspecao de EPIs',
  'Inspecao de trabalho em altura',
  'Inspecao eletrica',
  'Inspecao de veiculos',
  'Inspecao de canteiro de obras',
  'Inspecao comportamental',
  'Inspecao de ordem e limpeza',
  'Inspecao de extintores',
  'Inspecao de sinalizacao',
  'Inspecao de produtos quimicos',
  'Inspecao de ergonomia',
];

const DEFAULT_QUESTIONS: Record<string, Array<{ pergunta: string; categoria: string }>> = {
  'Inspecao de area': [
    { pergunta: 'O ambiente esta limpo e organizado?', categoria: 'Organizacao' },
    { pergunta: 'As areas de circulacao estao desobstruidas?', categoria: 'Acesso' },
    { pergunta: 'Existe sinalizacao de seguranca adequada?', categoria: 'Sinalizacao' },
    { pergunta: 'Os extintores estao acessiveis?', categoria: 'Emergencia' },
    { pergunta: 'Ha iluminacao suficiente?', categoria: 'Ambiente' },
    { pergunta: 'Existem fios expostos ou improvisacoes eletricas?', categoria: 'Eletrica' },
    { pergunta: 'O piso apresenta risco de escorregamento ou queda?', categoria: 'Queda' },
    { pergunta: 'As saidas de emergencia estao livres?', categoria: 'Emergencia' },
  ],
  'Inspecao de EPIs': [
    { pergunta: 'Os colaboradores estao utilizando os EPIs obrigatorios?', categoria: 'Uso de EPI' },
    { pergunta: 'Os EPIs estao em bom estado de conservacao?', categoria: 'Conservacao' },
    { pergunta: 'Os EPIs sao adequados para a atividade executada?', categoria: 'Adequacao' },
    { pergunta: 'Ha colaboradores sem EPI obrigatorio?', categoria: 'Pendencia' },
    { pergunta: 'Os EPIs possuem CA valido?', categoria: 'CA' },
    { pergunta: 'Ha necessidade de substituicao de algum EPI?', categoria: 'Troca' },
    { pergunta: 'Os colaboradores foram orientados sobre o uso correto dos EPIs?', categoria: 'Orientacao' },
  ],
  'Inspecao de maquinas': [
    { pergunta: 'A maquina possui protecao adequada?', categoria: 'Protecao' },
    { pergunta: 'Existem partes moveis expostas?', categoria: 'Risco mecanico' },
    { pergunta: 'O botao de emergencia esta funcionando?', categoria: 'Emergencia' },
    { pergunta: 'Existe sinalizacao de risco na maquina?', categoria: 'Sinalizacao' },
    { pergunta: 'A maquina apresenta ruidos ou vibracoes anormais?', categoria: 'Operacao' },
    { pergunta: 'A manutencao preventiva esta em dia?', categoria: 'Manutencao' },
    { pergunta: 'O operador possui treinamento adequado?', categoria: 'Capacitacao' },
    { pergunta: 'Ha vazamentos, fios expostos ou improvisacoes?', categoria: 'Integridade' },
  ],
  'Inspecao de trabalho em altura': [
    { pergunta: 'Os colaboradores possuem treinamento NR35 valido?', categoria: 'Capacitacao' },
    { pergunta: 'Foi emitida permissao de trabalho, se aplicavel?', categoria: 'Permissao' },
    { pergunta: 'Os cintos de seguranca estao em bom estado?', categoria: 'EPI' },
    { pergunta: 'Os pontos de ancoragem sao adequados?', categoria: 'Ancoragem' },
    { pergunta: 'Existe protecao coletiva contra queda?', categoria: 'EPC' },
    { pergunta: 'A area inferior esta isolada e sinalizada?', categoria: 'Isolamento' },
    { pergunta: 'As escadas ou plataformas estao em boas condicoes?', categoria: 'Acesso' },
    { pergunta: 'As condicoes climaticas permitem a atividade?', categoria: 'Ambiente' },
  ],
  'Inspecao eletrica': [
    { pergunta: 'Existem quadros eletricos identificados?', categoria: 'Identificacao' },
    { pergunta: 'Ha fios expostos?', categoria: 'Risco eletrico' },
    { pergunta: 'Os paineis estao fechados e sinalizados?', categoria: 'Protecao' },
    { pergunta: 'Existe bloqueio e etiquetagem quando necessario?', categoria: 'Bloqueio' },
    { pergunta: 'Os colaboradores possuem NR10 valido?', categoria: 'Capacitacao' },
    { pergunta: 'As ferramentas sao isoladas quando aplicavel?', categoria: 'Ferramentas' },
    { pergunta: 'Ha risco de contato acidental com partes energizadas?', categoria: 'Contato' },
    { pergunta: 'O ambiente possui sinalizacao de risco eletrico?', categoria: 'Sinalizacao' },
  ],
  'Inspecao de ordem e limpeza': [
    { pergunta: 'O ambiente esta organizado?', categoria: 'Organizacao' },
    { pergunta: 'Ha residuos acumulados?', categoria: 'Limpeza' },
    { pergunta: 'Os materiais estao armazenados corretamente?', categoria: 'Armazenamento' },
    { pergunta: 'As passagens estao livres?', categoria: 'Acesso' },
    { pergunta: 'Ha risco de tropeco ou queda?', categoria: 'Queda' },
    { pergunta: 'Os produtos estao identificados?', categoria: 'Identificacao' },
    { pergunta: 'A area possui lixeiras adequadas?', categoria: 'Residuos' },
    { pergunta: 'Existe rotina de limpeza definida?', categoria: 'Rotina' },
  ],
};

function nowIso() {
  return new Date().toISOString();
}

function normalize(value?: string) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function slug(value: string) {
  return normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function isMissingTable(error: unknown, table: string) {
  if (!error || typeof error !== 'object') return false;
  const record = error as Record<string, unknown>;
  const message = [record.message, record.details, record.hint, record.code].filter((value): value is string => typeof value === 'string').join(' ');
  return message.includes(`public.${table}`) || message.includes(`relation "public.${table}" does not exist`) || message.includes('PGRST205');
}

function defaultTemplates(companyId: string): ChecklistTemplate[] {
  const now = nowIso();
  return INSPECTION_TYPES.map((type, index) => ({
    id: `default-checklist-${index + 1}-${slug(type)}`,
    companyId,
    nome: `Checklist - ${type}`,
    tipo_inspecao: type,
    descricao: `Modelo base para ${type.toLowerCase()}.`,
    ativo: true,
    created_at: now,
    updated_at: now,
  }));
}

function defaultTemplateItems(companyId: string, templates = defaultTemplates(companyId)): ChecklistTemplateItem[] {
  const now = nowIso();
  return templates.flatMap((template) => {
    const questions = DEFAULT_QUESTIONS[template.tipo_inspecao] || [
      { pergunta: 'O item inspecionado esta em conformidade com os requisitos de seguranca?', categoria: 'Geral' },
      { pergunta: 'Foram identificadas condicoes inseguras?', categoria: 'Geral' },
      { pergunta: 'Ha necessidade de plano de acao ou correcao?', categoria: 'Acao corretiva' },
    ];
    return questions.map((question, index) => ({
      id: `${template.id}-item-${index + 1}`,
      companyId,
      checklist_modelo_id: template.id,
      pergunta: question.pergunta,
      categoria: question.categoria,
      ordem: index + 1,
      obrigatorio: true,
      created_at: now,
      updated_at: now,
    }));
  });
}

function mapDocToInspection(row: DocumentRow<Partial<Inspection>>): Inspection {
  const data = row.formData ?? {};
  return {
    id: row.id,
    companyId: data.companyId || '',
    titulo: data.titulo || row.documentName,
    tipo: data.tipo || '',
    descricao: data.descricao || '',
    data_inspecao: data.data_inspecao || '',
    hora_inspecao: data.hora_inspecao || '',
    local: data.local || '',
    setor: data.setor || '',
    responsavel_inspecao: data.responsavel_inspecao || '',
    status: data.status || 'aberta',
    grau_risco: data.grau_risco || 'baixo',
    observacoes_gerais: data.observacoes_gerais || '',
    plano_acao_geral: data.plano_acao_geral || '',
    prazo_correcao: data.prazo_correcao || '',
    responsavel_correcao: data.responsavel_correcao || '',
    checklist_modelo_id: data.checklist_modelo_id || '',
    colaboradores_vinculados: data.colaboradores_vinculados || [],
    created_at: data.created_at || row.createdAt,
    updated_at: data.updated_at || row.updatedAt,
    archived_at: data.archived_at || null,
    itens: data.itens || [],
    acoes: data.acoes || [],
  };
}

function mapDocToTemplate(row: DocumentRow<Partial<ChecklistTemplate>>): ChecklistTemplate {
  const data = row.formData ?? {};
  return {
    id: row.id,
    companyId: data.companyId || '',
    nome: data.nome || row.documentName,
    tipo_inspecao: data.tipo_inspecao || '',
    descricao: data.descricao || '',
    ativo: data.ativo ?? true,
    created_at: data.created_at || row.createdAt,
    updated_at: data.updated_at || row.updatedAt,
  };
}

function mapDocToTemplateItem(row: DocumentRow<Partial<ChecklistTemplateItem>>): ChecklistTemplateItem {
  const data = row.formData ?? {};
  return {
    id: row.id,
    companyId: data.companyId || '',
    checklist_modelo_id: data.checklist_modelo_id || '',
    pergunta: data.pergunta || row.documentName,
    categoria: data.categoria || '',
    ordem: data.ordem || 0,
    obrigatorio: data.obrigatorio ?? true,
    created_at: data.created_at || row.createdAt,
    updated_at: data.updated_at || row.updatedAt,
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

function isOverdue(date?: string) {
  if (!date) return false;
  const due = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function computeInspectionStatus(inspection: Inspection): Inspection['status'] {
  if (['concluida', 'cancelada'].includes(inspection.status)) return inspection.status;
  if (isOverdue(inspection.prazo_correcao)) return 'atrasada';
  return inspection.status;
}

function attachInspectionItems(inspections: Inspection[], items: InspectionItem[], actions: InspectionAction[]) {
  return inspections.map((inspection) => ({
    ...inspection,
    status: computeInspectionStatus(inspection),
    itens: items.filter((item) => item.inspecao_id === inspection.id),
    acoes: actions.filter((action) => action.inspecao_id === inspection.id),
  }));
}

export const InspectionRepository = {
  async getTemplates(companyId: string): Promise<ChecklistTemplate[]> {
    const { data, error } = await createSupabaseAdminClient()
      .from('checklists_modelos')
      .select('*')
      .eq('companyId', companyId)
      .eq('ativo', true)
      .order('created_at', { ascending: false });
    if (error && !isMissingTable(error, 'checklists_modelos')) throw error;
    const saved = error ? (await getDocuments<Partial<ChecklistTemplate>>(companyId, 'inspection_template')).map(mapDocToTemplate) : ((data ?? []) as ChecklistTemplate[]);
    const defaults = defaultTemplates(companyId);
    const existing = new Set(saved.map((item) => normalize(item.tipo_inspecao)));
    return [...saved, ...defaults.filter((item) => !existing.has(normalize(item.tipo_inspecao)))];
  },

  async getTemplateItems(companyId: string): Promise<ChecklistTemplateItem[]> {
    const templates = await this.getTemplates(companyId);
    const { data, error } = await createSupabaseAdminClient()
      .from('checklist_itens_modelo')
      .select('*')
      .eq('companyId', companyId)
      .order('ordem', { ascending: true });
    if (error && !isMissingTable(error, 'checklist_itens_modelo')) throw error;
    const saved = error ? (await getDocuments<Partial<ChecklistTemplateItem>>(companyId, 'inspection_template_item')).map(mapDocToTemplateItem) : ((data ?? []) as ChecklistTemplateItem[]);
    const defaults = defaultTemplateItems(companyId, templates);
    const existing = new Set(saved.map((item) => `${item.checklist_modelo_id}:${normalize(item.pergunta)}`));
    return [...saved, ...defaults.filter((item) => !existing.has(`${item.checklist_modelo_id}:${normalize(item.pergunta)}`))];
  },

  async getItems(companyId: string): Promise<InspectionItem[]> {
    const { data, error } = await createSupabaseAdminClient()
      .from('itens_inspecao')
      .select('*')
      .eq('companyId', companyId)
      .order('created_at', { ascending: true });
    if (error && !isMissingTable(error, 'itens_inspecao')) throw error;
    if (error) {
      const inspections = (await getDocuments<Partial<Inspection>>(companyId, 'inspection')).map(mapDocToInspection);
      return inspections.flatMap((inspection) => inspection.itens || []);
    }
    return (data ?? []) as InspectionItem[];
  },

  async getActions(companyId: string): Promise<InspectionAction[]> {
    const { data, error } = await createSupabaseAdminClient()
      .from('planos_acao_inspecao')
      .select('*')
      .eq('companyId', companyId)
      .order('created_at', { ascending: true });
    if (error && !isMissingTable(error, 'planos_acao_inspecao')) throw error;
    if (error) {
      const inspections = (await getDocuments<Partial<Inspection>>(companyId, 'inspection')).map(mapDocToInspection);
      return inspections.flatMap((inspection) => inspection.acoes || []);
    }
    return ((data ?? []) as InspectionAction[]).map((action) => ({
      ...action,
      status: action.status === 'concluida' || action.status === 'cancelada' ? action.status : isOverdue(action.prazo) ? 'atrasada' : action.status,
    }));
  },

  async getInspections(companyId: string): Promise<Inspection[]> {
    const { data, error } = await createSupabaseAdminClient()
      .from('inspecoes')
      .select('*')
      .eq('companyId', companyId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (error && !isMissingTable(error, 'inspecoes')) throw error;
    if (error) {
      return (await getDocuments<Partial<Inspection>>(companyId, 'inspection'))
        .map(mapDocToInspection)
        .filter((inspection) => !inspection.archived_at)
        .map((inspection) => ({ ...inspection, status: computeInspectionStatus(inspection) }));
    }
    const [items, actions] = await Promise.all([this.getItems(companyId), this.getActions(companyId)]);
    return attachInspectionItems((data ?? []) as Inspection[], items, actions);
  },

  async getBundle(companyId: string): Promise<{
    collaborators: Collaborator[];
    inspections: Inspection[];
    templates: ChecklistTemplate[];
    templateItems: ChecklistTemplateItem[];
  }> {
    const [collaborators, inspections, templates, templateItems] = await Promise.all([
      CollaboratorRepository.getAllByCompany(companyId),
      this.getInspections(companyId),
      this.getTemplates(companyId),
      this.getTemplateItems(companyId),
    ]);
    return { collaborators, inspections, templates, templateItems };
  },

  getDefaultTypes() {
    return INSPECTION_TYPES;
  },

  getInitialItems(companyId: string, templateId: string, templateItems: ChecklistTemplateItem[]): InspectionItemFormValues[] {
    return templateItems
      .filter((item) => item.checklist_modelo_id === templateId)
      .sort((a, b) => a.ordem - b.ordem)
      .map((item) => ({
        pergunta: item.pergunta,
        categoria: item.categoria || '',
        resposta: 'nao_verificado',
        status: 'pendente',
        observacao: '',
        grau_risco: 'baixo',
        acao_recomendada: '',
        responsavel_correcao: '',
        prazo_correcao: '',
        foto_url: '',
        anexo_url: '',
      }));
  },

  async createInspection(data: InspectionData, initialItems: InspectionItemFormValues[] = []): Promise<string> {
    const now = nowIso();
    const { data: created, error } = await createSupabaseAdminClient()
      .from('inspecoes')
      .insert({ ...data, colaboradores_vinculados: data.colaboradores_vinculados || [], created_at: now, updated_at: now, archived_at: null })
      .select('id')
      .single();
    if (error) {
      if (isMissingTable(error, 'inspecoes')) {
        return createDocument(data.companyId, 'inspection', data.titulo, { ...data, itens: initialItems.map((item, index) => ({ ...item, id: `fallback-item-${Date.now()}-${index}`, companyId: data.companyId, inspecao_id: '', created_at: now, updated_at: now })), acoes: [], created_at: now, updated_at: now, archived_at: null });
      }
      throw error;
    }
    if (initialItems.length > 0) {
      await this.replaceItems(created.id as string, data.companyId, initialItems);
    }
    return created.id as string;
  },

  async updateInspection(id: string, data: InspectionData): Promise<void> {
    const now = nowIso();
    const { error } = await createSupabaseAdminClient()
      .from('inspecoes')
      .update({ ...data, updated_at: now })
      .eq('id', id)
      .eq('companyId', data.companyId);
    if (error) {
      if (isMissingTable(error, 'inspecoes')) {
        const rows = await getDocuments<Partial<Inspection>>(data.companyId, 'inspection');
        const row = rows.find((item) => item.id === id);
        await updateDocument(id, data.companyId, 'inspection', data.titulo, { ...(row?.formData ?? {}), ...data, updated_at: now });
        return;
      }
      throw error;
    }
  },

  async replaceItems(inspectionId: string, companyId: string, items: InspectionItemFormValues[]): Promise<void> {
    const now = nowIso();
    const { error: deleteError } = await createSupabaseAdminClient()
      .from('itens_inspecao')
      .delete()
      .eq('inspecao_id', inspectionId)
      .eq('companyId', companyId);
    if (deleteError) {
      if (isMissingTable(deleteError, 'itens_inspecao')) {
        const rows = await getDocuments<Partial<Inspection>>(companyId, 'inspection');
        const row = rows.find((item) => item.id === inspectionId);
        if (row) {
          const persisted = items.map((item, index) => ({ ...item, id: `fallback-item-${Date.now()}-${index}`, companyId, inspecao_id: inspectionId, created_at: now, updated_at: now }));
          await updateDocument(inspectionId, companyId, 'inspection', row.documentName, { ...(row.formData ?? {}), itens: persisted, updated_at: now });
        }
        return;
      }
      throw deleteError;
    }

    if (items.length === 0) return;
    const { error } = await createSupabaseAdminClient()
      .from('itens_inspecao')
      .insert(items.map((item) => ({ ...item, companyId, inspecao_id: inspectionId, created_at: now, updated_at: now })));
    if (error) throw error;
  },

  async archiveInspection(id: string, companyId: string): Promise<void> {
    const now = nowIso();
    const { error } = await createSupabaseAdminClient()
      .from('inspecoes')
      .update({ status: 'cancelada', archived_at: now, updated_at: now })
      .eq('id', id)
      .eq('companyId', companyId);
    if (error) {
      if (isMissingTable(error, 'inspecoes')) {
        const rows = await getDocuments<Partial<Inspection>>(companyId, 'inspection');
        const row = rows.find((item) => item.id === id);
        if (row) await updateDocument(id, companyId, 'inspection', row.documentName, { ...(row.formData ?? {}), status: 'cancelada', archived_at: now, updated_at: now });
        return;
      }
      throw error;
    }
  },

  async createAction(data: InspectionActionData): Promise<string> {
    const now = nowIso();
    const { data: created, error } = await createSupabaseAdminClient()
      .from('planos_acao_inspecao')
      .insert({ ...data, created_at: now, updated_at: now })
      .select('id')
      .single();
    if (error) {
      if (isMissingTable(error, 'planos_acao_inspecao')) {
        const rows = await getDocuments<Partial<Inspection>>(data.companyId, 'inspection');
        const row = rows.find((item) => item.id === data.inspecao_id);
        const id = `fallback-action-${Date.now()}`;
        if (row) {
          const existing = (row.formData?.acoes || []) as InspectionAction[];
          await updateDocument(data.inspecao_id, data.companyId, 'inspection', row.documentName, {
            ...(row.formData ?? {}),
            acoes: [...existing, { ...data, id, created_at: now, updated_at: now }],
            updated_at: now,
          });
        }
        return id;
      }
      throw error;
    }
    return created.id as string;
  },
};
