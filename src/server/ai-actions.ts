
'use server';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import { ptBr } from '@/lib/data/strings';
import type { CollaboratorAiRecommendations } from '@/lib/types';
import { CollaboratorRepository } from '@/repositories/collaborator.repository';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { requireAuth } from '@/server/auth-guard';

if (!process.env.GOOGLE_GENAI_API_KEY && process.env.GEMINI_API_KEY) {
  process.env.GOOGLE_GENAI_API_KEY = process.env.GEMINI_API_KEY;
}

// Create Genkit instance with Google AI plugin
const ai = genkit({
    plugins: [googleAI()],
});

// Schema definitions
const activitySchema = z.object({
    activityDescription: z.string().min(10, ptBr.validations.activityDescription),
});

const ProceduralStepSchema = z.object({
    item: z.number().describe('The sequential item number for the operational procedure step.'),
    activity: z.string().describe('The specific activity or step in the operational procedure.'),
    potentialRisks: z.string().describe('The potential risks associated with this specific activity. What could go wrong.'),
    preventiveMeasures: z.string().describe('The preventive measures and safety recommendations for this step, based on Brazilian NRs. This should include necessary EPIs.'),
});

const SafetyAnalysisOutputSchema = z.object({
  proceduralSteps: z.array(ProceduralStepSchema).describe('An array of detailed operational procedure steps for the described work activity. Generate a comprehensive list of steps, from preparation to completion.'),
});
export type SafetyAnalysisOutput = z.infer<typeof SafetyAnalysisOutputSchema>;

const ProtectiveEquipmentOutputSchema = z.object({
  epiItems: z.array(z.string()).describe('A list of recommended Individual Protection Equipment (EPI) items.'),
  epiNote: z.string().describe('An observation note regarding EPI regulations and requirements, mentioning NR06.'),
  epcItems: z.array(z.string()).describe('A list of recommended Collective Protection Equipment (EPC) items.'),
  epcNote: z.string().describe('An observation note regarding EPC integrity and project conformity.'),
});
export type ProtectiveEquipmentOutput = z.infer<typeof ProtectiveEquipmentOutputSchema>;

const CollaboratorRecommendationsSchema = z.object({
  epi_obrigatorios: z.array(z.string()).describe('EPIs obrigatorios para a funcao e atividades do colaborador.'),
  treinamentos_obrigatorios: z.array(z.string()).describe('Treinamentos obrigatorios ou recomendados para a funcao.'),
  riscos_associados: z.array(z.string()).describe('Riscos associados a funcao, setor, local de trabalho e atividades.'),
  medidas_preventivas: z.array(z.string()).describe('Medidas preventivas recomendadas.'),
  observacoes: z.string().describe('Resumo tecnico objetivo para o profissional de seguranca do trabalho.'),
});

type CollaboratorRecommendationsOutput = z.infer<typeof CollaboratorRecommendationsSchema>;

function buildSavedRecommendations(output: CollaboratorRecommendationsOutput): CollaboratorAiRecommendations {
  return {
    generated_at: new Date().toISOString(),
    epi_obrigatorios: output.epi_obrigatorios,
    epi_entregues: [],
    epi_pendentes: output.epi_obrigatorios,
    treinamentos_obrigatorios: output.treinamentos_obrigatorios,
    treinamentos_realizados: [],
    treinamentos_vencidos: output.treinamentos_obrigatorios,
    riscos_associados: output.riscos_associados,
    medidas_preventivas: output.medidas_preventivas,
    nao_conformidades: [],
    incidentes: [],
    relatorios: [],
    observacoes: output.observacoes,
  };
}

export async function getSafetyAnalysis(data: { activityDescription: string }): Promise<{ data: SafetyAnalysisOutput | null; error: string | null }> {
  try {
    await requireAuth();
  } catch (e: any) {
    return { data: null, error: e.message || ptBr.validations.invalidInput };
  }

  const parsed = activitySchema.safeParse(data);
  
  if (!parsed.success) {
    const errorMessage = parsed.error.issues.map((e) => e.message).join(', ');
    return { data: null, error: ptBr.validations.invalidInput.replace('{{details}}', errorMessage) };
  }

  try {
    const geminiPro = process.env.GENAI_MODEL || 'googleai/gemini-pro';
    
    const prompt = `You are an AI assistant specialized in workplace safety, with expertise in Brazilian Normas Regulamentadoras (NRs).

    Based on the following work activity description, generate a detailed operational procedure. For each step of the procedure, identify the activity, its potential risks, and the corresponding preventive measures and safety recommendations.

    The output must be a valid JSON object that conforms to the following Zod schema. Do not include any text or markdown formatting outside of the JSON object itself.
    Schema: ${JSON.stringify(SafetyAnalysisOutputSchema.shape)}

    Example of a step:
    - item: 1
    - activity: "1. TREINAMENTO DE 'ST' DA ATIVIDADE;"
    - potentialRisks: "1.1. Passar pelo Treinamento e/ou retirada da Obra."
    - preventiveMeasures: "1.1.1. Antes de iniciar as atividades contidas nesta APR, deverá ser realizado um treinamento aos envolvidos nas tarefas, e instruí-los sobre os EPI's necessários: Capacete de Segurança, Botinas de couro, Luvas de multitato, Óculos de segurança, Protetor solar; Protetor Auditivo (Plug ou Concha);\\n1.1.2. As recomendações contidas neste documento deverão ser usadas neste treinamento;\\n1.1.3. O treinamento deverá ser ministrado pelo encarregado responsável e emitido lista de assinatura no verso de APR;\\n1.1.4. Antes de iniciar as atividades fornecer conhecimento aos envolvidos dos riscos inerentes a função."

    Activity Description: ${parsed.data.activityDescription}

    Generate a comprehensive list of procedural steps based on the user's activity description.
    `;

    const { output } = await ai.generate({
      model: geminiPro,
      prompt: prompt,
      output: {
        format: 'json',
        schema: SafetyAnalysisOutputSchema,
      },
    });

    if (!output) {
      throw new Error("AI response is empty or invalid.");
    }

    return { data: output, error: null };
  } catch (e: any) {
    console.error("Error in getSafetyAnalysis:", e);
    await ErrorLogRepository.log(e, 'getSafetyAnalysis');

    let errorMessage = ptBr.validations.safetyAnalysisFailed;
    if (e.message?.toLowerCase().includes('api key')) {
        errorMessage = 'A chave de API do Gemini não foi configurada corretamente no servidor. Verifique as variáveis de ambiente.';
    }

    return { data: null, error: errorMessage };
  }
}

export async function generateCollaboratorRecommendations(data: {
  collaboratorId: string;
  companyId: string;
}): Promise<{ data: CollaboratorAiRecommendations | null; error: string | null; cached?: boolean }> {
  try {
    await requireAuth({ matchCompanyId: data.companyId, requireCompany: true });
  } catch (e: any) {
    return { data: null, error: e.message || ptBr.validations.invalidInput };
  }

  if (!data.collaboratorId || !data.companyId) {
    return { data: null, error: 'Colaborador ou empresa nao informado.' };
  }

  try {
    const collaborator = await CollaboratorRepository.getById(data.collaboratorId, data.companyId);
    if (!collaborator) {
      return { data: null, error: 'Colaborador nao encontrado.' };
    }

    if (collaborator.ai_recommendations) {
      return { data: collaborator.ai_recommendations, error: null, cached: true };
    }

    const geminiPro = process.env.GENAI_MODEL || 'googleai/gemini-pro';
    const prompt = `Voce e um especialista senior em Seguranca do Trabalho no Brasil, com dominio das Normas Regulamentadoras.

Gere recomendacoes para a ficha de um colaborador. Use linguagem objetiva, tecnica e pronta para alimentar modulos futuros de EPI, treinamentos, riscos e medidas preventivas.

Dados do colaborador:
- Nome: ${collaborator.nome_completo}
- Empresa: ${collaborator.empresa || 'Nao informado'}
- Setor: ${collaborator.setor}
- Funcao: ${collaborator.funcao}
- Local de trabalho: ${collaborator.local_trabalho || 'Nao informado'}
- Turno: ${collaborator.turno_trabalho || 'Nao informado'}
- Atividades realizadas: ${collaborator.atividades_realizadas || 'Nao informado'}
- Riscos ja informados: ${collaborator.riscos_associados || 'Nao informado'}
- Observacoes de seguranca: ${collaborator.observacoes_seguranca || 'Nao informado'}

Retorne somente JSON valido no schema solicitado. Nao use markdown.`;

    const { output } = await ai.generate({
      model: geminiPro,
      prompt,
      output: {
        format: 'json',
        schema: CollaboratorRecommendationsSchema,
      },
    });

    if (!output) {
      throw new Error('AI response is empty or invalid.');
    }

    const recommendations = buildSavedRecommendations(output);
    await CollaboratorRepository.updateRecommendations(data.collaboratorId, data.companyId, recommendations);

    return { data: recommendations, error: null, cached: false };
  } catch (e: any) {
    console.error('Error in generateCollaboratorRecommendations:', e);
    await ErrorLogRepository.log(e, 'generateCollaboratorRecommendations');

    let errorMessage = 'Falha ao gerar recomendacoes com IA. Tente novamente em instantes.';
    if (e.message?.toLowerCase().includes('api key')) {
      errorMessage = 'A chave de API do Gemini nao foi configurada corretamente no servidor.';
    }

    return { data: null, error: errorMessage };
  }
}

export async function getProtectiveEquipment(data: { activityDescription: string }): Promise<{ data: ProtectiveEquipmentOutput | null; error: string | null }> {
  try {
    await requireAuth();
  } catch (e: any) {
    return { data: null, error: e.message || ptBr.validations.invalidInput };
  }

  const parsed = activitySchema.safeParse(data);

  if (!parsed.success) {
    const errorMessage = parsed.error.issues.map((e) => e.message).join(', ');
    return { data: null, error: ptBr.validations.invalidInput.replace('{{details}}', errorMessage) };
  }

  try {
    const geminiPro = process.env.GENAI_MODEL || 'googleai/gemini-pro';

    const prompt = `You are an expert in Brazilian workplace safety regulations (Normas Regulamentadoras - NRs). Based on the following work activity description, provide a list of necessary Individual Protection Equipment (EPI) and Collective Protection Equipment (EPC).

    Activity Description: ${parsed.data.activityDescription}

    Provide the output as a structured JSON object that conforms to the following Zod schema. Do not include any text or markdown formatting outside of the JSON object itself.
    Schema: ${JSON.stringify(ProtectiveEquipmentOutputSchema.shape)}

    For the EPIs, list the essential equipment. Then, for the 'epiNote', provide a standard observation referencing NR06 and the need for equipment to be certified. For example: "Todos os Equipamentos de Proteção Individual (EPI), devem atender os requisitos da NR06, estar válido e conformidade com os órgãos fiscalizadores para utilização na atividade."

    For the EPCs, list the necessary collective equipment. Then, for the 'epcNote', provide a standard observation about verifying the integrity and conformity of the equipment. For example: "Todos os Equipamentos de Proteção Coletiva (EPC), devem ser verificados quanto a integridade e conformidade com o projeto específico antes de iniciar a atividade."
    `;

    const { output } = await ai.generate({
        model: geminiPro,
        prompt: prompt,
        output: {
          format: 'json',
          schema: ProtectiveEquipmentOutputSchema,
        },
    });

    if (!output) {
      throw new Error("AI response is empty or invalid.");
    }
    
    return { data: output, error: null };
  } catch (e: any) {
    console.error("Error in getProtectiveEquipment:", e);
    await ErrorLogRepository.log(e, 'getProtectiveEquipment');
    
    let errorMessage = ptBr.validations.equipmentRecommendationFailed;
    if (e.message?.toLowerCase().includes('api key')) {
        errorMessage = 'A chave de API do Gemini não foi configurada corretamente no servidor. Verifique as variáveis de ambiente.';
    }
    
    return { data: null, error: errorMessage };
  }
}
