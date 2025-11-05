import { z } from 'zod';

export const formSchema = z.object({
  documentType: z.enum(['APR', 'APT'], { required_error: 'Please select a document type.' }),
  companyName: z.string().min(1, 'Company name is required.'),
  companyLogo: z.string().optional(), // Will store as data URL
  workLocation: z.string().min(1, 'Work location is required.'),
  teamMembers: z.string().optional(),
  activityDescription: z.string().min(10, 'Activity description must be at least 10 characters.'),
});

export type SafetyFormValues = z.infer<typeof formSchema>;
