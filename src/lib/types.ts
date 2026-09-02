import { z } from 'zod';
import { DOCUMENT_TYPES, PT_FIT_STATUS, type DocumentType } from './constants';
import { ptBr } from './data/strings';
import { isValidBrazilianPhone } from './utils/phone-validator';

const validationMessages = {
  ...ptBr.validations,
  responsibleName: "Nome do responsável é obrigatório.",
  responsibleRole: "Função do responsável é obrigatória.",
  atLeastOneResponsible: "É necessário adicionar pelo menos um responsável.",
  teamDate: "A data para o membro da equipe é obrigatória.",
  teamName: "O nome do membro da equipe é obrigatório.",
  teamRole: "A função do membro da equipe é obrigatória.",
  companyName: "Nome da empresa é obrigatório.",
  workName: "Nome da obra é obrigatório.",
  workAddress: "Endereço da obra é obrigatório.",
  startDate: "Data de início é obrigatória.",
  endDate: "Data de término é obrigatória.",
  workLocation: "Local da obra é obrigatório.",
  endDateBeforeStartDate: "A data de término não pode ser anterior à data de início.",
  ptLocation: "Local da atividade é obrigatório para PT.",
  ptDate: "Data é obrigatória para PT.",
  ptStartTime: "Hora de início é obrigatória para PT.",
  firstName: "Nome é obrigatório.",
  lastName: "Sobrenome é obrigatório.",
  role: "Função é obrigatória.",
  cpf: "CPF é obrigatório.",
  roleId: "A função é obrigatória.",
  workIdRequired: "É necessário selecionar uma obra.",
  employeeIdRequired: "É necessário selecionar um funcionário.",
};


export const responsiblePersonSchema = z.object({
  employeeId: z.string().optional(),
  name: z.string(),
  role: z.string(),
  // Assinafy integration fields (assinatura por e-mail)
  email: z.string().email().optional(),
  phone: z.string().optional(),
  useAssinafy: z.boolean().default(true),
  /**
   * Como esta pessoa assina: por e-mail, por WhatsApp ou a mao no papel.
   * 'useAssinafy' continua existindo e fica sincronizado (true so no e-mail),
   * porque e ele que decide o que vai para a Assinafy.
   */
  signatureMethod: z.enum(['email', 'whatsapp', 'manual']).optional(),
  signatureData: z.string().optional(),
  assinafySignerId: z.string().optional(),
  assinafySigningUrl: z.string().optional(),
  assinafyStatus: z.enum(['pending', 'signed', 'declined']).optional(),
}).superRefine((data, ctx) => {
  // Only validate if an employee was selected
  if (data.employeeId) {
    if (!data.name) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.responsibleName, path: ['name'] });
    }
    if (!data.role) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.responsibleRole, path: ['role'] });
    }
    if (data.useAssinafy && !data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: validationMessages.emailRequired,
        path: ['email'],
      });
    }
  }
});
export const teamMemberSchema = z.object({
  employeeId: z.string().optional(),
  date: z.string().min(1, validationMessages.teamDate),
  name: z.string().min(1, validationMessages.teamName),
  role: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  useAssinafy: z.boolean().default(true),
  /**
   * Como esta pessoa assina: por e-mail, por WhatsApp ou a mao no papel.
   * 'useAssinafy' continua existindo e fica sincronizado (true so no e-mail),
   * porque e ele que decide o que vai para a Assinafy.
   */
  signatureMethod: z.enum(['email', 'whatsapp', 'manual']).optional(),
  isManual: z.boolean().optional(),
  signatureData: z.string().optional(),
}).superRefine((data, ctx) => {
  const metodo = data.signatureMethod || (data.useAssinafy ? 'email' : 'manual');
  if (metodo === 'email' && !data.email) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: validationMessages.emailRequired,
      path: ['email'],
    });
  }
  if (metodo === 'whatsapp' && !data.phone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Informe o telefone para assinatura por WhatsApp.',
      path: ['phone'],
    });
  }
});

export const analysisStepSchema = z.object({
  item: z.number().optional(),
  activity: z.string().optional(),

  // Listas por etapa. Sao a forma editavel item a item na tela.
  hazards: z.array(z.string()).optional(),
  risks: z.array(z.string()).optional(),
  consequences: z.array(z.string()).optional(),
  measures: z.array(z.string()).optional(),
  epis: z.array(z.string()).optional(),
  epcs: z.array(z.string()).optional(),

  // Mantidos e sempre sincronizados com as listas acima. Documentos emitidos
  // antes desta mudanca so tem estes dois, e continuam abrindo e imprimindo.
  potentialRisks: z.string().optional(),
  preventiveMeasures: z.string().optional(),
});

export const ptChecklistSchema = z.record(z.boolean());

export const ptTeamMemberSchema = z.object({
  name: z.string(),
  rgCpf: z.string(),
  func: z.string(),
  empresa: z.string(),
  apto: z.enum([PT_FIT_STATUS.YES, PT_FIT_STATUS.NO, PT_FIT_STATUS.EMPTY]),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  useAssinafy: z.boolean().default(true),
  /**
   * Como esta pessoa assina: por e-mail, por WhatsApp ou a mao no papel.
   * 'useAssinafy' continua existindo e fica sincronizado (true so no e-mail),
   * porque e ele que decide o que vai para a Assinafy.
   */
  signatureMethod: z.enum(['email', 'whatsapp', 'manual']).optional(),
});

const ptSignerSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  useAssinafy: z.boolean().default(true),
  assinafySignerId: z.string().optional(),
  assinafySigningUrl: z.string().optional(),
  assinafyStatus: z.enum(['pending', 'signed', 'declined']).optional(),
}).superRefine((data, ctx) => {
  if (data.name && !data.email) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "E-mail é obrigatório para assinatura por e-mail.",
      path: ['email'],
    });
  }
});

export const ptFormSchema = z.object({
  // PT specific fields
  ptLocalAtividade: z.string(),
  ptEquipamentoLinha: z.string(),
  ptData: z.string(),
  ptHoraInicio: z.string(),
  ptHoraFim: z.string(),
  ptDescricaoTarefa: z.string(),

  ptChecklist: ptChecklistSchema,

  /**
   * De onde veio cada controle marcado: regra do sistema, sugestao da IA ou
   * mao do tecnico. Fica no formData, sem tocar no banco.
   */
  ptControlesAdicionados: z.array(z.object({
    itemId: z.string(),
    origem: z.enum(['regra', 'ia', 'manual']),
    em: z.string(),
    por: z.string().optional(),
    removidoEm: z.string().optional(),
  })).optional(),

  // Optional Sections
  ptEnableEspacoConfinado: z.boolean().optional(),
  ptEnableVigia: z.boolean().optional(),
  ptEnableResgatistas: z.boolean().optional(),


  ptOxigenio: z.string(),
  ptLE: z.string(),
  ptH2S: z.string(),
  ptCO2: z.string(),
  ptObservacao: z.string(),
  ptVisto: z.string(),

  ptColaboradores: z.array(ptTeamMemberSchema),
  ptVigias: z.array(ptTeamMemberSchema),
  ptResgatistas: z.array(ptTeamMemberSchema),

  /**
   * Liberacao da PT como lista de pessoas, no mesmo formato da APR.
   * Os tres campos abaixo continuam existindo para documentos ja emitidos.
   */
  ptResponsaveis: z.array(responsiblePersonSchema).optional(),

  // Signatures (legado, mantido para documentos antigos)
  ptGestorArea: ptSignerSchema,
  ptResponsavelAtividade: ptSignerSchema,
  ptSesmt: ptSignerSchema,
});


export const formSchema = z.object({
  documentType: z.enum([DOCUMENT_TYPES.APR, DOCUMENT_TYPES.PT]),

  // Work Data (APR) - Populated by selecting a work
  workId: z.string().optional(),
  workName: z.string().optional(),
  workAddress: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  workLocationDetails: z.string().optional(),

  activityDescription: z.string().optional(),

  // Responsible Person (APR)
  responsiblePersons: z.array(responsiblePersonSchema).min(1, validationMessages.atLeastOneResponsible),

  // Team (APR)
  teamMembers: z.array(teamMemberSchema).optional(),

  // Manual Analysis Steps (APR)
  analysisSteps: z.array(analysisStepSchema).optional(),

  // PT Form Data
  pt: ptFormSchema,
}).superRefine((data, ctx) => {
  if (data.documentType === DOCUMENT_TYPES.APR) {
    if (!data.workId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.workIdRequired, path: ["workId"] });

    // O responsavel pode vir do cadastro de funcionarios, do cadastro de
    // responsaveis reutilizaveis ou ser informado manualmente. Por isso a
    // validacao exige nome e funcao, e nao mais um employeeId.
    data.responsiblePersons.forEach((person, index) => {
      if (!person.name?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.responsibleName, path: [`responsiblePersons.${index}.name`] });
      }
      if (!person.role?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.responsibleRole, path: [`responsiblePersons.${index}.role`] });
      }
    });

    if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: validationMessages.endDateBeforeStartDate,
        path: ['endDate'],
      });
    }

  } else if (data.documentType === DOCUMENT_TYPES.PT) {
    if (!data.pt.ptLocalAtividade) ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.ptLocation, path: ["pt", "ptLocalAtividade"] });
    if (!data.pt.ptData) ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.ptDate, path: ["pt", "ptData"] });
    if (!data.pt.ptHoraInicio) ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.ptStartTime, path: ["pt", "ptHoraInicio"] });
  }
});

export type SafetyFormValues = z.input<typeof formSchema>;
export type ResponsiblePerson = z.infer<typeof responsiblePersonSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type AnalysisStep = z.infer<typeof analysisStepSchema>;
export type PtFormValues = z.infer<typeof ptFormSchema>;
export type PtTeamMember = z.input<typeof ptTeamMemberSchema>;
export type PtSigner = z.input<typeof ptSignerSchema>;
export type PtSignerInput = z.input<typeof ptSignerSchema>;

// --- Signature Documents ---
export type SignatureSigner = {
  name: string;
  email: string;
  phone?: string;
  assinafySignerId?: string;
  signingUrl?: string;
  status: 'pending' | 'signed' | 'declined';
};

export type SignatureDocument = {
  id: string;
  companyId: string;
  documentType: DocumentType;
  documentName: string;
  assinafyDocumentId: string;
  assinafyAssignmentId: string;
  status: 'pending' | 'signed' | 'certificated' | 'declined' | 'uploaded' | 'expired';
  signers: SignatureSigner[];
  /** Array plano de e-mails para consulta no Supabase. */
  signerEmails: string[];
  createdAt: string;
  updatedAt?: string;
  lastSyncedAt?: string;
};


// --- Saved Documents (History) ---
export type SavedDocument = {
  id: string;
  companyId: string;
  documentType: DocumentType;
  documentName: string;
  /** 'sent' e legado e equivale a 'awaiting_signature'. Ver lib/document-status. */
  status:
    | 'draft'
    | 'in_review'
    | 'awaiting_signature'
    | 'sent'
    | 'signed'
    | 'completed'
    | 'declined'
    | 'cancelled';
  formData: SafetyFormValues;
  analysisData: any | null;
  equipmentData: any | null;
  signatureDocumentId?: string;
  /** A partir daqui o conteudo nao pode mais ser alterado em silencio. */
  lockedAt?: string | null;
  version?: number;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

// --- Auth Schemas ---
export const loginSchema = z.object({
  email: z.string().min(1, validationMessages.emailRequired).email(validationMessages.invalidEmail),
  password: z.string().min(1, validationMessages.passwordRequired),
});
export type LoginValues = z.infer<typeof loginSchema>;


export const signupSchema = z.object({
  name: z.string().min(1, validationMessages.nameRequired),
  email: z.string().min(1, validationMessages.emailRequired).email(validationMessages.invalidEmail),
  password: z.string().min(6, validationMessages.passwordMinLength),
  confirmPassword: z.string().min(1, validationMessages.confirmPasswordRequired),
  phone: z
    .string()
    .optional()
    .refine((value) => !value || isValidBrazilianPhone(value), {
      message: validationMessages.invalidPhone,
    }),
}).refine((data) => data.password === data.confirmPassword, {
  message: validationMessages.passwordsMustMatch,
  path: ['confirmPassword'],
});
export type SignupValues = z.infer<typeof signupSchema>;


// --- Company Schema ---
export const companySettingsFormSchema = z.object({
  name: z.string().min(3, "O nome da empresa deve ter pelo menos 3 caracteres."),
  logo: z.string().optional(),
  n8nProductionUrl: z.string().url({ message: "Por favor, insira uma URL de produção válida." }).optional().or(z.literal('')),
  n8nTestUrl: z.string().url({ message: "Por favor, insira uma URL de teste válida." }).optional().or(z.literal('')),
});
export type CompanySettingsFormValues = z.infer<typeof companySettingsFormSchema>;

export type Company = {
  id: string;
  name: string;
  logo?: string;
  n8nProductionUrl?: string;
  n8nTestUrl?: string;
  createdAt: string;
  ownerUid?: string;
}

// --- Work Schema ---
export const workClientFormSchema = z.object({
  name: z.string().min(3, "O nome da obra deve ter pelo menos 3 caracteres."),
  address: z.string().min(5, "O endereço deve ter pelo menos 5 caracteres."),
  workLocationDetails: z.string().min(3, "O local da obra deve ter pelo menos 3 caracteres."),
  startDate: z.string().min(1, "A data de início é obrigatória."),
  endDate: z.string().min(1, "A data de término é obrigatória."),
  projeto_id: z.string().optional(),
  tipo_servico: z.string().optional(),
  status: z.string().optional(),
  cnpj: z.string().optional(),
  razao_social: z.string().optional(),
  nome_fantasia: z.string().optional(),
  situacao_cadastral: z.string().optional(),
  cnae_principal: z.string().optional(),
  logo_empresa_url: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  responsavel_obra: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().optional(),
  descricao_atividade: z.string().optional(),
  observacoes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A data de término não pode ser anterior à data de início.",
      path: ['endDate'],
    });
  }
});
export type WorkClientFormValues = z.infer<typeof workClientFormSchema>;

export type WorkFormValues = WorkClientFormValues & {
  companyId: string;
};

export type Work = {
  id: string;
  name: string;
  address: string;
  workLocationDetails: string;
  startDate: string;
  endDate: string;
  companyId: string;
  projeto_id?: string | null;
  tipo_servico?: string | null;
  status?: string | null;
  cnpj?: string | null;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  situacao_cadastral?: string | null;
  cnae_principal?: string | null;
  logo_empresa_url?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  responsavel_obra?: string | null;
  telefone?: string | null;
  email?: string | null;
  descricao_atividade?: string | null;
  observacoes?: string | null;
  createdAt: string;
  deletedAt?: string | null;
}

export type AprPtProjectStatus = 'ativo' | 'em_andamento' | 'arquivado' | 'concluido';

export type AprPtProject = {
  id: string;
  companyId: string;
  nome_projeto: string;
  descricao?: string | null;
  responsavel_interno?: string | null;
  data_inicio?: string | null;
  data_termino_prevista?: string | null;
  cliente_principal?: string | null;
  nome_empresa?: string | null;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cnpj_empresa?: string | null;
  logo_empresa_url?: string | null;
  situacao_cadastral?: string | null;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  responsavel?: string | null;
  telefone?: string | null;
  email?: string | null;
  cnae_principal?: string | null;
  observacoes?: string | null;
  status: AprPtProjectStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type AprPtProjectFormValues = Omit<AprPtProject, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

// --- Responsible Contact ---
// Cadastro reutilizavel de responsaveis da APR/PT (SST, tecnico, gestor, cliente).
// Nao e uma "equipe": sao pessoas individuais vinculadas ao documento como
// responsavel ou assinante. O documento emitido guarda uma copia dos dados.
export type ResponsibleContact = {
  id: string;
  companyId: string;
  name: string;
  role: string;
  organization?: string | null;
  email?: string | null;
  phone?: string | null;
  signsByDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type ResponsibleContactInput = Omit<
  ResponsibleContact,
  'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

// --- Employee Schema ---
export const employeeFormSchema = z.object({
  firstName: z.string().min(1, validationMessages.firstName),
  lastName: z.string().min(1, validationMessages.lastName),
  email: z.string().email(validationMessages.invalidEmail),
  cpf: z.string().min(1, validationMessages.cpf),
  roleId: z.string().optional(),
  roleName: z.string().optional(),
  subcontractorId: z.string().optional(),
  phone: z.string().optional(),
}).refine((data) => data.roleId || data.roleName, {
  message: "Função é obrigatória (selecione ou crie uma nova).",
  path: ["roleId"],
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export type Employee = {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  cpf: string;
  phone?: string;
  roleId: string;
  roleName?: string;
  subcontractorId?: string | null;
  subcontractorName?: string | null;
  createdAt: string;
  deletedAt?: string | null;
}

// --- Collaborator Schema ---
export const collaboratorStatusValues = ['ativo', 'afastado', 'desligado'] as const;

function onlyDigits(value?: string) {
  return (value || '').replace(/\D/g, '');
}

function isValidCpf(value?: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  const calcDigit = (base: string, factor: number) => {
    const total = base.split('').reduce((sum, digit) => {
      const result = sum + Number(digit) * factor;
      factor -= 1;
      return result;
    }, 0);
    const rest = (total * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const digit1 = calcDigit(cpf.slice(0, 9), 10);
  const digit2 = calcDigit(cpf.slice(0, 10), 11);
  return digit1 === Number(cpf[9]) && digit2 === Number(cpf[10]);
}

function isNotFutureDate(value?: string) {
  if (!value) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return true;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date <= today;
}

export const collaboratorFormSchema = z.object({
  nome_completo: z.string().min(1, 'Nome completo e obrigatorio.'),
  cpf: z.string().min(1, 'CPF e obrigatorio.').refine(isValidCpf, 'Informe um CPF valido.'),
  rg: z.string().optional(),
  data_nascimento: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('E-mail invalido.').optional().or(z.literal('')),
  endereco: z.string().optional(),
  foto_url: z.string().url('Informe uma URL valida para a foto.').optional().or(z.literal('')),
  matricula: z.string().optional(),
  empresa: z.string().optional(),
  setor: z.string().min(1, 'Setor e obrigatorio.'),
  funcao: z.string().min(1, 'Funcao e obrigatoria.'),
  data_admissao: z.string().optional().refine(isNotFutureDate, 'A data de admissao nao pode ser futura.'),
  tipo_contrato: z.string().optional(),
  status: z.enum(collaboratorStatusValues, { required_error: 'Status e obrigatorio.' }),
  gestor_responsavel: z.string().optional(),
  local_trabalho: z.string().optional(),
  turno_trabalho: z.string().optional(),
  atividades_realizadas: z.string().optional(),
  riscos_associados: z.string().optional(),
  aso_validade: z.string().optional(),
  observacoes_seguranca: z.string().optional(),
  observacoes_gerais: z.string().optional(),
});

export type CollaboratorFormValues = z.infer<typeof collaboratorFormSchema>;

export type CollaboratorAiRecommendations = {
  generated_at: string;
  epi_obrigatorios: string[];
  epi_entregues: string[];
  epi_pendentes: string[];
  treinamentos_obrigatorios: string[];
  treinamentos_realizados: string[];
  treinamentos_vencidos: string[];
  riscos_associados: string[];
  medidas_preventivas: string[];
  nao_conformidades: string[];
  incidentes: string[];
  relatorios: string[];
  observacoes: string;
};

export type Collaborator = CollaboratorFormValues & {
  id: string;
  companyId: string;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  ai_recommendations?: CollaboratorAiRecommendations | null;
};

// --- EPI Schema ---
export const epiDeliveryStatusValues = ['entregue', 'pendente', 'vencido', 'proximo_troca', 'substituido', 'devolvido', 'cancelado'] as const;

export const epiFormSchema = z.object({
  nome: z.string().min(1, 'Nome do EPI e obrigatorio.'),
  descricao: z.string().optional(),
  categoria: z.string().optional(),
  ca: z.string().optional(),
  validade_ca: z.string().optional(),
  valor_unitario: z.coerce.number().min(0).optional(),
  fornecedor: z.string().optional(),
  data_compra: z.string().optional(),
  prazo_troca_dias: z.coerce.number().min(0).optional(),
  ativo: z.boolean().default(true),
});

export const epiDeliveryFormSchema = z.object({
  colaborador_id: z.string().min(1, 'Selecione um colaborador.'),
  epi_id: z.string().min(1, 'Selecione um EPI.'),
  data_entrega: z.string().min(1, 'Data de entrega e obrigatoria.'),
  data_validade: z.string().optional(),
  data_proxima_troca: z.string().optional(),
  quantidade: z.coerce.number().min(1, 'Quantidade deve ser maior que zero.'),
  responsavel_entrega: z.string().min(1, 'Responsavel pela entrega e obrigatorio.'),
  status: z.enum(epiDeliveryStatusValues),
  assinatura_url: z.string().optional(),
  comprovante_url: z.string().optional(),
  observacoes: z.string().optional(),
});

export type EpiFormValues = z.infer<typeof epiFormSchema>;
export type EpiDeliveryFormValues = z.infer<typeof epiDeliveryFormSchema>;
export type EpiDeliveryStatus = typeof epiDeliveryStatusValues[number];

export type Epi = EpiFormValues & {
  id: string;
  companyId: string;
  created_at: string;
  updated_at: string;
};

export type EpiByFunction = {
  id: string;
  companyId: string;
  funcao: string;
  epi_id: string;
  obrigatorio: boolean;
  observacao?: string;
  created_at: string;
  updated_at: string;
};

export type EpiDelivery = EpiDeliveryFormValues & {
  id: string;
  companyId: string;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  colaborador?: Collaborator | null;
  epi?: Epi | null;
};

export type EpiRequiredItem = {
  epi: Epi;
  obrigatorio: boolean;
  observacao?: string;
  source: 'funcao' | 'ia' | 'padrao';
};

// --- Training Schema ---
export const trainingRecordStatusValues = ['valido', 'pendente', 'vencido', 'proximo_vencimento', 'dispensado', 'cancelado'] as const;

export const trainingFormSchema = z.object({
  nome: z.string().min(1, 'Nome do treinamento e obrigatorio.'),
  norma: z.string().optional(),
  descricao: z.string().optional(),
  carga_horaria: z.coerce.number().min(0).optional(),
  validade_meses: z.coerce.number().min(0).optional(),
  obrigatorio: z.boolean().default(true),
  ativo: z.boolean().default(true),
  observacoes: z.string().optional(),
});

export const collaboratorTrainingFormSchema = z.object({
  colaborador_id: z.string().min(1, 'Selecione um colaborador.'),
  treinamento_id: z.string().min(1, 'Selecione um treinamento.'),
  data_realizacao: z.string().min(1, 'Data de realizacao e obrigatoria.'),
  data_vencimento: z.string().optional(),
  instrutor: z.string().optional(),
  empresa_treinamento: z.string().optional(),
  carga_horaria_realizada: z.coerce.number().min(0).optional(),
  certificado_url: z.string().optional(),
  lista_presenca_url: z.string().optional(),
  status: z.enum(trainingRecordStatusValues),
  observacoes: z.string().optional(),
});

export type TrainingFormValues = z.infer<typeof trainingFormSchema>;
export type CollaboratorTrainingFormValues = z.infer<typeof collaboratorTrainingFormSchema>;
export type TrainingRecordStatus = typeof trainingRecordStatusValues[number];

export type Training = TrainingFormValues & {
  id: string;
  companyId: string;
  created_at: string;
  updated_at: string;
};

export type TrainingByFunction = {
  id: string;
  companyId: string;
  funcao: string;
  treinamento_id: string;
  obrigatorio: boolean;
  observacao?: string;
  created_at: string;
  updated_at: string;
};

export type CollaboratorTraining = CollaboratorTrainingFormValues & {
  id: string;
  companyId: string;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  colaborador?: Collaborator | null;
  treinamento?: Training | null;
};

export type RequiredTrainingItem = {
  treinamento: Training;
  obrigatorio: boolean;
  observacao?: string;
  source: 'funcao' | 'ia' | 'padrao';
};

// --- Inspection Schema ---
export const inspectionStatusValues = ['aberta', 'em_andamento', 'concluida', 'atrasada', 'cancelada'] as const;
export const inspectionRiskValues = ['baixo', 'medio', 'alto', 'critico'] as const;
export const inspectionItemAnswerValues = ['conforme', 'nao_conforme', 'nao_se_aplica', 'nao_verificado'] as const;
export const inspectionItemStatusValues = ['conforme', 'nao_conforme', 'pendente', 'corrigido', 'nao_se_aplica'] as const;
export const inspectionActionStatusValues = ['aberta', 'em_andamento', 'concluida', 'atrasada', 'cancelada'] as const;

export const inspectionFormSchema = z.object({
  titulo: z.string().min(1, 'Titulo da inspecao e obrigatorio.'),
  tipo: z.string().min(1, 'Tipo de inspecao e obrigatorio.'),
  descricao: z.string().optional(),
  data_inspecao: z.string().min(1, 'Data da inspecao e obrigatoria.'),
  hora_inspecao: z.string().optional(),
  local: z.string().min(1, 'Local e obrigatorio.'),
  setor: z.string().min(1, 'Setor e obrigatorio.'),
  responsavel_inspecao: z.string().min(1, 'Responsavel pela inspecao e obrigatorio.'),
  status: z.enum(inspectionStatusValues),
  grau_risco: z.enum(inspectionRiskValues),
  observacoes_gerais: z.string().optional(),
  plano_acao_geral: z.string().optional(),
  prazo_correcao: z.string().optional(),
  responsavel_correcao: z.string().optional(),
  checklist_modelo_id: z.string().optional(),
  colaboradores_vinculados: z.array(z.string()).optional(),
});

export const inspectionItemFormSchema = z.object({
  pergunta: z.string().min(1, 'Pergunta e obrigatoria.'),
  categoria: z.string().optional(),
  resposta: z.enum(inspectionItemAnswerValues),
  status: z.enum(inspectionItemStatusValues),
  observacao: z.string().optional(),
  grau_risco: z.enum(inspectionRiskValues),
  acao_recomendada: z.string().optional(),
  responsavel_correcao: z.string().optional(),
  prazo_correcao: z.string().optional(),
  foto_url: z.string().optional(),
  anexo_url: z.string().optional(),
});

export const inspectionActionFormSchema = z.object({
  descricao: z.string().min(1, 'Descricao da acao e obrigatoria.'),
  responsavel: z.string().optional(),
  prazo: z.string().optional(),
  status: z.enum(inspectionActionStatusValues),
  data_conclusao: z.string().optional(),
  observacoes: z.string().optional(),
});

export type InspectionStatus = typeof inspectionStatusValues[number];
export type InspectionRisk = typeof inspectionRiskValues[number];
export type InspectionItemAnswer = typeof inspectionItemAnswerValues[number];
export type InspectionItemStatus = typeof inspectionItemStatusValues[number];
export type InspectionActionStatus = typeof inspectionActionStatusValues[number];
export type InspectionFormValues = z.infer<typeof inspectionFormSchema>;
export type InspectionItemFormValues = z.infer<typeof inspectionItemFormSchema>;
export type InspectionActionFormValues = z.infer<typeof inspectionActionFormSchema>;

export type ChecklistTemplate = {
  id: string;
  companyId: string;
  nome: string;
  tipo_inspecao: string;
  descricao?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type ChecklistTemplateItem = {
  id: string;
  companyId: string;
  checklist_modelo_id: string;
  pergunta: string;
  categoria?: string;
  ordem: number;
  obrigatorio: boolean;
  created_at: string;
  updated_at: string;
};

export type InspectionItem = InspectionItemFormValues & {
  id: string;
  companyId: string;
  inspecao_id: string;
  created_at: string;
  updated_at: string;
};

export type InspectionAction = InspectionActionFormValues & {
  id: string;
  companyId: string;
  inspecao_id: string;
  item_id?: string;
  created_at: string;
  updated_at: string;
};

export type Inspection = InspectionFormValues & {
  id: string;
  companyId: string;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  itens?: InspectionItem[];
  acoes?: InspectionAction[];
};

// --- Nonconformity Schema ---
export const nonconformityStatusValues = ['aberta', 'em_analise', 'em_correcao', 'resolvida', 'atrasada', 'cancelada'] as const;
export const nonconformitySeverityValues = ['baixa', 'media', 'alta', 'critica'] as const;
export const nonconformityProbabilityValues = ['baixa', 'media', 'alta'] as const;
export const nonconformityRiskValues = ['baixo', 'medio', 'alto', 'critico'] as const;
export const nonconformityOriginValues = ['inspecao', 'auditoria', 'incidente', 'observacao_manual', 'denuncia_interna', 'analise_de_risco', 'treinamento', 'entrega_de_epi'] as const;
export const nonconformityValidationStatusValues = ['pendente', 'validada', 'reprovada'] as const;

export const nonconformityFormSchema = z.object({
  titulo: z.string().min(1, 'Titulo da nao conformidade e obrigatorio.'),
  descricao: z.string().min(1, 'Descricao detalhada e obrigatoria.'),
  data_identificacao: z.string().min(1, 'Data de identificacao e obrigatoria.'),
  hora_identificacao: z.string().optional(),
  local: z.string().min(1, 'Local e obrigatorio.'),
  setor: z.string().min(1, 'Setor e obrigatorio.'),
  colaborador_id: z.string().optional(),
  origem: z.enum(nonconformityOriginValues),
  origem_id: z.string().optional(),
  inspecao_id: z.string().optional(),
  item_inspecao_id: z.string().optional(),
  gravidade: z.enum(nonconformitySeverityValues),
  probabilidade: z.enum(nonconformityProbabilityValues),
  nivel_risco: z.enum(nonconformityRiskValues),
  risco_associado: z.string().optional(),
  evidencia_url: z.string().optional(),
  foto_url: z.string().optional(),
  responsavel_correcao: z.string().optional(),
  prazo_correcao: z.string().optional(),
  acao_corretiva: z.string().optional(),
  acao_preventiva: z.string().optional(),
  causa_provavel: z.string().optional(),
  causa_raiz: z.string().optional(),
  status: z.enum(nonconformityStatusValues),
  data_conclusao: z.string().optional(),
  validado_por: z.string().optional(),
  observacoes: z.string().optional(),
  correcao_realizada: z.string().optional(),
  evidencia_correcao_url: z.string().optional(),
  data_validacao: z.string().optional(),
  validacao_status: z.enum(nonconformityValidationStatusValues).optional(),
  motivo_reabertura: z.string().optional(),
});

export const nonconformityConclusionSchema = z.object({
  correcao_realizada: z.string().min(1, 'Descreva a correcao realizada.'),
  data_conclusao: z.string().min(1, 'Data de conclusao e obrigatoria.'),
  evidencia_correcao_url: z.string().optional(),
  validado_por: z.string().optional(),
  observacoes: z.string().optional(),
  data_validacao: z.string().optional(),
  validacao_status: z.enum(nonconformityValidationStatusValues),
});

export const nonconformityReopenSchema = z.object({
  motivo_reabertura: z.string().min(1, 'Informe o motivo da reabertura.'),
  acao_corretiva: z.string().min(1, 'Informe a nova acao corretiva.'),
  prazo_correcao: z.string().min(1, 'Informe o novo prazo.'),
  responsavel_correcao: z.string().min(1, 'Informe o responsavel.'),
});

export type NonconformityStatus = typeof nonconformityStatusValues[number];
export type NonconformitySeverity = typeof nonconformitySeverityValues[number];
export type NonconformityProbability = typeof nonconformityProbabilityValues[number];
export type NonconformityRisk = typeof nonconformityRiskValues[number];
export type NonconformityOrigin = typeof nonconformityOriginValues[number];
export type NonconformityValidationStatus = typeof nonconformityValidationStatusValues[number];
export type NonconformityFormValues = z.infer<typeof nonconformityFormSchema>;
export type NonconformityConclusionValues = z.infer<typeof nonconformityConclusionSchema>;
export type NonconformityReopenValues = z.infer<typeof nonconformityReopenSchema>;

export type NonconformityHistoryEntry = {
  at: string;
  action: string;
  description?: string;
  user?: string;
};

export type Nonconformity = NonconformityFormValues & {
  id: string;
  companyId: string;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  historico?: NonconformityHistoryEntry[];
  colaborador?: Collaborator | null;
};

// --- Incident Schema ---
export const incidentTypeValues = ['incidente_sem_lesao', 'quase_acidente', 'acidente_com_lesao', 'acidente_com_afastamento', 'dano_material', 'condicao_insegura', 'comportamento_inseguro', 'ocorrencia_ambiental', 'emergencia'] as const;
export const incidentStatusValues = ['aberto', 'em_investigacao', 'aguardando_acao', 'concluido', 'cancelado'] as const;
export const incidentSeverityValues = ['baixa', 'media', 'alta', 'critica'] as const;
export const incidentProbabilityValues = ['baixa', 'media', 'alta'] as const;
export const incidentRiskValues = ['baixo', 'medio', 'alto', 'critico'] as const;
export const incidentActionTypeValues = ['medida_imediata', 'acao_corretiva', 'acao_preventiva', 'orientacao', 'treinamento', 'substituicao_de_epi', 'manutencao', 'sinalizacao', 'bloqueio_de_area', 'revisao_de_procedimento'] as const;
export const incidentActionStatusValues = ['aberta', 'em_andamento', 'concluida', 'atrasada', 'cancelada'] as const;

export const incidentWitnessFormSchema = z.object({
  nome: z.string().optional(),
  contato: z.string().optional(),
  funcao: z.string().optional(),
  relato: z.string().optional(),
});

export const incidentActionFormSchema = z.object({
  tipo_acao: z.enum(incidentActionTypeValues),
  descricao: z.string().optional(),
  responsavel: z.string().optional(),
  prazo: z.string().optional(),
  status: z.enum(incidentActionStatusValues),
  data_conclusao: z.string().optional(),
  evidencia_url: z.string().optional(),
  observacoes: z.string().optional(),
});

export const incidentFormSchema = z.object({
  titulo: z.string().min(1, 'Titulo do incidente e obrigatorio.'),
  tipo_ocorrencia: z.enum(incidentTypeValues),
  data_ocorrencia: z.string().min(1, 'Data da ocorrencia e obrigatoria.'),
  hora_ocorrencia: z.string().optional(),
  local: z.string().min(1, 'Local e obrigatorio.'),
  setor: z.string().min(1, 'Setor e obrigatorio.'),
  colaborador_id: z.string().optional(),
  descricao: z.string().min(1, 'Descricao detalhada e obrigatoria.'),
  atividade_realizada: z.string().optional(),
  houve_lesao: z.boolean().default(false),
  tipo_lesao: z.string().optional(),
  parte_corpo_atingida: z.string().optional(),
  houve_afastamento: z.boolean().default(false),
  dias_afastamento: z.coerce.number().min(0).optional(),
  houve_dano_material: z.boolean().default(false),
  descricao_dano_material: z.string().optional(),
  gravidade: z.enum(incidentSeverityValues),
  probabilidade: z.enum(incidentProbabilityValues),
  nivel_risco: z.enum(incidentRiskValues),
  causa_imediata: z.string().optional(),
  causa_raiz: z.string().optional(),
  medidas_imediatas: z.string().optional(),
  acao_corretiva: z.string().optional(),
  acao_preventiva: z.string().optional(),
  responsavel_investigacao: z.string().optional(),
  prazo_investigacao: z.string().optional(),
  status: z.enum(incidentStatusValues),
  data_conclusao: z.string().optional(),
  evidencia_url: z.string().optional(),
  foto_url: z.string().optional(),
  observacoes: z.string().optional(),
  resumo_investigacao: z.string().optional(),
  causa_raiz_confirmada: z.string().optional(),
  correcao_realizada: z.string().optional(),
  prevencao_recomendada: z.string().optional(),
  responsavel_conclusao: z.string().optional(),
  evidencia_final_url: z.string().optional(),
  epi_obrigatorio: z.boolean().default(false),
  epi_entregue: z.boolean().default(false),
  epi_utilizado: z.boolean().default(false),
  epi_adequado: z.boolean().default(false),
  observacao_epi: z.string().optional(),
  treinamento_obrigatorio: z.boolean().default(false),
  treinamento_realizado: z.boolean().default(false),
  treinamento_valido: z.boolean().default(false),
  treinamento_relacionado_id: z.string().optional(),
  observacao_treinamento: z.string().optional(),
  testemunhas: z.array(incidentWitnessFormSchema).optional(),
  acoes: z.array(incidentActionFormSchema).optional(),
});

export const incidentConclusionSchema = z.object({
  resumo_investigacao: z.string().min(1, 'Resumo da investigacao e obrigatorio.'),
  causa_raiz_confirmada: z.string().min(1, 'Causa raiz confirmada e obrigatoria.'),
  correcao_realizada: z.string().min(1, 'Correcao realizada e obrigatoria.'),
  prevencao_recomendada: z.string().min(1, 'Prevencao recomendada e obrigatoria.'),
  data_conclusao: z.string().min(1, 'Data da conclusao e obrigatoria.'),
  responsavel_conclusao: z.string().min(1, 'Responsavel pela conclusao e obrigatorio.'),
  evidencia_final_url: z.string().optional(),
  observacoes: z.string().optional(),
});

export type IncidentType = typeof incidentTypeValues[number];
export type IncidentStatus = typeof incidentStatusValues[number];
export type IncidentSeverity = typeof incidentSeverityValues[number];
export type IncidentProbability = typeof incidentProbabilityValues[number];
export type IncidentRisk = typeof incidentRiskValues[number];
export type IncidentActionType = typeof incidentActionTypeValues[number];
export type IncidentActionStatus = typeof incidentActionStatusValues[number];
export type IncidentWitnessFormValues = z.infer<typeof incidentWitnessFormSchema>;
export type IncidentActionFormValues = z.infer<typeof incidentActionFormSchema>;
export type IncidentFormValues = z.infer<typeof incidentFormSchema>;
export type IncidentConclusionValues = z.infer<typeof incidentConclusionSchema>;

export type IncidentHistoryEntry = {
  at: string;
  action: string;
  description?: string;
  user?: string;
};

export type IncidentWitness = IncidentWitnessFormValues & {
  id: string;
  incidente_id: string;
  created_at: string;
  updated_at: string;
};

export type IncidentAction = IncidentActionFormValues & {
  id: string;
  incidente_id: string;
  created_at: string;
  updated_at: string;
};

export type Incident = Omit<IncidentFormValues, 'testemunhas' | 'acoes'> & {
  id: string;
  companyId: string;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  historico?: IncidentHistoryEntry[];
  colaborador?: Collaborator | null;
  testemunhas?: IncidentWitness[];
  acoes?: IncidentAction[];
};

// --- Costs & Prevention Schema ---
export const costPreventionCategoryValues = ['prevencao', 'correcao', 'incidente', 'treinamento', 'EPI', 'exame_ocupacional', 'manutencao_preventiva', 'manutencao_corretiva', 'sinalizacao', 'adequacao_de_seguranca', 'afastamento', 'multa_autuacao', 'retrabalho', 'consultoria', 'auditoria', 'outros'] as const;
export const costPreventionTypeValues = ['investimento_preventivo', 'custo_corretivo', 'custo_operacional', 'custo_emergencial', 'custo_recorrente', 'custo_pontual', 'custo_estimado', 'custo_real'] as const;
export const costPreventionOriginValues = ['manual', 'entrega_de_epi', 'treinamento', 'inspecao', 'nao_conformidade', 'incidente', 'manutencao', 'exame', 'auditoria'] as const;

export const costPreventionFormSchema = z.object({
  descricao: z.string().min(1, 'Descricao do custo e obrigatoria.'),
  categoria: z.enum(costPreventionCategoryValues),
  tipo_custo: z.enum(costPreventionTypeValues),
  valor: z.coerce.number().min(0, 'Valor deve ser maior ou igual a zero.'),
  data_custo: z.string().min(1, 'Data do custo e obrigatoria.'),
  fornecedor: z.string().optional(),
  setor: z.string().optional(),
  colaborador_id: z.string().optional(),
  epi_id: z.string().optional(),
  treinamento_id: z.string().optional(),
  inspecao_id: z.string().optional(),
  nao_conformidade_id: z.string().optional(),
  incidente_id: z.string().optional(),
  origem: z.enum(costPreventionOriginValues),
  comprovante_url: z.string().optional(),
  responsavel_registro: z.string().optional(),
  observacoes: z.string().optional(),
});

export type CostPreventionCategory = typeof costPreventionCategoryValues[number];
export type CostPreventionType = typeof costPreventionTypeValues[number];
export type CostPreventionOrigin = typeof costPreventionOriginValues[number];
export type CostPreventionFormValues = z.infer<typeof costPreventionFormSchema>;

export type CostPrevention = CostPreventionFormValues & {
  id: string;
  companyId: string;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  colaborador?: Collaborator | null;
  epi?: Epi | null;
  treinamento?: Training | null;
  inspecao?: Inspection | null;
  nao_conformidade?: Nonconformity | null;
  incidente?: Incident | null;
};

// --- JobRole Schema ---
export const jobRoleFormSchema = z.object({
  name: z.string().min(2, "O nome do cargo é obrigatório."),
  responsibilities: z.string().min(10, "A descrição das responsabilidades é obrigatória."),
  requiredCertificates: z.array(z.object({ value: z.string() })).optional(),
});
export type JobRoleFormValues = z.infer<typeof jobRoleFormSchema>;
export type JobRole = {
  id: string;
  companyId: string;
  name: string;
  responsibilities: string;
  requiredCertificates: string[];
  createdAt: string;
  deletedAt?: string | null;
}

// --- Subcontractor Schema ---
export const subcontractorFormSchema = z.object({
  name: z.string().min(2, "O nome da empresa é obrigatório."),
  cnpj: z.string().min(14, "O CNPJ deve ser válido."),
  contractNumber: z.string().optional(),
});
export type SubcontractorFormValues = z.infer<typeof subcontractorFormSchema>;
export type Subcontractor = {
  id: string;
  companyId: string;
  name: string;
  cnpj: string;
  contractNumber?: string;
  createdAt: string;
  deletedAt?: string | null;
}



