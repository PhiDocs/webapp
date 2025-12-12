'use client';

import { z } from 'zod';
import { ptBr } from './data/strings';

const signatureTypeSchema = z.enum(['typed', 'draw', 'upload']);

export const responsiblePersonSchema = z.object({
  name: z.string().min(1, ptBr.validations.responsibleName),
  role: z.string().min(1, ptBr.validations.responsibleRole),
  signatureType: signatureTypeSchema.default('typed'),
  signatureData: z.string().optional(),
});

export const teamMemberSchema = z.object({
  date: z.string().min(1, ptBr.validations.teamDate),
  name: z.string().min(1, ptBr.validations.teamName),
  role: z.string().min(1, ptBr.validations.teamRole),
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
  documentType: z.enum(['APR', 'PT']),
  
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
  responsiblePersons: z.array(responsiblePersonSchema).min(1, ptBr.validations.atLeastOneResponsible),

  // Team (APR)
  teamMembers: z.array(teamMemberSchema).optional(),

  // PT Form Data
  pt: ptFormSchema,
}).superRefine((data, ctx) => {
    if (data.documentType === 'APR') {
        if (!data.companyName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: ptBr.validations.companyName, path: ["companyName"] });
        if (!data.workName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: ptBr.validations.workName, path: ["workName"] });
        if (!data.workAddress) ctx.addIssue({ code: z.ZodIssueCode.custom, message: ptBr.validations.workAddress, path: ["workAddress"] });
        if (!data.startDate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: ptBr.validations.startDate, path: ["startDate"] });
        if (!data.endDate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: ptBr.validations.endDate, path: ["endDate"] });
        if (!data.workLocationDetails) ctx.addIssue({ code: z.ZodIssueCode.custom, message: ptBr.validations.workLocation, path: ["workLocationDetails"] });
        if (!data.activityDescription || data.activityDescription.length < 10) ctx.addIssue({ code: z.ZodIssueCode.custom, message: ptBr.validations.activityDescription, path: ["activityDescription"] });
    } else if (data.documentType === 'PT') {
        if (!data.companyName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: ptBr.validations.companyName, path: ["companyName"] });
        if (!data.pt.ptLocalAtividade) ctx.addIssue({ code: z.ZodIssueCode.custom, message: ptBr.validations.ptLocation, path: ["pt", "ptLocalAtividade"] });
        if (!data.pt.ptData) ctx.addIssue({ code: z.ZodIssueCode.custom, message: ptBr.validations.ptDate, path: ["pt", "ptData"] });
        if (!data.pt.ptHoraInicio) ctx.addIssue({ code: z.ZodIssueCode.custom, message: ptBr.validations.ptStartTime, path: ["pt", "ptHoraInicio"] });
    }
});

export type SafetyFormValues = z.infer<typeof formSchema>;
export type ResponsiblePerson = z.infer<typeof responsiblePersonSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type PtFormValues = z.infer<typeof ptFormSchema>;
export type PtTeamMember = z.infer<typeof ptTeamMemberSchema>;
export type PtSigner = z.infer<typeof ptSignerSchema>;
