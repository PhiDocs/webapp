'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo, useRef, type MouseEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { SafetyAnalysisOutput, ProtectiveEquipmentOutput } from '@/server/ai-actions';
import type { SafetyFormValues, Work, Employee, Company, AprPtProject, ResponsibleContact, ResponsibleContactInput, SavedDocument } from '@/lib/types';
import { getSafetyAnalysis, getProtectiveEquipment } from '@/server/ai-actions';
import { sendDocumentForSignature } from '@/server/signature-actions';
import { saveDocument, markDocumentAsSent, getDocument, getDocuments } from '@/server/document-actions';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formSchema } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { FormPanel } from '@/components/form-panel';
import { ptBr } from '@/lib/data/strings';
import { DOCUMENT_TYPES } from '@/lib/constants';
import { Logo } from '@/components/icons/logo';
import { PrintPreview } from '@/components/print-preview';
import { UserNav } from '@/components/auth/user-nav';
import { useSession } from '@/components/auth/session-provider';
import { createWork, getWorks } from '@/server/work-actions';
import { getEmployees } from '@/server/employee-actions';
import { getCompanyById } from '@/server/company-actions';
import { createAprProject, getAprProjects } from '@/server/apr-project-actions';
import { getResponsibleContacts, saveResponsibleContact } from '@/server/responsible-contact-actions';
import { getReportsBootstrap } from '@/server/reports-bootstrap-actions';
import { DocumentTypeChooser } from '@/components/document-type-chooser';
import { SignaturePanel } from '@/components/signature-panel';
import { DocumentLifecycle } from '@/components/document-lifecycle';
import { getSignatureDocuments, refreshSignatureDocument, resendSignatureNotification } from '@/server/signature-actions';
import { getDocumentEvents, markDocumentInReview, completeDocument, logPdfGenerated } from '@/server/document-actions';
import { resolverStatus, DOCUMENT_STATUS } from '@/lib/document-status';
import type { SignatureDocument } from '@/lib/types';
import type { DocumentEvent } from '@/repositories/document-event.repository';
import { DocumentPreviewPanel } from '@/components/document-preview-panel';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  Bell,
  Briefcase,
  Building2,
  CircleHelp,
  Eye,
  FileText,
  Users,
  Flame,
  HardHat,
  LogOut,
  Menu,
  Minus,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createSupabaseBrowserClient } from '@/supabase/browser';
import { signOut } from '@/server/auth-actions';
import { getModuleColor } from '@/lib/module-colors';
import { formatCnpj, isValidCnpj, onlyCnpjDigits } from '@/lib/cnpj';

/**
 * Documentos emitidos antes das listas por etapa so tem os dois campos de
 * texto. Aqui eles viram itens, uma linha por item, para poderem ser editados
 * um a um sem perder nada do que ja estava escrito.
 */
function paraLista(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.map((item) => String(item).trim()).filter(Boolean);
  if (typeof valor === 'string') {
    return valor.split('\n').map((linha) => linha.trim()).filter(Boolean);
  }
  return [];
}

/** Os campos de texto antigos sao sempre derivados das listas, nunca o contrario. */
function juntarRiscos(hazards: string[], risks: string[], consequences: string[]) {
  return [
    ...hazards.map((item) => `Perigo: ${item}`),
    ...risks,
    ...consequences.map((item) => `Consequencia: ${item}`),
  ].join('\n');
}

function juntarMedidas(measures: string[], epis: string[], epcs: string[]) {
  return [
    ...measures,
    ...(epis.length ? [`EPI: ${epis.join(', ')}`] : []),
    ...(epcs.length ? [`EPC: ${epcs.join(', ')}`] : []),
  ].join('\n');
}

function normalizeAnalysisSteps(steps: any[] | undefined): SafetyAnalysisOutput | null {
  if (!steps || steps.length === 0) return null;

  const normalized = steps
    .map((step) => {
      const hazards = paraLista(step?.hazards);
      const consequences = paraLista(step?.consequences);
      const epis = paraLista(step?.epis);
      const epcs = paraLista(step?.epcs);
      // Sem lista propria, o texto antigo vira a lista.
      const risks = step?.risks?.length ? paraLista(step.risks) : paraLista(step?.potentialRisks);
      const measures = step?.measures?.length ? paraLista(step.measures) : paraLista(step?.preventiveMeasures);

      return {
        activity: (step?.activity || '').trim(),
        hazards,
        risks,
        consequences,
        measures,
        epis,
        epcs,
      };
    })
    .filter((step) =>
      step.activity
      || step.hazards.length || step.risks.length || step.consequences.length
      || step.measures.length || step.epis.length || step.epcs.length,
    )
    .map((step, index) => ({
      item: index + 1,
      ...step,
      potentialRisks: juntarRiscos(step.hazards, step.risks, step.consequences),
      preventiveMeasures: juntarMedidas(step.measures, step.epis, step.epcs),
    }));

  if (normalized.length === 0) return null;

  return { proceduralSteps: normalized };
}
const companyNavItems = {
  aprs: { label: 'APRs e PTs', icon: FileText, href: '/reports', module: 'aprs', description: 'Gere APRs, PTs e documentos de segurança.' },
  teamAccess: { label: 'Acessos', icon: Users, section: 'teamAccess', module: 'aprs', description: 'Libere quem pode entrar no sistema.' },
  fireExtinguishers: { label: 'Extintores', icon: Flame, section: 'fireExtinguishers', module: 'extintores', description: 'Controle vencimentos, recargas, inspeções e mapa de extintores.' },
} as const;

const reportNavigationGroups = [
  { title: 'APRs e PTs', items: [companyNavItems.aprs] },
  { title: 'Equipe', items: [companyNavItems.teamAccess] },
  { title: 'Extintores', items: [companyNavItems.fireExtinguishers] },
] as const;

const DEFAULT_PREVIEW_PANEL_WIDTH = 640;

type AprManagerModal = 'projects' | 'works' | null;

const emptyProjectForm = {
  nome_projeto: '',
  descricao: '',
  responsavel_interno: '',
  data_inicio: '',
  data_termino_prevista: '',
  cliente_principal: '',
  status: 'ativo',
  observacoes: '',
};

const emptyWorkForm = {
  name: '',
  tipo_servico: '',
  status: 'ativo',
  cnpj: '',
  razao_social: '',
  nome_fantasia: '',
  situacao_cadastral: '',
  cnae_principal: '',
  logo_empresa_url: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  address: '',
  responsavel_obra: '',
  telefone: '',
  email: '',
  startDate: '',
  endDate: '',
  workLocationDetails: '',
  descricao_atividade: '',
  observacoes: '',
};

function formatDateForForm(value?: string) {
  return value ? value.split('T')[0] : '';
}

export default function ReportsPage() {
  const { user } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [equipment, setEquipment] = useState<ProtectiveEquipmentOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingSignature, setIsSendingSignature] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [responsibleContacts, setResponsibleContacts] = useState<ResponsibleContact[]>([]);
  const [savedDocuments, setSavedDocuments] = useState<SavedDocument[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Enquanto o tipo nao for escolhido, a tela mostra a entrada central.
  const [documentChosen, setDocumentChosen] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [signatureDocument, setSignatureDocument] = useState<SignatureDocument | null>(null);
  const [documentEvents, setDocumentEvents] = useState<DocumentEvent[]>([]);
  const [isRefreshingSignature, setIsRefreshingSignature] = useState(false);
  const [isResendingReminder, setIsResendingReminder] = useState(false);
  const [documentStatusAtual, setDocumentStatusAtual] = useState<string>(DOCUMENT_STATUS.DRAFT);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  // 1 = documento ajustado a largura da tela; o usuario amplia a partir dai.
  const [mobilePreviewZoom, setMobilePreviewZoom] = useState(1);
  const [mobilePreviewBoxWidth, setMobilePreviewBoxWidth] = useState(0);
  const mobilePreviewBoxRef = useRef<HTMLDivElement | null>(null);
  const [isPreviewMinimized, setIsPreviewMinimized] = useState(false);
  const [previewPanelWidth, setPreviewPanelWidth] = useState(DEFAULT_PREVIEW_PANEL_WIDTH);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [unsavedDialogMode, setUnsavedDialogMode] = useState<'new-report' | 'leave'>('leave');
  const [aprProjects, setAprProjects] = useState<AprPtProject[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState('');
  const [aprManagerModal, setAprManagerModal] = useState<AprManagerModal>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectForm, setProjectForm] = useState(emptyProjectForm);
  const [workForm, setWorkForm] = useState(emptyWorkForm);
  const [workLogoFileName, setWorkLogoFileName] = useState('');
  const { toast } = useToast();

  const form = useForm<SafetyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentType: DOCUMENT_TYPES.APR,
      workId: '',
      workName: '',
      workAddress: '',
      startDate: '',
      endDate: '',
      workLocationDetails: '',
      activityDescription: '',
      analysisSteps: [],
      responsiblePersons: [
        {
          employeeId: '',
          name: '',
          role: '',
          email: '',
          phone: '',
          useAssinafy: true,
          signatureData: '',
        },
      ],
      teamMembers: [],
      pt: {
        ptLocalAtividade: '',
        ptEquipamentoLinha: '',
        ptData: new Date().toISOString().split('T')[0],
        ptHoraInicio: '',
        ptHoraFim: '',
        ptDescricaoTarefa: '',
        ptChecklist: {
          trabalho_frio: false,
          eletricidade: false,
          ferramentas_manuais: false,
          parar_drenar: false,
          bloqueio_eqptos: false,
        },
        ptEnableEspacoConfinado: false,
        ptEnableVigia: false,
        ptEnableResgatistas: false,
        ptOxigenio: '',
        ptLE: '',
        ptH2S: '',
        ptCO2: '',
        ptObservacao: '',
        ptVisto: '',
        ptColaboradores: [],
        ptVigias: [],
        ptResgatistas: [],
        ptGestorArea: { name: '', email: '', phone: '', useAssinafy: true },
        ptResponsavelAtividade: { name: '', email: '', phone: '', useAssinafy: true },
        ptSesmt: { name: '', email: '', phone: '', useAssinafy: true },
      },
    },
    mode: 'onChange',
  });

  const liveFormData = form.watch();
  const watchedAnalysisSteps = useWatch({ control: form.control, name: 'analysisSteps' });
  const analysis = useMemo(() => normalizeAnalysisSteps(watchedAnalysisSteps), [watchedAnalysisSteps]);
  const hasUnsavedChanges = form.formState.isDirty;

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (user?.companyId) {
      const fetchData = async () => {
        const companyId = user.companyId!;
        setIsDataLoading(true);
        try {
          // Uma viagem so: server actions do Next sao serializadas, entao um
          // Promise.all daqui viraria uma fila de seis idas e voltas.
          const {
            company: companyResult,
            works: worksResult,
            employees: employeesResult,
            projects: projectsResult,
            responsibles: responsiblesResult,
            documents: documentsResult,
          } = await getReportsBootstrap(companyId);
          if (companyResult.success && companyResult.data) {
            setCompany(companyResult.data);
          } else {
            toast({ variant: 'destructive', title: 'Erro ao buscar dados da empresa', description: companyResult.error });
          }
          if (worksResult.success && worksResult.data) {
            setWorks(worksResult.data);
          } else {
            toast({ variant: 'destructive', title: 'Erro ao buscar empresas', description: worksResult.error });
          }
          if (employeesResult.success && employeesResult.data) {
            setEmployees(employeesResult.data);
          } else {
            toast({ variant: 'destructive', title: 'Erro ao buscar funcionarios', description: employeesResult.error });
          }
          if (projectsResult.success && projectsResult.data) {
            setAprProjects(projectsResult.data);
            setCurrentProjectId((current) => current || projectsResult.data?.find((project) => project.status === 'ativo')?.id || '');
          } else {
            toast({ variant: 'destructive', title: 'Erro ao buscar projetos APR/PT', description: projectsResult.error });
          }
          if (documentsResult.success && documentsResult.data) {
            setSavedDocuments(documentsResult.data);
          }
          if (responsiblesResult.success && responsiblesResult.data) {
            setResponsibleContacts(responsiblesResult.data);
          } else {
            toast({ variant: 'destructive', title: 'Erro ao buscar responsaveis salvos', description: responsiblesResult.error });
          }
        } catch (fetchError: any) {
          toast({ variant: 'destructive', title: 'Erro ao carregar dados da empresa', description: fetchError.message });
        } finally {
          setIsDataLoading(false);
        }
      };
      void fetchData();
    } else if (user && !user.companyId) {
      router.replace('/awaiting-company');
      setIsDataLoading(false);
    }
  }, [user, toast, router]);

  // Grava o responsavel no cadastro reutilizavel da empresa e ja atualiza a
  // lista da etapa "Equipe e responsaveis" sem recarregar a pagina.
  const handleSaveResponsibleContact = async (data: ResponsibleContactInput) => {
    if (!user?.companyId) {
      toast({ variant: 'destructive', title: 'Empresa nao identificada', description: 'Nao foi possivel salvar o responsavel.' });
      return false;
    }

    const result = await saveResponsibleContact(user.companyId, data);
    if (!result.success || !result.data) {
      toast({ variant: 'destructive', title: 'Erro ao salvar responsavel', description: result.error });
      return false;
    }

    const saved = result.data;
    setResponsibleContacts((current) => [
      ...current.filter((contact) => contact.id !== saved.id),
      saved,
    ].sort((a, b) => a.name.localeCompare(b.name)));
    toast({ title: 'Responsavel salvo', description: `${saved.name} ficara disponivel nos proximos documentos.` });
    return true;
  };

  const A4_LARGURA = 794;
  const docFitScale = mobilePreviewBoxWidth > 0 ? mobilePreviewBoxWidth / A4_LARGURA : 0.45;

  useEffect(() => {
    const caixa = mobilePreviewBoxRef.current;
    if (!caixa) return;

    // O ResizeObserver ja dispara na primeira observacao, entao a largura
    // inicial chega pelo callback.
    const observer = new ResizeObserver((entries) => {
      const largura = entries[0]?.contentRect.width ?? 0;
      if (largura > 0) setMobilePreviewBoxWidth(largura);
    });
    observer.observe(caixa);
    return () => observer.disconnect();
  }, [mobilePreviewOpen]);

  // Guarda silenciosa. Reaproveita a mesma action do botao Salvar Rascunho,
  // sem toast e sem resetar o formulario debaixo de quem esta digitando.
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Assinatura do que ja foi persistido.
   *
   * Sem isto o efeito se re-agenda para sempre: form.watch() devolve um objeto
   * novo a cada render e esta nas dependencias, e isDirty nunca volta a false
   * depois de salvar. O resultado era um documento se salvando sozinho a cada
   * ~3,5s indefinidamente, mesmo com a aba parada.
   */
  const ultimoSalvoRef = useRef<string | null>(null);
  useEffect(() => {
    if (!company?.id || !hasUnsavedChanges) return;
    // So guarda sozinho quando ja ha conteudo que valha a pena preservar.
    // A APR usa a analise gerada; a PT, o local e a data da permissao.
    const temConteudoApr = Boolean(analysis?.proceduralSteps?.length);
    const temConteudoPt = Boolean(
      liveFormData.documentType === DOCUMENT_TYPES.PT
      && liveFormData.pt?.ptLocalAtividade?.trim()
      && liveFormData.pt?.ptData?.trim(),
    );
    if (!temConteudoApr && !temConteudoPt && !currentDocumentId) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      const valores = form.getValues();
      const assinatura = JSON.stringify([valores, analysis, equipment]);

      // Nada mudou desde a ultima gravacao: nao ha o que salvar.
      if (assinatura === ultimoSalvoRef.current) {
        setAutoSaveState('saved');
        return;
      }

      setAutoSaveState('saving');
      void saveDocument({
        companyId: company.id,
        documentId: currentDocumentId || undefined,
        formData: valores,
        analysisData: analysis,
        equipmentData: equipment,
        silencioso: true,
      })
        .then((result) => {
          if (result.success) {
            ultimoSalvoRef.current = assinatura;
            if (result.documentId) setCurrentDocumentId(result.documentId);
          }
          setAutoSaveState(result.success ? 'saved' : 'idle');
        })
        .catch(() => setAutoSaveState('idle'));
    }, 2500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [analysis, company?.id, currentDocumentId, equipment, form, hasUnsavedChanges, liveFormData]);

  // Descricoes ja usadas viram atalho na etapa da atividade.
  const recentActivities = useMemo(() => {
    const vistas = new Set<string>();
    const saida: string[] = [];
    for (const doc of savedDocuments) {
      const dados = doc.formData as SafetyFormValues | undefined;
      // Um documento e APR ou PT: um dos dois campos estara preenchido.
      const texto = (dados?.activityDescription || dados?.pt?.ptDescricaoTarefa)?.trim();
      if (!texto || texto.length < 10 || vistas.has(texto)) continue;
      vistas.add(texto);
      saida.push(texto);
      if (saida.length >= 5) break;
    }
    return saida;
  }, [savedDocuments]);

  // Atividades ja escritas que se parecem com a atual. Servem de referencia,
  // nunca sao copiadas automaticamente.
  const similarActivities = useMemo(() => {
    const atual = (liveFormData.activityDescription || '').toLowerCase();
    const termosAtuais = new Set(
      atual.split(/[^a-zA-Zaaaaeeiooouuc]+/i).filter((palavra) => palavra.length > 3),
    );
    if (termosAtuais.size === 0) return [];

    return savedDocuments
      .map((doc) => {
        const dados = doc.formData as SafetyFormValues | undefined;
        const texto = (dados?.activityDescription || dados?.pt?.ptDescricaoTarefa)?.trim() || '';
        if (texto.length < 10 || texto.toLowerCase() === atual) return null;
        const termos = texto.toLowerCase().split(/[^a-zA-Zaaaaeeiooouuc]+/i).filter((p) => p.length > 3);
        const emComum = termos.filter((palavra) => termosAtuais.has(palavra)).length;
        return emComum >= 2 ? { texto, pontos: emComum } : null;
      })
      .filter((item): item is { texto: string; pontos: number } => item !== null)
      .sort((a, b) => b.pontos - a.pontos)
      .slice(0, 3)
      .map((item) => item.texto);
  }, [liveFormData.activityDescription, savedDocuments]);

  // Assinatura do documento aberto. Reaproveita a listagem que ja existe em
  // vez de criar uma action nova so para buscar um registro.
  const carregarAssinatura = async (signatureDocumentId?: string) => {
    if (!user?.companyId || !signatureDocumentId) {
      setSignatureDocument(null);
      return;
    }
    const resultado = await getSignatureDocuments(user.companyId);
    if (resultado.success && resultado.data) {
      setSignatureDocument(resultado.data.find((item) => item.id === signatureDocumentId) || null);
    }
  };

  const handleAtualizarAssinatura = async () => {
    if (!signatureDocument) return;
    setIsRefreshingSignature(true);
    const resultado = await refreshSignatureDocument(signatureDocument.id);
    if (!resultado.success) {
      toast({ variant: 'destructive', title: 'Nao foi possivel atualizar', description: resultado.error });
    } else {
      await carregarAssinatura(signatureDocument.id);
      toast({ title: 'Status atualizado' });
    }
    setIsRefreshingSignature(false);
  };

  const handleEnviarLembrete = async () => {
    if (!signatureDocument) return;
    setIsResendingReminder(true);
    const resultado = await resendSignatureNotification(signatureDocument.id);
    toast(
      resultado.success
        ? { title: 'Lembrete enviado', description: 'Quem ainda nao assinou recebeu a notificacao de novo.' }
        : { variant: 'destructive', title: 'Falha ao enviar lembrete', description: resultado.error },
    );
    setIsResendingReminder(false);
  };

  const handleCarregarHistorico = async (documentId?: string) => {
    const alvo = documentId || currentDocumentId;
    if (!alvo) return;
    const resultado = await getDocumentEvents(alvo);
    if (resultado.success && resultado.data) setDocumentEvents(resultado.data);
  };

  /** Finalizar = salvar e marcar como revisado. Ainda nao saiu para assinatura. */
  const handleFinalizarDocumento = async () => {
    const salvou = await handleSaveDraft();
    if (!salvou) return false;

    const alvo = currentDocumentId;
    if (alvo) {
      const resultado = await markDocumentInReview(alvo);
      if (resultado.success) {
        setDocumentStatusAtual(DOCUMENT_STATUS.IN_REVIEW);
        void handleCarregarHistorico(alvo);
      }
    }
    return true;
  };

  const handleConcluirDocumento = async () => {
    if (!currentDocumentId) return;
    const resultado = await completeDocument(currentDocumentId);
    if (resultado.success) {
      setDocumentStatusAtual(DOCUMENT_STATUS.COMPLETED);
      void handleCarregarHistorico();
      toast({ title: 'Documento finalizado', description: 'Ele fica arquivado e nao aceita mais alteracao.' });
    } else {
      toast({ variant: 'destructive', title: 'Nao foi possivel concluir', description: resultado.error });
    }
  };

  const handleBaixarAssinado = () => {
    if (!signatureDocument) return;
    window.open(`/api/assinafy/download/${signatureDocument.id}`, '_blank', 'noopener');
  };

  const handleCompartilhar = async () => {
    if (!signatureDocument) return;
    const url = `${window.location.origin}/api/assinafy/download/${signatureDocument.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: signatureDocument.documentName, url });
        return;
      } catch {
        // usuario cancelou: cai para a copia
      }
    }
    await navigator.clipboard.writeText(url);
    toast({ title: 'Link copiado', description: 'O endereco do documento assinado esta na area de transferencia.' });
  };

  // Locais ja usados nesta empresa. Cada local digitado num documento salvo
  // fica disponivel para os proximos, sem cadastro separado.
  const knownLocations = useMemo(() => {
    const empresaAtual = liveFormData.workId;
    const vistos = new Set<string>();
    const saida: string[] = [];

    const empresa = works.find((obra) => obra.id === empresaAtual);
    const doCadastro = empresa?.workLocationDetails?.trim();
    if (doCadastro) {
      vistos.add(doCadastro.toLowerCase());
      saida.push(doCadastro);
    }

    for (const doc of savedDocuments) {
      const dados = doc.formData as SafetyFormValues | undefined;
      if (empresaAtual && dados?.workId !== empresaAtual) continue;
      const local = dados?.workLocationDetails?.trim();
      if (!local || vistos.has(local.toLowerCase())) continue;
      vistos.add(local.toLowerCase());
      saida.push(local);
    }
    return saida;
  }, [liveFormData.workId, savedDocuments, works]);

  const draftLoadedRef = useRef<string | null>(null);
  useEffect(() => {
    const documentId = searchParams.get('documentId');
    if (!documentId || draftLoadedRef.current === documentId) return;
    draftLoadedRef.current = documentId;

    void (async () => {
      try {
        const result = await getDocument(documentId);
        if (result.success && result.data) {
          const doc = result.data;
          setCurrentDocumentId(doc.id);
          const cleanFormData = JSON.parse(JSON.stringify(doc.formData, (_, v) => (v === null ? undefined : v)));
          form.reset(cleanFormData);
          if (doc.analysisData?.proceduralSteps?.length) {
            form.setValue('analysisSteps', doc.analysisData.proceduralSteps, { shouldDirty: true });
          }
          if (doc.equipmentData) {
            setEquipment(doc.equipmentData);
          }
          setDocumentChosen(true);
          setDocumentStatusAtual(doc.status || DOCUMENT_STATUS.DRAFT);
          void carregarAssinatura(doc.signatureDocumentId);
          void handleCarregarHistorico(doc.id);
          toast({ title: 'Documento carregado', description: `"${doc.documentName}" foi carregado.` });
        } else {
          toast({ variant: 'destructive', title: 'Erro ao carregar documento', description: result.error || 'Documento nao encontrado.' });
        }
      } catch {
        toast({ variant: 'destructive', title: 'Erro ao carregar documento', description: 'Erro inesperado ao carregar o documento.' });
      }
    })();
  }, [searchParams, form, toast]);

  const handleFormSubmit = async (data: SafetyFormValues) => {
    if (data.documentType !== DOCUMENT_TYPES.APR) return;
    const activityDescription = data.activityDescription || '';

    setIsLoading(true);
    setError(null);
    setEquipment(null);

    try {
      const manualNormalized = normalizeAnalysisSteps(form.getValues('analysisSteps'));
      const [analysisResult, equipmentResult] = await Promise.all([
        getSafetyAnalysis({ activityDescription }),
        getProtectiveEquipment({ activityDescription }),
      ]);

      if (analysisResult.error || !analysisResult.data) {
        const errorMsg = analysisResult.error || ptBr.validations.safetyAnalysisFailed;
        if (!manualNormalized) {
          setError(errorMsg);
        }
        toast({ variant: 'destructive', title: ptBr.toasts.errors.fetchAnalysis, description: errorMsg });
      } else {
        const manualSteps = manualNormalized?.proceduralSteps ?? [];
        // Espalha a etapa inteira: reconstruir campo a campo descartava as
        // listas de perigos, riscos, consequencias, medidas, EPI e EPC.
        const merged = [...manualSteps, ...analysisResult.data.proceduralSteps].map((step, index) => ({
          ...step,
          item: index + 1,
        }));

        form.setValue('analysisSteps', merged, { shouldDirty: true, shouldValidate: true });
      }

      if (equipmentResult.error || !equipmentResult.data) {
        const errorMsg = equipmentResult.error || ptBr.validations.equipmentRecommendationFailed;
        setError(errorMsg);
        toast({ variant: 'destructive', title: ptBr.toasts.errors.fetchEpi, description: errorMsg });
      } else {
        setEquipment(equipmentResult.data);
      }
    } catch (submitError: any) {
      const errorMsg = submitError.message || ptBr.errors.unexpectedError;
      setError(errorMsg);
      toast({ variant: 'destructive', title: ptBr.toasts.errors.fetchAnalysis, description: errorMsg });
    }

    setIsLoading(false);
  };

  const handleNewReport = () => {
    setEquipment(null);
    setError(null);
    setCurrentDocumentId(null);
    draftLoadedRef.current = null;
    form.reset();
    router.replace('/reports', { scroll: false });
  };

  const handleSaveDraft = async () => {
    if (!company?.id) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Empresa nao identificada.' });
      return false;
    }

    setIsSavingDraft(true);
    try {
      const result = await saveDocument({
        companyId: company.id,
        documentId: currentDocumentId || undefined,
        formData: form.getValues(),
        analysisData: analysis,
        equipmentData: equipment,
      });

      if (!result.success) {
        throw new Error(result.error || 'Falha ao salvar rascunho.');
      }

      if (result.documentId) {
        setCurrentDocumentId(result.documentId);
      }

      form.reset(form.getValues());
      toast({ title: 'Rascunho salvo', description: 'O documento foi salvo com sucesso.' });
      return true;
    } catch (saveError: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: saveError.message });
      return false;
    } finally {
      setIsSavingDraft(false);
    }
  };

  const clearUnsavedDialog = () => {
    setUnsavedDialogOpen(false);
    setPendingNavigation(null);
  };

  const requestNavigation = (action: () => void, mode: 'new-report' | 'leave' = 'leave') => {
    if (!hasUnsavedChanges) {
      action();
      return;
    }

    setUnsavedDialogMode(mode);
    setPendingNavigation(() => action);
    setUnsavedDialogOpen(true);
  };

  const handleSaveAndContinue = async () => {
    const saved = await handleSaveDraft();
    if (!saved) return;

    const action = pendingNavigation;
    clearUnsavedDialog();
    action?.();
  };

  const handleContinueWithoutSaving = () => {
    const action = pendingNavigation;
    clearUnsavedDialog();
    action?.();
  };

  const handleGuardedLinkClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!hasUnsavedChanges) return;
    event.preventDefault();
    requestNavigation(() => router.push(href), 'leave');
  };

  const currentProject = aprProjects.find((project) => project.id === currentProjectId) || null;
  const projectWorks = currentProject ? works.filter((work) => work.projeto_id === currentProject.id) : [];
  const selectedWork = works.find((work) => work.id === liveFormData.workId) || null;
  const previewCompany = selectedWork
    ? {
        ...(company || { id: selectedWork.companyId, createdAt: selectedWork.createdAt }),
        name: selectedWork.nome_fantasia || selectedWork.razao_social || company?.name || 'Phi Docs',
        logo: selectedWork.logo_empresa_url || company?.logo,
      } as Company
    : currentProject
    ? {
        ...(company || { id: currentProject.companyId, createdAt: currentProject.createdAt }),
        name: currentProject.cliente_principal || company?.name || 'Phi Docs',
        logo: company?.logo,
      } as Company
    : company;

  const handleSaveProject = async () => {
    if (!user?.companyId) {
      toast({ variant: 'destructive', title: 'Empresa nao identificada', description: 'Nao foi possivel criar o projeto.' });
      return;
    }

    if (!projectForm.nome_projeto.trim()) {
      toast({ variant: 'destructive', title: 'Dados obrigatorios', description: 'Informe o nome do projeto.' });
      return;
    }

    const result = await createAprProject({
      companyId: user.companyId,
      ...projectForm,
      nome_empresa: projectForm.cliente_principal,
      status: projectForm.status as AprPtProject['status'],
    });

    const now = new Date().toISOString();
    const isLocalFallback = !result.success || !result.id;
    const project: AprPtProject = {
      id: result.id || `apr-project-local-${Date.now()}`,
      companyId: user.companyId,
      ...projectForm,
      nome_empresa: projectForm.cliente_principal,
      status: projectForm.status as AprPtProject['status'],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    setAprProjects((current) => [project, ...current]);
    setCurrentProjectId(project.id);
    setProjectForm(emptyProjectForm);
    setShowProjectForm(false);
    toast({
      title: isLocalFallback ? 'Projeto criado nesta sessao' : 'Projeto selecionado',
      description: isLocalFallback
        ? `Nao foi possivel salvar no banco agora: ${result.error || 'verifique a migration projetos_apr_pt.'}`
        : 'Projeto criado e definido como contexto da APR/PT.',
    });
  };

  const handleSelectWorkForDocument = (work: Work) => {
    form.setValue('workId', work.id, { shouldDirty: true, shouldValidate: true });
    form.setValue('workName', work.name, { shouldDirty: true, shouldValidate: true });
    form.setValue('workAddress', work.address, { shouldDirty: true, shouldValidate: true });
    form.setValue('startDate', formatDateForForm(work.startDate), { shouldDirty: true, shouldValidate: true });
    form.setValue('endDate', formatDateForForm(work.endDate), { shouldDirty: true, shouldValidate: true });
    form.setValue('workLocationDetails', work.workLocationDetails, { shouldDirty: true, shouldValidate: true });
    if (work.descricao_atividade) {
      form.setValue('activityDescription', work.descricao_atividade, { shouldDirty: true, shouldValidate: true });
    }
    setAprManagerModal(null);
    toast({ title: 'Empresa selecionada', description: 'Os dados dela foram aplicados ao documento.' });
  };

  const handleWorkLogoUpload = (file?: File | null) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast({ variant: 'destructive', title: 'Imagem invalida', description: 'Use PNG, JPG, JPEG ou WEBP.' });
      return;
    }
    if (file.size > 350 * 1024) {
      toast({ variant: 'destructive', title: 'Imagem muito grande', description: 'Use uma logo com ate 350 KB para manter o formulario leve.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setWorkForm((current) => ({ ...current, logo_empresa_url: String(reader.result || '') }));
      setWorkLogoFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveWork = async () => {
    if (!user?.companyId || !currentProject) {
      toast({ variant: 'destructive', title: 'Projeto obrigatorio', description: 'Selecione um projeto antes de cadastrar a empresa.' });
      return;
    }

    if (!workForm.name.trim()) {
      toast({ variant: 'destructive', title: 'Nome da empresa obrigatorio', description: 'Informe o nome da empresa.' });
      return;
    }

    if (!workForm.tipo_servico.trim()) {
      toast({ variant: 'destructive', title: 'Tipo de servico obrigatorio', description: 'Informe o tipo de servico prestado a essa empresa.' });
      return;
    }

    if (workForm.cnpj && !isValidCnpj(onlyCnpjDigits(workForm.cnpj))) {
      toast({ variant: 'destructive', title: 'CNPJ invalido', description: 'Corrija o CNPJ ou deixe o campo vazio.' });
      return;
    }

    const payload = {
      ...workForm,
      companyId: user.companyId,
      projeto_id: currentProject.id,
      address: workForm.name,
      workLocationDetails: workForm.observacoes || workForm.tipo_servico,
      startDate: workForm.startDate || new Date().toISOString().split('T')[0],
      endDate: workForm.endDate || workForm.startDate || new Date().toISOString().split('T')[0],
    };

    let result: Awaited<ReturnType<typeof createWork>> | null = null;
    try {
      result = await createWork(payload);
    } catch (saveError: any) {
      result = { success: false, error: saveError?.message || 'Resposta inesperada do servidor.' };
    }

    const localWork: Work = {
      ...payload,
      id: `work-local-${Date.now()}`,
      companyId: user.companyId,
      createdAt: new Date().toISOString(),
      deletedAt: null,
    };

    if (!result?.success) {
      setWorks((current) => [localWork, ...current]);
      setWorkForm(emptyWorkForm);
      setWorkLogoFileName('');
      toast({
        title: 'Empresa criada nesta sessao',
        description: `Nao foi possivel salvar no banco agora: ${result?.error || 'verifique a migration de empresas.'}`,
      });
      return;
    }

    try {
      const refreshed = await getWorks(user.companyId);
      if (refreshed.success && refreshed.data) {
        setWorks(refreshed.data);
      } else {
        setWorks((current) => [localWork, ...current]);
      }
    } catch {
      setWorks((current) => [localWork, ...current]);
    }
    setWorkForm(emptyWorkForm);
    setWorkLogoFileName('');
    toast({ title: 'Empresa criada', description: 'A empresa foi vinculada ao projeto atual.' });
  };

  const handleSendForSignature = async () => {
    setIsSendingSignature(true);
    try {
      const formData = form.getValues();

      if (company?.id) {
        const saveResult = await saveDocument({
          companyId: company.id,
          documentId: currentDocumentId || undefined,
          formData,
          analysisData: analysis,
          equipmentData: equipment,
        });
        if (saveResult.success && saveResult.documentId) {
          setCurrentDocumentId(saveResult.documentId);
        }
      }

      const result = await sendDocumentForSignature({
        formData,
        analysisData: analysis,
        equipmentData: equipment,
        company: previewCompany,
      });

      if (!result.success) {
        throw new Error(result.error || 'Falha ao enviar para assinatura.');
      }

      if (currentDocumentId && result.signatureDocumentId) {
        await markDocumentAsSent(currentDocumentId, result.signatureDocumentId);
        // O painel de assinaturas aparece na hora, sem trocar de tela.
        setDocumentStatusAtual(DOCUMENT_STATUS.AWAITING_SIGNATURE);
        await carregarAssinatura(result.signatureDocumentId);
      }

      setCurrentDocumentId(null);
      draftLoadedRef.current = null;
      form.reset(form.getValues());
      router.replace('/reports', { scroll: false });
      toast({ title: ptBr.toasts.success.signatureSent, description: ptBr.toasts.success.signatureSentDescription });
    } catch (sendError: any) {
      toast({ variant: 'destructive', title: ptBr.toasts.errors.signatureSendFailed, description: sendError.message });
    } finally {
      setIsSendingSignature(false);
    }
  };

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData: form.getValues(),
          analysisData: analysis,
          equipmentData: equipment,
          company: previewCompany,
        }),
      });

      if (!response.ok) {
        let details = '';
        try {
          const data = await response.json();
          details = data?.details ? ` ${data.details}` : '';
        } catch {}
        throw new Error(`${ptBr.errors.pdfGenerationFailed}${details}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'documento_seguranca.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      // Registra na trilha: gerar PDF nao muda o status, mas e um evento do documento.
      if (currentDocumentId) {
        void logPdfGenerated(currentDocumentId).then(() => handleCarregarHistorico());
      }

      toast({ title: ptBr.toasts.success.pdfDownloaded, description: ptBr.toasts.success.pdfDownloadedDescription });
    } catch (pdfError: any) {
      toast({
        variant: 'destructive',
        title: ptBr.toasts.errors.pdfError,
        description: pdfError?.message || ptBr.toasts.errors.pdfErrorDescription,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    await createSupabaseBrowserClient().auth.signOut();
    router.push('/login');
  };

  const companyPanelHref = (section: string) =>
    user?.companyId ? `/company/${user.companyId}?section=${section}` : '#';

  const renderCompanyNavItem = (item: (typeof companyNavItems)[keyof typeof companyNavItems], compact = false) => {
    const Icon = item.icon;
    const href = 'section' in item ? companyPanelHref(item.section) : item.href;
    const color = getModuleColor(item.module);
    return (
      <Link
        key={'section' in item ? item.section : item.href}
        href={href}
        title={item.description}
        onClick={(event) => {
          if (href !== '#') handleGuardedLinkClick(event, href);
        }}
        className={[
          'flex items-center gap-3 rounded-xl text-[#6e6a61] transition-colors hover:bg-[#e3e0d8] hover:text-[#111111]',
          compact ? 'px-4 py-2.5 text-sm' : 'px-3.5 py-3 text-[0.95rem]',
        ].join(' ')}
      >
        <Icon className={compact ? 'h-4 w-4 shrink-0' : 'h-5 w-5 shrink-0'} style={{ color: color.icon }} />
        {item.label}
      </Link>
    );
  };

  return (
    <>
      <div className="no-print min-h-screen bg-[#f2f1ed]">
        <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center border-b border-[#cfcbc0] bg-[#f7f5f0] px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir menu"
              onClick={() => setMobileNavOpen(true)}
              className="h-9 w-9 rounded-md text-[#111111] hover:bg-[#ebe9e3] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Logo className="h-auto w-[132px] sm:w-[170px]" />
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            {/* No celular a pre-visualizacao nao cabe ao lado: vira uma folha
                que abre por cima. Sino e ajuda saem para dar espaco. */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobilePreviewOpen(true)}
              className="h-9 gap-1.5 px-3 min-[1552px]:hidden"
            >
              <Eye className="h-4 w-4" />
              Prévia
            </Button>
            <Button variant="ghost" size="icon" className="hidden h-8 w-8 rounded-full text-[#111111] hover:bg-[#ebe9e3] sm:inline-flex">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden h-8 w-8 rounded-full text-[#111111] hover:bg-[#ebe9e3] sm:inline-flex">
              <CircleHelp className="h-4 w-4" />
            </Button>
            <UserNav />
          </div>
        </header>

        {mobileNavOpen && (
          <div
            className="fixed inset-0 top-16 z-30 bg-black/40 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside
          onClick={() => setMobileNavOpen(false)}
          className={cn(
            'fixed inset-y-0 left-0 top-16 z-30 flex w-80 max-w-[85vw] flex-col border-r border-[#cfcbc0] bg-[#f2f1ed] transition-transform duration-300 lg:z-20 lg:max-w-none lg:translate-x-0',
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="px-5 pb-5 pt-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f7f5f0] text-[#7a1f1f]">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold leading-6 text-[#111111]">Gestão</h1>
                <p className="mt-1 truncate text-sm text-[#6e6a61]">{company?.name || 'Phi Docs'}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 pb-3">
            <div className="space-y-5">
              {reportNavigationGroups.map((group) => (
                <section key={group.title} className="space-y-1.5">
                  <p className="px-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#6e6a61]">{group.title}</p>
                  <div className="space-y-1">
                    {group.items.map((item) => renderCompanyNavItem(item))}
                  </div>
                </section>
              ))}
            </div>
          </nav>

          <div className="mt-auto border-t border-[#cfcbc0] px-4 py-4">
            <Button
              className="h-12 w-full rounded-xl bg-[#7a1f1f] font-semibold text-white hover:bg-[#8a5a00]"
              onClick={() => requestNavigation(handleNewReport, 'new-report')}
            >
              <Plus className="h-4 w-4" />
              Novo Relatório
            </Button>

            <div className="mt-6 space-y-1 pb-4">
              <Button variant="ghost" className="w-full justify-start rounded-xl px-4 py-3 text-body-sm text-[#6e6a61] hover:bg-[#e3e0d8] hover:text-[#111111]">
                <CircleHelp className="h-4 w-4" />
                Suporte
              </Button>
              <Button
                variant="ghost"
                onClick={() => requestNavigation(handleSignOut, 'leave')}
                className="w-full justify-start rounded-xl px-4 py-3 text-body-sm text-[#7a1f1f] hover:bg-[#f0e2e0] hover:text-[#7a1f1f]"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </aside>

        {/*
          A previa lado a lado so entra quando cabe de verdade.

          A moldura fixa e a barra lateral (320px + 32px de folga) mais a
          previa (640px). Presas ao lg (1024px), as duas somavam 992px e
          sobravam 17px para o formulario: o texto quebrava uma palavra por
          linha e as colunas se sobrepunham. O corte em 1552px = 352 da barra
          + 560 minimos de formulario + 640 da previa. Abaixo disso a
          previa vira a folha que abre por cima, pelo botao "Previa".
        */}
        <main
          className="pt-16 transition-all duration-300 lg:pl-[calc(20rem+2rem)] min-[1552px]:pr-[var(--preview-w)]"
          style={{
            '--preview-w': showPreview ? (isPreviewMinimized ? '72px' : `${previewPanelWidth}px`) : '0px',
          } as React.CSSProperties}
        >
          <div className="min-h-[calc(100vh-64px)]">
            <section className="px-6 pt-6">
              <div className="flex flex-col gap-3 rounded-2xl border border-[#cfcbc0] bg-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7a1f1f]">Projeto do documento</p>
                  <p className="mt-0.5 truncate text-lg font-semibold text-[#111111]">
                    {currentProject?.nome_projeto || 'Nenhum projeto selecionado'}
                  </p>
                  <p className="truncate text-sm text-[#6e6a61]">
                    {currentProject
                      ? `${currentProject.cliente_principal || 'Projeto interno'}${currentProject.responsavel_interno ? ` \u00b7 ${currentProject.responsavel_interno}` : ''}`
                      : 'Selecione um projeto para organizar as APRs e PTs.'}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {currentProject && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 rounded-xl text-[#6e6a61] hover:bg-[#f2f1ed]"
                      onClick={() => setAprManagerModal('works')}
                    >
                      <HardHat className="h-4 w-4" />
                      Empresas do projeto
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl border-[#cfcbc0]"
                    onClick={() => setAprManagerModal('projects')}
                  >
                    <Briefcase className="h-4 w-4" />
                    {currentProject ? 'Trocar projeto' : 'Selecionar projeto'}
                  </Button>
                </div>
              </div>
            </section>

            {documentChosen && currentDocumentId && (
              <section className="px-4 pt-6 sm:px-6">
                <DocumentLifecycle
                  status={resolverStatus({ status: documentStatusAtual as never }, signatureDocument)}
                  eventos={documentEvents}
                />
              </section>
            )}

            {documentChosen && signatureDocument && (
              <section className="px-4 pt-6 sm:px-6">
                <SignaturePanel
                  status={resolverStatus({ status: documentStatusAtual as never }, signatureDocument)}
                  signatureDocument={signatureDocument}
                  eventos={documentEvents}
                  onAtualizarStatus={handleAtualizarAssinatura}
                  isAtualizando={isRefreshingSignature}
                  onEnviarLembrete={handleEnviarLembrete}
                  isEnviandoLembrete={isResendingReminder}
                  onVisualizarPdf={() => {
                    setShowPreview(true);
                    setMobilePreviewOpen(true);
                  }}
                  onBaixarPdf={handleBaixarAssinado}
                  onCompartilhar={handleCompartilhar}
                  onCarregarHistorico={handleCarregarHistorico}
                  onConcluir={handleConcluirDocumento}
                />
              </section>
            )}

            {!documentChosen ? (
              <DocumentTypeChooser
                onChoose={(tipo) => {
                  form.setValue('documentType', tipo, { shouldDirty: false });
                  setDocumentChosen(true);
                }}
              />
            ) : (
            <FormPanel
              form={form}
              onSubmit={handleFormSubmit}
              isLoading={isLoading}
              works={works}
              employees={employees}
              responsibleContacts={responsibleContacts}
              onSaveResponsibleContact={handleSaveResponsibleContact}
              equipment={equipment}
              onEquipmentChange={setEquipment}
              projects={aprProjects}
              selectedProjectId={currentProjectId}
              onSelectProject={setCurrentProjectId}
              onCreateProject={() => setAprManagerModal('projects')}
              onSelectCompany={(workId) => {
                const empresa = works.find((obra) => obra.id === workId);
                if (empresa) handleSelectWorkForDocument(empresa);
              }}
              onCreateCompany={() => setAprManagerModal('works')}
              recentActivities={recentActivities}
              knownLocations={knownLocations}
              similarActivities={similarActivities}
              onFinalizarDocumento={handleFinalizarDocumento}
              onVisualizarDocumento={() => {
                // O painel lateral so existe a partir de lg e a folha so abaixo
                // dela: ligar os dois abre exatamente um, conforme a tela.
                setShowPreview(true);
                setMobilePreviewOpen(true);
              }}
              isDataLoading={isDataLoading}
              showPreview={showPreview}
              onTogglePreview={() => setShowPreview((current) => !current)}
              isSendingSignature={isSendingSignature}
              onSendForSignature={handleSendForSignature}
              canSendSignature={liveFormData.documentType === DOCUMENT_TYPES.APR || liveFormData.documentType === DOCUMENT_TYPES.PT}
              isGeneratingPdf={isGeneratingPdf}
              onGeneratePdf={handleGeneratePdf}
              isSavingDraft={isSavingDraft}
              onSaveDraft={handleSaveDraft}
              autoSaveState={autoSaveState}
            />
            )}
          </div>
        </main>
      </div>

      {showPreview && (
        <div className="hidden min-[1552px]:block">
        <DocumentPreviewPanel
          formData={liveFormData}
          analysisData={analysis}
          equipmentData={equipment}
          company={previewCompany}
          error={analysis?.proceduralSteps?.length ? null : error}
          panelWidth={previewPanelWidth}
          onHide={() => setShowPreview(false)}
          onMinimizedChange={setIsPreviewMinimized}
          onWidthChange={setPreviewPanelWidth}
        />
        </div>
      )}

      {/* Pre-visualizacao no celular: folha por cima, com o documento
          reduzido para caber na largura da tela. */}
      <Sheet open={mobilePreviewOpen} onOpenChange={setMobilePreviewOpen}>
        <SheetContent side="bottom" className="flex h-[92vh] flex-col p-0 min-[1552px]:hidden">
          <SheetHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b border-[#cfcbc0] px-4 py-2.5 text-left">
            <SheetTitle className="text-base">Pré-visualização</SheetTitle>
            <div className="mr-8 flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Diminuir zoom"
                className="h-9 w-9"
                onClick={() => setMobilePreviewZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center text-xs tabular-nums text-[#6e6a61]">
                {Math.round(mobilePreviewZoom * 100)}%
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Aumentar zoom"
                className="h-9 w-9"
                onClick={() => setMobilePreviewZoom((z) => Math.min(4, Number((z + 0.25).toFixed(2))))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {/*
            'zoom' (e nao 'transform: scale') porque ele altera o tamanho de
            layout: sem isso o container de rolagem continua achando que o
            documento tem 794px e a pagina aparece cortada.
            touch-action libera a pinca de dois dedos por cima disso.
          */}
          <div
            ref={mobilePreviewBoxRef}
            className="min-h-0 flex-1 overflow-auto bg-[#ebe9e3] p-4"
            style={{ touchAction: 'pinch-zoom pan-x pan-y' }}
          >
            <div style={{ zoom: docFitScale * mobilePreviewZoom }}>
              <PrintPreview
                formData={liveFormData}
                analysisData={analysis}
                equipmentData={equipment}
                company={previewCompany}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="print-only">
        <PrintPreview
          formData={liveFormData}
          analysisData={analysis}
          equipmentData={equipment}
          company={previewCompany}
          error={analysis?.proceduralSteps?.length ? null : error}
        />
      </div>

      <Dialog
        open={aprManagerModal !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAprManagerModal(null);
            setShowProjectForm(false);
          }
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {aprManagerModal === 'projects' && 'Selecionar Projeto'}
              {aprManagerModal === 'works' && 'Empresas do projeto'}
            </DialogTitle>
            <DialogDescription>
              {aprManagerModal === 'projects'
                ? 'O projeto guarda as empresas, as pessoas e os documentos.'
                : 'Empresas cadastradas dentro do projeto selecionado.'}
            </DialogDescription>
          </DialogHeader>

          {aprManagerModal === 'projects' ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-[#111111]">Projetos cadastrados</p>
                  <p className="text-sm text-[#6e6a61]">Selecione um projeto para liberar as empresas, a equipe de trabalho e os responsaveis.</p>
                </div>
                <Button
                  type="button"
                  className="rounded-lg bg-[#7a1f1f] text-white hover:bg-[#5f1818]"
                  onClick={() => setShowProjectForm((current) => !current)}
                >
                  <Plus className="h-4 w-4" />
                  {showProjectForm ? 'Ocultar cadastro' : 'Criar projeto'}
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {aprProjects.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#cfcbc0] bg-white p-4 text-sm text-[#6e6a61]">
                    Nenhum projeto cadastrado ainda. Clique em <strong>Criar projeto</strong> para organizar empresas, equipe de trabalho e responsaveis.
                  </div>
                ) : (
                  aprProjects.map((project) => {
                    const isSelected = currentProjectId === project.id;
                    return (
                    <div
                      key={project.id}
                      className={`rounded-xl border p-4 transition ${
                        isSelected
                          ? 'border-[#7a1f1f] bg-[#f7f5f0] shadow-sm ring-2 ring-[#e8d9ae]'
                          : 'border-[#cfcbc0] bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                            isSelected ? 'bg-[#7a1f1f] text-white' : 'bg-[#f7f5f0] text-[#7a1f1f]'
                          }`}>
                            {project.nome_projeto.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-[#111111]">{project.nome_projeto}</p>
                              {isSelected ? <span className="rounded-full bg-[#7a1f1f] px-2.5 py-1 text-xs font-semibold text-white">Selecionado</span> : null}
                            </div>
                            <p className="text-sm text-[#6e6a61]">{project.cliente_principal || 'Cliente principal nao informado'}</p>
                            <p className="mt-1 text-xs text-[#6e6a61]">{project.responsavel_interno || 'Responsavel interno nao informado'}</p>
                            <p className="mt-1 text-xs text-[#6e6a61]">{project.data_inicio || 'Inicio nao informado'}</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-[#eaf2ed] px-2.5 py-1 text-xs font-semibold text-[#1b5e3f]">{project.status}</span>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          type="button"
                          className="h-9 rounded-lg bg-[#7a1f1f] text-white hover:bg-[#5f1818]"
                          onClick={() => {
                            setCurrentProjectId(project.id);
                            setShowProjectForm(false);
                            setAprManagerModal(null);
                          }}
                        >
                          {isSelected ? 'Usar este projeto' : 'Selecionar'}
                        </Button>
                        <Button type="button" variant="outline" className="h-9 rounded-lg border-[#cfcbc0]" onClick={() => toast({ title: 'Edicao preparada', description: 'A edicao completa do projeto fica para a proxima etapa.' })}>
                          Editar
                        </Button>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>

              {showProjectForm ? (
              <div className="rounded-xl border border-[#cfcbc0] bg-[#f7f5f0] p-4">
                <p className="font-semibold text-[#111111]">Novo projeto</p>
                <p className="mt-1 max-w-[62ch] text-sm text-[#6e6a61]">
                  O projeto e o nivel de cima: dentro dele voce cadastra as empresas, e para cada
                  empresa emite as APRs e PTs. Cada documento tem as datas dele — aqui nao se coloca data.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-medium text-[#6e6a61]">
                    Nome do projeto
                    <input className="mt-1 h-10 w-full rounded-lg border border-[#cfcbc0] bg-white px-3 text-sm outline-none focus:border-[#7a1f1f]" value={projectForm.nome_projeto} onChange={(event) => setProjectForm((current) => ({ ...current, nome_projeto: event.target.value }))} />
                    <span className="mt-1 block text-xs font-normal text-[#6e6a61]">Como voce chama esse conjunto de trabalhos. Exemplo: Obras 2026 - Regiao Sul.</span>
                  </label>
                  <label className="text-sm font-medium text-[#6e6a61]">
                    Status
                    <select className="mt-1 h-10 w-full rounded-lg border border-[#cfcbc0] bg-white px-3 text-sm outline-none focus:border-[#7a1f1f]" value={projectForm.status} onChange={(event) => setProjectForm((current) => ({ ...current, status: event.target.value }))}>
                      <option value="ativo">Ativo</option>
                      <option value="em_andamento">Em andamento</option>
                      <option value="concluido">Concluido</option>
                      <option value="arquivado">Arquivado</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-[#6e6a61]">
                    Cliente principal
                    <input className="mt-1 h-10 w-full rounded-lg border border-[#cfcbc0] bg-white px-3 text-sm outline-none focus:border-[#7a1f1f]" value={projectForm.cliente_principal} onChange={(event) => setProjectForm((current) => ({ ...current, cliente_principal: event.target.value }))} />
                    <span className="mt-1 block text-xs font-normal text-[#6e6a61]">Opcional. Quem contrata este projeto.</span>
                  </label>
                  <label className="text-sm font-medium text-[#6e6a61]">
                    Quem cuida por aqui
                    <input className="mt-1 h-10 w-full rounded-lg border border-[#cfcbc0] bg-white px-3 text-sm outline-none focus:border-[#7a1f1f]" value={projectForm.responsavel_interno} onChange={(event) => setProjectForm((current) => ({ ...current, responsavel_interno: event.target.value }))} />
                    <span className="mt-1 block text-xs font-normal text-[#6e6a61]">Opcional. A pessoa da sua equipe responsavel por essa empresa.</span>
                  </label>
                </div>
                <label className="mt-3 block text-sm font-medium text-[#6e6a61]">
                  Observacoes
                  <textarea className="mt-1 min-h-20 w-full rounded-lg border border-[#cfcbc0] bg-white px-3 py-2 text-sm outline-none focus:border-[#7a1f1f]" value={projectForm.observacoes} onChange={(event) => setProjectForm((current) => ({ ...current, observacoes: event.target.value }))} />
                  <span className="mt-1 block text-xs font-normal text-[#6e6a61]">Opcional. Nao sai no documento.</span>
                </label>
                <div className="mt-4 flex justify-end">
                  <Button type="button" className="rounded-lg bg-[#7a1f1f] text-white hover:bg-[#5f1818]" onClick={handleSaveProject}>Salvar projeto</Button>
                </div>
              </div>
              ) : null}
            </div>
          ) : !currentProject ? (
            <div className="rounded-xl border border-dashed border-[#cfcbc0] p-6 text-center">
              <p className="font-semibold text-[#111111]">Selecione um projeto antes de gerenciar estes dados.</p>
              <p className="mt-1 text-sm text-[#6e6a61]">Projetos guardam as empresas, a equipe e os documentos APR/PT.</p>
              <Button type="button" className="mt-4 rounded-lg bg-[#7a1f1f] text-white hover:bg-[#5f1818]" onClick={() => setAprManagerModal('projects')}>
                Selecionar projeto
              </Button>
            </div>
          ) : aprManagerModal === 'works' ? (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                {projectWorks.map((work) => (
                  <div key={work.id} className="rounded-xl border border-[#cfcbc0] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#cfcbc0] bg-[#f7f5f0] text-xs font-bold text-[#7a1f1f]">
                        {work.logo_empresa_url ? <img src={work.logo_empresa_url} alt={work.name} className="h-full w-full rounded-xl object-contain p-1" /> : work.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#111111]">{work.name}</p>
                        <p className="mt-1 text-sm text-[#6e6a61]">{work.tipo_servico || 'Tipo de servico nao informado'}</p>
                        <p className="mt-1 text-xs text-[#6e6a61]">{work.nome_fantasia || 'Nome fantasia nao informado'}{work.cnpj ? ` - ${work.cnpj}` : ''}</p>
                        <p className="mt-1 text-xs text-[#6e6a61]">{formatDateForForm(work.startDate) || '-'} ate {formatDateForForm(work.endDate) || '-'}</p>
                      </div>
                    </div>
                    <Button type="button" className="mt-4 h-9 rounded-lg bg-[#7a1f1f] text-white hover:bg-[#5f1818]" onClick={() => handleSelectWorkForDocument(work)}>
                      Selecionar para o documento
                    </Button>
                  </div>
                ))}
                {projectWorks.length === 0 ? <p className="text-sm text-[#6e6a61]">Este projeto ainda nao possui empresas cadastradas.</p> : null}
              </div>

              <div className="rounded-xl border border-[#cfcbc0] bg-[#f7f5f0] p-4">
                <p className="font-semibold text-[#111111]">Nova empresa</p>
                <p className="mt-1 text-sm text-[#6e6a61]">Cadastre a empresa dentro deste projeto para poder emitir APRs e PTs para ela.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-medium text-[#6e6a61]">Nome da empresa<input className="mt-1 h-10 w-full rounded-lg border border-[#cfcbc0] bg-white px-3 text-sm outline-none focus:border-[#7a1f1f]" value={workForm.name} onChange={(event) => setWorkForm((current) => ({ ...current, name: event.target.value }))} /><span className="mt-1 block text-xs font-normal text-[#6e6a61]">Como voce chama essa empresa no dia a dia.</span></label>
                  <label className="text-sm font-medium text-[#6e6a61]">Tipo de servico<input className="mt-1 h-10 w-full rounded-lg border border-[#cfcbc0] bg-white px-3 text-sm outline-none focus:border-[#7a1f1f]" value={workForm.tipo_servico} onChange={(event) => setWorkForm((current) => ({ ...current, tipo_servico: event.target.value }))} /></label>
                  <label className="text-sm font-medium text-[#6e6a61]">Data de inicio<input type="date" className="mt-1 h-10 w-full rounded-lg border border-[#cfcbc0] bg-white px-3 text-sm outline-none focus:border-[#7a1f1f]" value={workForm.startDate} onChange={(event) => setWorkForm((current) => ({ ...current, startDate: event.target.value }))} /></label>
                  <label className="text-sm font-medium text-[#6e6a61]">Termino previsto<input type="date" className="mt-1 h-10 w-full rounded-lg border border-[#cfcbc0] bg-white px-3 text-sm outline-none focus:border-[#7a1f1f]" value={workForm.endDate} onChange={(event) => setWorkForm((current) => ({ ...current, endDate: event.target.value }))} /></label>
                  <label className="text-sm font-medium text-[#6e6a61]">CNPJ<input className="mt-1 h-10 w-full rounded-lg border border-[#cfcbc0] bg-white px-3 text-sm outline-none focus:border-[#7a1f1f]" value={workForm.cnpj} onChange={(event) => setWorkForm((current) => ({ ...current, cnpj: formatCnpj(event.target.value) }))} /></label>
                  <label className="text-sm font-medium text-[#6e6a61]">Nome fantasia<input className="mt-1 h-10 w-full rounded-lg border border-[#cfcbc0] bg-white px-3 text-sm outline-none focus:border-[#7a1f1f]" value={workForm.nome_fantasia} onChange={(event) => setWorkForm((current) => ({ ...current, nome_fantasia: event.target.value }))} /></label>
                </div>
                <div className="mt-3 rounded-xl border border-[#cfcbc0] bg-white p-4">
                  <p className="text-sm font-semibold text-[#6e6a61]">Logo da empresa/cliente</p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-[#cfcbc0] bg-[#f7f5f0] text-sm font-bold text-[#7a1f1f]">
                      {workForm.logo_empresa_url ? <img src={workForm.logo_empresa_url} alt="Logo da empresa" className="h-full w-full rounded-xl object-contain p-1" /> : (workForm.nome_fantasia || workForm.name || 'OB').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex h-10 cursor-pointer items-center rounded-lg border border-[#cfcbc0] px-4 text-sm font-semibold text-[#6e6a61] hover:bg-[#f7f5f0]">
                        {workForm.logo_empresa_url ? 'Trocar imagem' : 'Selecionar imagem'}
                        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => handleWorkLogoUpload(event.target.files?.[0])} />
                      </label>
                      {workForm.logo_empresa_url ? <Button type="button" variant="outline" className="h-10 rounded-lg border-[#cfcbc0]" onClick={() => { setWorkForm((current) => ({ ...current, logo_empresa_url: '' })); setWorkLogoFileName(''); }}>Remover imagem</Button> : null}
                    </div>
                    {workLogoFileName ? <span className="text-xs text-[#6e6a61]">{workLogoFileName}</span> : null}
                  </div>
                </div>
                <label className="mt-3 block text-sm font-medium text-[#6e6a61]">Observacoes<textarea className="mt-1 min-h-20 w-full rounded-lg border border-[#cfcbc0] bg-white px-3 py-2 text-sm outline-none focus:border-[#7a1f1f]" value={workForm.observacoes} onChange={(event) => setWorkForm((current) => ({ ...current, observacoes: event.target.value }))} /></label>
                <div className="mt-4 flex justify-end"><Button type="button" className="rounded-lg bg-[#7a1f1f] text-white hover:bg-[#5f1818]" onClick={handleSaveWork}>Salvar empresa</Button></div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={unsavedDialogOpen} onOpenChange={setUnsavedDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {unsavedDialogMode === 'new-report' ? 'Comecar novo relatorio?' : 'Sair sem salvar?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {unsavedDialogMode === 'new-report'
                ? 'Voce tem alteracoes nao salvas. Salve o rascunho antes de limpar este formulario ou continue sem salvar.'
                : 'Voce tem alteracoes nao salvas neste documento. Salve o rascunho antes de sair desta pagina ou continue sem salvar.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-end">
            <AlertDialogCancel onClick={clearUnsavedDialog}>{ptBr.actions.cancel}</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              onClick={handleContinueWithoutSaving}
              className="rounded-md border-[#cfcbc0] text-[#6e6a61] hover:bg-[#f7f5f0]"
            >
              Continuar sem salvar
            </Button>
            <Button
              type="button"
              onClick={handleSaveAndContinue}
              disabled={isSavingDraft}
              className="rounded-md bg-[#7a1f1f] text-white hover:bg-[#5f1818]"
            >
              {isSavingDraft ? 'Salvando...' : 'Salvar rascunho'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
