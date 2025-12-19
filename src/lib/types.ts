'use client';

import { z } from 'zod';
import { DOCUMENT_TYPES, PT_FIT_STATUS, SIGNATURE_TYPES } from './constants';
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
};


const signatureTypeSchema = z.enum([
    SIGNATURE_TYPES.TYPED, 
    SIGNATURE_TYPES.DRAW, 
    SIGNATURE_TYPES.UPLOAD
]);

export const responsiblePersonSchema = z.object({
  name: z.string().min(1, validationMessages.responsibleName),
  role: z.string().min(1, validationMessages.responsibleRole),
  signatureType: signatureTypeSchema.default(SIGNATURE_TYPES.TYPED),
  signatureData: z.string().optional(),
});

export const teamMemberSchema = z.object({
  date: z.string().min(1, validationMessages.teamDate),
  name: z.string().min(1, validationMessages.teamName),
  role: z.string().min(1, validationMessages.teamRole),
});

export const ptChecklistSchema = z.record(z.boolean());

export const ptTeamMemberSchema = z.object({
  name: z.string(),
  rgCpf: z.string(),
  func: z.string(),
  empresa: z.string(),
  apto: z.enum([PT_FIT_STATUS.YES, PT_FIT_STATUS.NO, PT_FIT_STATUS.EMPTY]),
});

const ptSignerSchema = z.object({
    name: z.string().optional(),
    signatureType: signatureTypeSchema.default(SIGNATURE_TYPES.TYPED),
    signatureData: z.string().optional(),
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
  
  companyName: z.string(),
  companyLogo: z.string().optional(),
  
  // Work Data (APR)
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

  // PT Form Data
  pt: ptFormSchema,
}).superRefine((data, ctx) => {
    if (data.documentType === DOCUMENT_TYPES.APR) {
        if (!data.companyName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.companyName, path: ["companyName"] });
        if (!data.workName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.workName, path: ["workName"] });
        if (!data.workAddress) ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.workAddress, path: ["workAddress"] });
        if (!data.startDate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.startDate, path: ["startDate"] });
        if (!data.endDate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.endDate, path: ["endDate"] });
        if (!data.workLocationDetails) ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.workLocation, path: ["workLocationDetails"] });
        if (!data.activityDescription || data.activityDescription.length < 10) ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.activityDescription, path: ["activityDescription"] });

        if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: validationMessages.endDateBeforeStartDate,
            path: ['endDate'],
          });
        }

    } else if (data.documentType === DOCUMENT_TYPES.PT) {
        if (!data.companyName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.companyName, path: ["companyName"] });
        if (!data.pt.ptLocalAtividade) ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.ptLocation, path: ["pt", "ptLocalAtividade"] });
        if (!data.pt.ptData) ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.ptDate, path: ["pt", "ptData"] });
        if (!data.pt.ptHoraInicio) ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.ptStartTime, path: ["pt", "ptHoraInicio"] });
    }
});

export type SafetyFormValues = z.infer<typeof formSchema>;
export type ResponsiblePerson = z.infer<typeof responsiblePersonSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type PtFormValues = z.infer<typeof ptFormSchema>;
export type PtTeamMember = z.infer<typeof ptTeamMemberSchema>;
export type PtSigner = z.infer<typeof ptSignerSchema>;


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
export const companyFormSchema = z.object({
    name: z.string().min(3, "O nome da empresa deve ter pelo menos 3 caracteres."),
});
export type CompanyFormValues = z.infer<typeof companyFormSchema>;

export type Company = {
    id: string;
    name: string;
    createdAt: string;
    ownerUid?: string;
}

// --- Work Schema ---

// Schema for the client-side form
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

// Schema for the server-side action, including companyId
export const workFormSchema = z.object({
  name: z.string().min(3, "O nome da obra deve ter pelo menos 3 caracteres."),
  address: z.string().min(5, "O endereço deve ter pelo menos 5 caracteres."),
  workLocationDetails: z.string().min(3, "O local da obra deve ter pelo menos 3 caracteres."),
  startDate: z.string().min(1, "A data de início é obrigatória."),
  endDate: z.string().min(1, "A data de término é obrigatória."),
  companyId: z.string().min(1, "É obrigatório associar a obra a uma empresa."),
}).superRefine((data, ctx) => {
    if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A data de término não pode ser anterior à data de início.",
            path: ['endDate'],
        });
    }
});


export type WorkFormValues = z.infer<typeof workFormSchema>;
export type WorkClientFormValues = z.infer<typeof workClientFormSchema>;


export type Work = {
    id: string;
    name: string;
    address: string;
    workLocationDetails: string;
    startDate: string;
    endDate: string;
    companyId: string;
    createdAt: string;
}
