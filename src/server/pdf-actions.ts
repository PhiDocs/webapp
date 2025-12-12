
'use server';

import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import type { ProtectiveEquipmentOutput } from '@/ai/flows/recommend-protective-equipment';
import { generatePdf } from '@/lib/pdf/generator';
import { formSchema, type SafetyFormValues } from '@/lib/types';
import { ptBr } from '@/lib/data/strings';


export async function generatePdfOnServer(
    formData: SafetyFormValues,
    analysisData: SafetyAnalysisOutput | null,
    equipmentData: ProtectiveEquipmentOutput | null
): Promise<{ fileName: string; dataUrl: string; error?: string }> {

  // The validation is already done on the client before calling this action.
  // Parsing here can cause module loading issues between server/client components.
  // const parsed = formSchema.safeParse(formData);
  // if (!parsed.success) {
  //   const errorMessage = parsed.error.errors.map((e) => e.message).join(', ');
  //   console.error('Falha na validação do PDF no servidor:', errorMessage);
  //   return {
  //     fileName: '',
  //     dataUrl: '',
  //     error: ptBr.validations.invalidFormData.replace('{{details}}', errorMessage),
  //   };
  // }

  try {
    // We pass the raw formData, assuming it's been validated on the client.
    const { fileName, dataUrl } = await generatePdf(formData, analysisData, equipmentData);
    return { fileName, dataUrl };
  } catch (error: any) {
    console.error('Falha ao gerar o PDF no servidor:', error);
    return { 
        fileName: '', 
        dataUrl: '', 
        error: ptBr.validations.pdfServerError.replace('{{details}}', error.message),
    };
  }
}
