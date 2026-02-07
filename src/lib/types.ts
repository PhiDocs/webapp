import { z } from 'zod';
import { DOCUMENT_TYPES, PT_FIT_STATUS } from './constants';
import { ptBr } from './data/strings';

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
    if (!data.email) {
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
  role: z.string().min(1, validationMessages.teamRole),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  useAssinafy: z.boolean().default(true),
});

export const analysisStepSchema = z.object({
  item: z.number().optional(),
  activity: z.string().optional(),
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

  // Signatures
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

    data.responsiblePersons.forEach((person, index) => {
      if (!person.employeeId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.employeeIdRequired, path: [`responsiblePersons.${index}.employeeId`] });
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
export type PtTeamMember = z.infer<typeof ptTeamMemberSchema>;
export type PtSigner = z.infer<typeof ptSignerSchema>;
export type PtSignerInput = z.input<typeof ptSignerSchema>;

// --- Signature Documents ---
export type SignatureSigner = {
  name: string;
  email: string;
  assinafySignerId?: string;
  status: 'pending' | 'signed' | 'declined';
};

export type SignatureDocument = {
  id: string;
  companyId: string;
  documentType: DocumentType;
  documentName: string;
  assinafyDocumentId: string;
  assinafyAssignmentId: string;
  status: 'pending' | 'signed' | 'declined' | 'uploaded' | 'expired';
  signers: SignatureSigner[];
  createdAt: string;
  updatedAt?: string;
  lastSyncedAt?: string;
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
  createdAt: string;
  deletedAt?: string | null;
}

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



