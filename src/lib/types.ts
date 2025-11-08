'use client';

import { z } from 'zod';

const signatureTypeSchema = z.enum(['typed', 'draw', 'upload']);

export const responsiblePersonSchema = z.object({
  name: z.string().min(1, 'Nome do responsável é obrigatório.'),
  role: z.string().min(1, 'Função do responsável é obrigatória.'),
  signatureType: signatureTypeSchema.default('typed'),
  signatureData: z.string().optional(),
});

export const teamMemberSchema = z.object({
  date: z.string().min(1, 'Data é obrigatória.'),
  name: z.string().min(1, 'Nome do membro da equipe é obrigatório.'),
  role: z.string().min(1, 'Função/Empresa é obrigatória.'),
});

export const ptChecklistSchema = z.record(z.boolean());

export const ptTeamMemberSchema = z.object({
  name: z.string(),
  rgCpf: z.string(),
  func: z.string(),
  empresa: z.string(),
  apto: z.enum(['sim', 'nao', '']),
});

const ptSignerSchema = z.object({
    name: z.string().optional(),
    signatureType: signatureTypeSchema.default('typed'),
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
  documentType: z.enum(['APR', 'PT'], { required_error: 'Please select a document type.' }),
  
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
  responsiblePersons: z.array(responsiblePersonSchema).min(1, 'Adicione pelo menos um responsável.'),

  // Team (APR)
  teamMembers: z.array(teamMemberSchema).optional(),

  // PT Form Data
  pt: ptFormSchema,
}).superRefine((data, ctx) => {
    if (data.documentType === 'APR') {
        if (!data.companyName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nome da empresa é obrigatório.", path: ["companyName"] });
        if (!data.workName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nome da obra é obrigatório.", path: ["workName"] });
        if (!data.workAddress) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Endereço da obra é obrigatório.", path: ["workAddress"] });
        if (!data.startDate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Data de início é obrigatória.", path: ["startDate"] });
        if (!data.endDate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Data de término é obrigatória.", path: ["endDate"] });
        if (!data.workLocationDetails) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Local da obra/pavimento é obrigatório.", path: ["workLocationDetails"] });
        if (!data.activityDescription || data.activityDescription.length < 10) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A descrição da atividade deve ter pelo menos 10 caracteres.", path: ["activityDescription"] });
    } else if (data.documentType === 'PT') {
        if (!data.companyName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nome da empresa é obrigatório.", path: ["companyName"] });
        if (!data.pt.ptLocalAtividade) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Local da atividade é obrigatório.", path: ["pt", "ptLocalAtividade"] });
        if (!data.pt.ptData) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Data é obrigatória.", path: ["pt", "ptData"] });
        if (!data.pt.ptHoraInicio) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Hora de início é obrigatória.", path: ["pt", "ptHoraInicio"] });
    }
});

export type SafetyFormValues = z.infer<typeof formSchema>;
export type ResponsiblePerson = z.infer<typeof responsiblePersonSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type PtFormValues = z.infer<typeof ptFormSchema>;
export type PtTeamMember = z.infer<typeof ptTeamMemberSchema>;
export type PtSigner = z.infer<typeof ptSignerSchema>;
