import { z } from 'zod';

export const formSchema = z.object({
  documentType: z.enum(['APR', 'APT'], { required_error: 'Please select a document type.' }),
  
  // Work Data
  workName: z.string().min(1, 'Nome da obra é obrigatório.'),
  workAddress: z.string().min(1, 'Endereço da obra é obrigatório.'),
  startDate: z.string().min(1, 'Data de início é obrigatória.'),
  endDate: z.string().min(1, 'Data de término é obrigatória.'),
  workLocationDetails: z.string().min(1, 'Local da obra/pavimento é obrigatório.'),
  
  activityDescription: z.string().min(10, 'Activity description must be at least 10 characters.'),
  
  // Responsible Person
  responsibleName: z.string().min(1, 'Nome do responsável é obrigatório.'),
  responsibleRole: z.string().min(1, 'Função do responsável é obrigatória.'),

  // Company and Team
  companyName: z.string().min(1, 'Company name is required.'),
  companyLogo: z.string().optional(), // Will store as data URL
  teamMembers: z.string().optional(),
});

export type SafetyFormValues = z.infer<typeof formSchema>;
