
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

/**
 * Orcamento de raciocinio do Gemini 2.5.
 *
 * O modelo vem com "thinking" liberado, e era o que fazia a analise da APR
 * levar mais de um minuto. Um minuto de espera em 4G de obra faz a pessoa
 * achar que travou e recarregar, perdendo o preenchimento.
 *
 * Medido no navegador, mesma atividade ("solda no costado do tanque 02, a 8
 * metros de altura, com macarico e acesso por andaime"):
 *
 *   padrao (sem limite) ... 64,9s ... 10 etapas
 *   teto de 1024 ......... 64,2s ... 10 etapas   <- nao limita nada
 *   zero ................. 28,2s ... 17 etapas
 *
 * O teto intermediario nao serve: so o zero explicito corta. E com zero o
 * resultado veio mais completo, nao menos — 17 etapas, todas com as seis
 * listas preenchidas. A conferencia tecnica do conteudo continua sendo do
 * responsavel, como sempre foi.
 *
 * Se um dia o conteudo parecer raso, da para devolver o raciocinio pelo .env
 * sem mexer no codigo (GENAI_THINKING_REDACAO=-1 deixa o modelo decidir).
 */
const ORCAMENTO_RACIOCINIO = {
  /** Escolher itens de um catalogo fechado nao precisa de deliberacao. */
  selecao: Number(process.env.GENAI_THINKING_SELECAO ?? 0),
  /** Redigir a analise de risco. Ver a medicao acima. */
  redacao: Number(process.env.GENAI_THINKING_REDACAO ?? 0),
};

const configDeRaciocinio = (tipo: keyof typeof ORCAMENTO_RACIOCINIO) => ({
  thinkingConfig: { thinkingBudget: ORCAMENTO_RACIOCINIO[tipo] },
});

// Schema definitions
const activitySchema = z.object({
    activityDescription: z.string().min(10, ptBr.validations.activityDescription),
});

// O que o modelo devolve: tudo em listas, para a tela poder editar item a item.
const ProceduralStepAISchema = z.object({
    item: z.number().describe('The sequential item number for the operational procedure step.'),
    activity: z.string().describe('The specific activity or step in the operational procedure.'),
    hazards: z.array(z.string()).describe('Perigos (hazards): the sources of harm present in this step. Short noun phrases, in Brazilian Portuguese. Example: "Energia eletrica", "Trabalho em altura".'),
    risks: z.array(z.string()).describe('Riscos: what can go wrong in this step. Short phrases, in Brazilian Portuguese. Example: "Choque eletrico", "Arco eletrico".'),
    consequences: z.array(z.string()).describe('Consequencias: the outcome if the risk materializes. Short phrases, in Brazilian Portuguese. Example: "Queimadura de segundo grau", "Parada cardiorrespiratoria".'),
    measures: z.array(z.string()).describe('Medidas preventivas e de controle for this step, grounded in the Brazilian NRs. Short imperative phrases, in Brazilian Portuguese. Example: "Bloqueio e etiquetagem (LOTO)", "Teste de ausencia de tensao".'),
    epis: z.array(z.string()).describe('EPIs required specifically for this step, in Brazilian Portuguese. Example: "Luva isolante classe 0", "Protetor facial para arco eletrico".'),
    epcs: z.array(z.string()).describe('EPCs required for this step when applicable. Empty array when none apply.'),
});

const SafetyAnalysisAIOutputSchema = z.object({
  proceduralSteps: z.array(ProceduralStepAISchema).describe('An array of detailed operational procedure steps for the described work activity. Generate a comprehensive list of steps, from preparation to completion.'),
});

// O que o resto do sistema consome: as listas mais os dois campos de texto
// antigos, que continuam alimentando o PDF sem nenhuma mudanca nele.
const ProceduralStepSchema = ProceduralStepAISchema.extend({
    potentialRisks: z.string(),
    preventiveMeasures: z.string(),
});

const SafetyAnalysisOutputSchema = z.object({
  proceduralSteps: z.array(ProceduralStepSchema).describe('Procedural steps enriched with the legacy text fields.'),
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

    For every step, fill the lists separately and do not repeat the same content across them:
    - hazards: the source of harm (what is dangerous)
    - risks: what can go wrong
    - consequences: the outcome for the worker if it happens
    - measures: how to prevent it, grounded in the Brazilian NRs
    - epis: individual protection required for that specific step
    - epcs: collective protection for that step, or an empty array

    Write every item as a short phrase in Brazilian Portuguese, one idea per item.

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
      config: configDeRaciocinio('redacao'),
      prompt: prompt,
      output: {
        format: 'json',
        schema: SafetyAnalysisAIOutputSchema,
      },
    });

    if (!output) {
      throw new Error("AI response is empty or invalid.");
    }

    // Os dois campos de texto antigos sao derivados das listas, para que o PDF
    // e os documentos ja emitidos continuem funcionando sem alteracao.
    const enriquecido: SafetyAnalysisOutput = {
      proceduralSteps: output.proceduralSteps.map((step) => ({
        ...step,
        potentialRisks: [
          ...(step.hazards || []).map((h) => `Perigo: ${h}`),
          ...(step.risks || []),
          ...(step.consequences || []).map((c) => `Consequencia: ${c}`),
        ].join('\n'),
        preventiveMeasures: [
          ...(step.measures || []),
          ...((step.epis || []).length ? [`EPI: ${(step.epis || []).join(', ')}`] : []),
          ...((step.epcs || []).length ? [`EPC: ${(step.epcs || []).join(', ')}`] : []),
        ].join('\n'),
      })),
    };

    return { data: enriquecido, error: null };
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
      config: configDeRaciocinio('redacao'),
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
        config: configDeRaciocinio('redacao'),
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

// ---------------------------------------------------------------------------
// Sugestao de controles para a Permissao de Trabalho.
//
// Reaproveita a mesma infraestrutura das outras chamadas (genkit + googleAI).
// A diferenca importante: o modelo NAO inventa requisito. Ele recebe a lista
// de ids que existem no sistema e so pode escolher dentro dela — e, mesmo
// assim, a resposta e filtrada contra essa lista antes de sair daqui.
// ---------------------------------------------------------------------------

const PtControlSuggestionSchema = z.object({
  itemIds: z.array(z.string()).describe('IDs of relevant checklist controls, chosen ONLY from the provided list.'),
  rationale: z.string().describe('One short sentence in Brazilian Portuguese explaining the selection.'),
});

export type PtControlSuggestion = {
  itemIds: string[];
  rationale: string;
};

export async function getPtControlSuggestions(data: {
  descricaoTarefa: string;
  atividadesMarcadas: string[];
  idsDisponiveis: Array<{ id: string; rotulo: string }>;
}): Promise<{ data: PtControlSuggestion | null; error: string | null }> {
  if (!data.descricaoTarefa || data.descricaoTarefa.trim().length < 10) {
    return { data: null, error: 'Descreva a tarefa com mais detalhe para receber sugestoes.' };
  }
  if (data.idsDisponiveis.length === 0) {
    return { data: null, error: 'Nenhum controle disponivel para sugerir.' };
  }

  const permitidos = new Set(data.idsDisponiveis.map((item) => item.id));

  try {
    const geminiPro = process.env.GENAI_MODEL || 'googleai/gemini-pro';

    const catalogo = data.idsDisponiveis
      .map((item) => `- ${item.id}: ${item.rotulo}`)
      .join('\n');

    const prompt = `You are assisting a Brazilian workplace safety technician filling a Work Permit (Permissao de Trabalho).

    Activity types already marked: ${data.atividadesMarcadas.join(', ') || 'none'}
    Task description: ${data.descricaoTarefa}

    Below is the COMPLETE catalogue of controls available in this system. You may ONLY choose ids from this list. Never invent an id, never invent a control that is not listed:

${catalogo}

    Return the ids of the controls that are relevant for this specific task. Be selective: only what genuinely applies. If nothing applies, return an empty array.
    The rationale must be a single short sentence in Brazilian Portuguese.`;

    const { output } = await ai.generate({
      model: geminiPro,
      config: configDeRaciocinio('selecao'),
      prompt,
      output: { format: 'json', schema: PtControlSuggestionSchema },
    });

    if (!output) throw new Error('AI response is empty or invalid.');

    // Ultima barreira: qualquer id fora do catalogo e descartado em silencio.
    const filtrados = (output.itemIds || []).filter((id) => permitidos.has(id));

    return {
      data: { itemIds: filtrados, rationale: output.rationale || '' },
      error: null,
    };
  } catch (e: any) {
    console.error('Error in getPtControlSuggestions:', e);
    await ErrorLogRepository.log(e, 'getPtControlSuggestions');
    return { data: null, error: 'Nao foi possivel gerar sugestoes agora.' };
  }
}
