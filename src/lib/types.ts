'use client';

import { z } from 'zod';

export const responsiblePersonSchema = z.object({
  name: z.string().min(1, 'Nome do responsável é obrigatório.'),
  role: z.string().min(1, 'Função do responsável é obrigatória.'),
  signature: z.string().optional(), // Now a text field for name
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

export const ptFormSchema = z.object({
  // PT specific fields
  ptLocalAtividade: z.string(),
  ptEquipamentoLinha: z.string(),
  ptEmpresaSetor: z.string(),
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
  
  ptVigias: z.array(ptTeamMemberSchema),
  ptResgatistas: z.array(ptTeamMemberSchema),

  ptGestorArea: z.string().optional(),
  ptResponsavelAtividade: z.string().optional(),
  ptSesmt: z.string().optional(),
});


export const formSchema = z.object({
  documentType: z.enum(['APR', 'PT'], { required_error: 'Please select a document type.' }),
  
  // Work Data (APR)
  workName: z.string().min(1, 'Nome da obra é obrigatório.'),
  workAddress: z.string().min(1, 'Endereço da obra é obrigatório.'),
  startDate: z.string().min(1, 'Data de início é obrigatória.'),
  endDate: z.string().min(1, 'Data de término é obrigatória.'),
  workLocationDetails: z.string().min(1, 'Local da obra/pavimento é obrigatório.'),
  
  activityDescription: z.string().min(10, 'A descrição da atividade deve ter pelo menos 10 caracteres.'),
  
  // Responsible Person (APR)
  responsiblePersons: z.array(responsiblePersonSchema).min(1, 'Adicione pelo menos um responsável.'),

  // Company and Team (APR)
  companyName: z.string(),
  companyLogo: z.string().optional(), // Will store as data URL
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
    } else if (data.documentType === 'PT') {
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
