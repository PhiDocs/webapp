import { z } from 'zod';

export const responsiblePersonSchema = z.object({
  name: z.string().min(1, 'Nome do responsável é obrigatório.'),
  role: z.string().min(1, 'Função do responsável é obrigatória.'),
  signature: z.string().optional(), // Will store as data URL
});

export const teamMemberSchema = z.object({
  date: z.string().min(1, 'Data é obrigatória.'),
  name: z.string().min(1, 'Nome do membro da equipe é obrigatório.'),
  role: z.string().min(1, 'Função/Empresa é obrigatória.'),
});

export const formSchema = z.object({
  documentType: z.enum(['APR', 'APT'], { required_error: 'Please select a document type.' }),
  
  // Work Data
  workName: z.string().min(1, 'Nome da obra é obrigatório.'),
  workAddress: z.string().min(1, 'Endereço da obra é obrigatório.'),
  startDate: z.string().min(1, 'Data de início é obrigatória.'),
  endDate: z.string().min(1, 'Data de término é obrigatória.'),
  workLocationDetails: z.string().min(1, 'Local da obra/pavimento é obrigatório.'),
  
  activityDescription: z.string().min(10, 'A descrição da atividade deve ter pelo menos 10 caracteres.'),
  
  // Responsible Person
  responsiblePersons: z.array(responsiblePersonSchema).min(1, 'Adicione pelo menos um responsável.'),

  // Company and Team
  companyName: z.string().min(1, 'Nome da empresa é obrigatório.'),
  companyLogo: z.string().optional(), // Will store as data URL
  teamMembers: z.array(teamMemberSchema).optional(),
});

export type SafetyFormValues = z.infer<typeof formSchema>;
export type ResponsiblePerson = z.infer<typeof responsiblePersonSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
