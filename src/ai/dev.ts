import { config } from 'dotenv';
config();

import '@/ai/flows/generate-safety-analysis.ts';
import '@/ai/flows/recommend-epi.ts';
import '@/ai/flows/recommend-protective-equipment.ts';
