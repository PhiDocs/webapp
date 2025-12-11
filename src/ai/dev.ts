import { config } from 'dotenv';
config();

import '@/ai/flows/generate-safety-analysis.ts';
import '@/ai/flows/recommend-ppe.ts';
import '@/ai/flows/recommend-protective-equipment.ts';
