export type ImportDataType =
  | 'collaborators'
  | 'epis'
  | 'epiByFunction'
  | 'epiDeliveries'
  | 'trainings'
  | 'collaboratorTrainings'
  | 'extinguishers'
  | 'inspections'
  | 'sectors'
  | 'jobRoles'
  | 'works'
  | 'suppliers'
  | 'costs'
  | 'nonconformities'
  | 'incidents'
  | 'documents';

export type ImportField = {
  key: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'date' | 'number' | 'boolean' | 'email' | 'cpf';
  aliases?: string[];
};

export type ImportTypeConfig = {
  type: ImportDataType;
  label: string;
  description: string;
  implemented: boolean;
  fields: ImportField[];
  duplicateKey?: string;
};

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

export type ImportHistoryItem = {
  id: string;
  tipo_importacao: ImportDataType;
  nome_arquivo: string;
  formato_arquivo: string;
  status: 'pendente' | 'processando' | 'aguardando_revisao' | 'concluida' | 'concluida_com_erros' | 'cancelada' | 'falhou';
  total_linhas: number;
  linhas_validas: number;
  linhas_com_erro: number;
  linhas_importadas: number;
  linhas_ignoradas: number;
  usuario?: string;
  data_importacao: string;
};

export const importTypeConfigs: ImportTypeConfig[] = [
  {
    type: 'collaborators',
    label: 'Colaboradores',
    description: 'Importe cadastro de colaboradores com CPF, função, setor, status e dados complementares.',
    implemented: true,
    duplicateKey: 'cpf',
    fields: [
      { key: 'nome_completo', label: 'Nome completo', required: true, aliases: ['nome', 'colaborador', 'nome do colaborador', 'funcionario', 'funcionário'] },
      { key: 'cpf', label: 'CPF', required: true, type: 'cpf', aliases: ['documento', 'cpf colaborador'] },
      { key: 'funcao', label: 'Função', required: true, aliases: ['cargo', 'função', 'funcao/cargo'] },
      { key: 'setor', label: 'Setor', required: true, aliases: ['area', 'área', 'departamento'] },
      { key: 'status', label: 'Status', required: true, aliases: ['situacao', 'situação'] },
      { key: 'rg', label: 'RG' },
      { key: 'data_nascimento', label: 'Data de nascimento', type: 'date', aliases: ['nascimento'] },
      { key: 'telefone', label: 'Telefone', aliases: ['celular', 'contato'] },
      { key: 'email', label: 'E-mail', type: 'email', aliases: ['e-mail', 'mail'] },
      { key: 'endereco', label: 'Endereço', aliases: ['endereço'] },
      { key: 'matricula', label: 'Matrícula', aliases: ['matrícula', 'registro'] },
      { key: 'empresa', label: 'Empresa' },
      { key: 'data_admissao', label: 'Data de admissão', type: 'date', aliases: ['admissao', 'admissão'] },
      { key: 'tipo_contrato', label: 'Tipo de contrato', aliases: ['contrato'] },
      { key: 'gestor_responsavel', label: 'Gestor responsável', aliases: ['gestor', 'responsavel', 'responsável'] },
      { key: 'local_trabalho', label: 'Local de trabalho', aliases: ['local'] },
      { key: 'turno_trabalho', label: 'Turno', aliases: ['turno'] },
      { key: 'aso_validade', label: 'ASO válido até', type: 'date', aliases: ['aso', 'validade aso', 'aso valido ate'] },
      { key: 'atividades_realizadas', label: 'Atividades realizadas', aliases: ['atividades'] },
      { key: 'riscos_associados', label: 'Riscos associados', aliases: ['riscos'] },
      { key: 'observacoes_gerais', label: 'Observações', aliases: ['observacao', 'observação', 'obs'] },
    ],
  },
  {
    type: 'epis',
    label: 'EPIs',
    description: 'Importe catálogo de EPIs, CA, validade, troca padrão, valor e fornecedor.',
    implemented: true,
    duplicateKey: 'nome',
    fields: [
      { key: 'nome', label: 'Nome do EPI', required: true, aliases: ['epi', 'equipamento', 'nome'] },
      { key: 'categoria', label: 'Categoria' },
      { key: 'descricao', label: 'Descrição', aliases: ['descrição'] },
      { key: 'ca', label: 'CA', aliases: ['certificado de aprovacao', 'certificado de aprovação'] },
      { key: 'validade_ca', label: 'Validade do CA', type: 'date', aliases: ['validade ca'] },
      { key: 'prazo_troca_dias', label: 'Prazo padrão de troca em dias', type: 'number', aliases: ['prazo troca', 'troca dias'] },
      { key: 'valor_unitario', label: 'Valor unitário', type: 'number', aliases: ['valor', 'custo'] },
      { key: 'fornecedor', label: 'Fornecedor' },
      { key: 'ativo', label: 'Ativo', type: 'boolean', aliases: ['ativo/inativo', 'status'] },
      { key: 'observacoes', label: 'Observações', aliases: ['obs'] },
    ],
  },
  {
    type: 'extinguishers',
    label: 'Extintores',
    description: 'Importe extintores com código, área, agente, recarga, validade e localização.',
    implemented: true,
    duplicateKey: 'codigo',
    fields: [
      { key: 'codigo', label: 'Código do extintor', required: true, aliases: ['codigo', 'código', 'identificacao', 'identificação'] },
      { key: 'area', label: 'Área', required: true, aliases: ['setor', 'área'] },
      { key: 'tipo_agente', label: 'Tipo/agente extintor', required: true, aliases: ['agente', 'tipo', 'tipo agente'] },
      { key: 'numero_patrimonial', label: 'Número patrimonial', aliases: ['patrimonio', 'patrimônio'] },
      { key: 'unidade', label: 'Unidade/empresa', aliases: ['empresa', 'unidade'] },
      { key: 'localizacao_descritiva', label: 'Localização descritiva', aliases: ['localizacao', 'localização', 'local'] },
      { key: 'capacidade', label: 'Capacidade' },
      { key: 'classe_fogo', label: 'Classe de fogo', aliases: ['classe'] },
      { key: 'fabricante', label: 'Fabricante' },
      { key: 'modelo', label: 'Modelo' },
      { key: 'numero_serie', label: 'Número de série', aliases: ['serie', 'série'] },
      { key: 'data_fabricacao', label: 'Data de fabricação', type: 'date', aliases: ['fabricacao', 'fabricação'] },
      { key: 'data_ultima_recarga', label: 'Data da última recarga', type: 'date', aliases: ['ultima recarga', 'última recarga'] },
      { key: 'data_proxima_recarga', label: 'Data da próxima recarga', type: 'date', aliases: ['proxima recarga', 'próxima recarga'] },
      { key: 'data_validade', label: 'Data de validade', type: 'date', aliases: ['validade'] },
      { key: 'data_ultima_inspecao', label: 'Data da última inspeção', type: 'date', aliases: ['ultima inspecao', 'última inspeção'] },
      { key: 'frequencia_inspecao_dias', label: 'Frequência de inspeção', type: 'number', aliases: ['frequencia', 'frequência'] },
      { key: 'empresa_manutencao', label: 'Empresa de manutenção', aliases: ['manutencao', 'manutenção'] },
      { key: 'fornecedor', label: 'Fornecedor' },
      { key: 'observacoes', label: 'Observações', aliases: ['obs'] },
    ],
  },
  { type: 'epiByFunction', label: 'EPIs por Função', description: 'Relação entre funções e EPIs obrigatórios.', implemented: false, fields: [{ key: 'funcao', label: 'Função', required: true }, { key: 'epi', label: 'EPI', required: true }, { key: 'obrigatorio', label: 'Obrigatório', type: 'boolean' }] },
  { type: 'epiDeliveries', label: 'Entregas de EPI', description: 'Entregas por colaborador, data, quantidade e validade.', implemented: false, fields: [{ key: 'colaborador', label: 'Colaborador ou CPF', required: true }, { key: 'epi', label: 'EPI', required: true }, { key: 'data_entrega', label: 'Data de entrega', required: true, type: 'date' }] },
  { type: 'trainings', label: 'Treinamentos', description: 'Catálogo de treinamentos, normas, validade e carga horária.', implemented: false, fields: [{ key: 'nome', label: 'Nome do treinamento', required: true }, { key: 'norma', label: 'Norma' }, { key: 'validade_meses', label: 'Validade em meses', type: 'number' }] },
  { type: 'collaboratorTrainings', label: 'Treinamentos por Colaborador', description: 'Registros de treinamentos realizados por colaborador.', implemented: false, fields: [{ key: 'colaborador', label: 'Colaborador ou CPF', required: true }, { key: 'treinamento', label: 'Treinamento', required: true }, { key: 'data_realizacao', label: 'Data de realização', required: true, type: 'date' }] },
  { type: 'inspections', label: 'Inspeções', description: 'Inspeções, checklists, itens não conformes e responsáveis.', implemented: false, fields: [{ key: 'titulo', label: 'Título da inspeção', required: true }, { key: 'setor', label: 'Setor' }, { key: 'data_inspecao', label: 'Data da inspeção', type: 'date' }] },
  { type: 'sectors', label: 'Setores', description: 'Setores, unidade, responsável e status.', implemented: false, fields: [{ key: 'nome', label: 'Nome do setor', required: true }, { key: 'unidade', label: 'Unidade' }] },
  { type: 'jobRoles', label: 'Funções/Cargos', description: 'Funções, atividades e riscos associados.', implemented: false, fields: [{ key: 'nome', label: 'Nome da função', required: true }, { key: 'setor', label: 'Setor' }] },
  { type: 'works', label: 'Obras', description: 'Obras usadas no fluxo de APRs e PTs.', implemented: false, fields: [{ key: 'nome', label: 'Nome da obra', required: true }] },
  { type: 'suppliers', label: 'Fornecedores', description: 'Fornecedores e empresas de manutenção.', implemented: false, fields: [{ key: 'nome', label: 'Nome', required: true }] },
  { type: 'costs', label: 'Custos', description: 'Custos de prevenção, correção, incidentes e fornecedores.', implemented: false, fields: [{ key: 'descricao', label: 'Descrição', required: true }, { key: 'valor', label: 'Valor', required: true, type: 'number' }] },
  { type: 'nonconformities', label: 'Não Conformidades', description: 'NCs, origem, gravidade, prazo e responsável.', implemented: false, fields: [{ key: 'titulo', label: 'Título', required: true }] },
  { type: 'incidents', label: 'Incidentes', description: 'Incidentes, tipo, gravidade, causa e ações.', implemented: false, fields: [{ key: 'titulo', label: 'Título', required: true }] },
  { type: 'documents', label: 'Documentos', description: 'Documentos e anexos para registro no sistema.', implemented: false, fields: [{ key: 'nome', label: 'Nome', required: true }] },
];

export const importStorageKey = (companyId: string) => `phidocs:imports:${companyId}`;

export function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function getImportConfig(type: ImportDataType) {
  return importTypeConfigs.find((item) => item.type === type) || importTypeConfigs[0];
}

export function detectDelimiter(sample: string) {
  const firstLine = sample.split(/\r?\n/).find((line) => line.trim()) || '';
  const delimiters = [',', ';', '\t'];
  return delimiters
    .map((delimiter) => ({ delimiter, count: firstLine.split(delimiter).length }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ',';
}

export function parseCsv(text: string): ParsedCsv {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      row.push(current.trim());
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(current.trim());
      current = '';
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some((cell) => cell.trim())) rows.push(row);

  const headers = (rows[0] || []).map((header, index) => header || `Coluna ${index + 1}`);
  const data = rows.slice(1).map((values) => headers.reduce<Record<string, string>>((acc, header, index) => {
    acc[header] = values[index] || '';
    return acc;
  }, {}));

  return { headers, rows: data };
}

export function autoMapFields(headers: string[], config: ImportTypeConfig) {
  const normalizedHeaders = headers.map((header) => ({ header, normalized: normalizeHeader(header) }));
  return config.fields.reduce<Record<string, string>>((acc, field) => {
    const names = [field.key, field.label, ...(field.aliases || [])].map(normalizeHeader);
    const match = normalizedHeaders.find((entry) => names.includes(entry.normalized) || names.some((name) => entry.normalized.includes(name)));
    if (match) acc[field.key] = match.header;
    return acc;
  }, {});
}

export function normalizeDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (!match) return trimmed;
  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${month}-${day}`;
}

export function isValidDateValue(value: string) {
  if (!value.trim()) return true;
  const normalized = normalizeDate(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return false;
  const date = new Date(`${normalized}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

export function parseBooleanValue(value: string, defaultValue = true) {
  const normalized = normalizeHeader(value);
  if (!normalized) return defaultValue;
  if (['sim', 's', 'yes', 'true', 'ativo', '1'].includes(normalized)) return true;
  if (['nao', 'n', 'no', 'false', 'inativo', '0'].includes(normalized)) return false;
  return defaultValue;
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function isValidCpf(value: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const calc = (factor: number) => {
    let total = 0;
    for (let i = 0; i < factor - 1; i += 1) total += Number(cpf[i]) * (factor - i);
    const digit = (total * 10) % 11;
    return digit === 10 ? 0 : digit;
  };
  return calc(10) === Number(cpf[9]) && calc(11) === Number(cpf[10]);
}

export function getTemplateCsv(config: ImportTypeConfig) {
  const headers = config.fields.map((field) => field.label);
  const example = config.fields.map((field) => {
    if (field.type === 'date') return '2026-05-14';
    if (field.type === 'number') return '30';
    if (field.type === 'boolean') return 'Sim';
    if (field.type === 'email') return 'contato@empresa.com';
    if (field.type === 'cpf') return '123.456.789-09';
    if (field.key.includes('status')) return 'ativo';
    if (field.key.includes('codigo')) return 'EXT-001';
    if (field.key.includes('area') || field.key.includes('setor')) return 'Produção';
    if (field.key.includes('funcao')) return 'Eletricista';
    if (field.key.includes('nome')) return config.type === 'epis' ? 'Capacete de segurança' : 'João da Silva';
    if (field.key.includes('tipo_agente')) return 'Pó Químico ABC';
    return '';
  });
  return `${headers.join(';')}\n${example.join(';')}\n`;
}
