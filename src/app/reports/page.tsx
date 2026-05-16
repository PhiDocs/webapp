'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo, useRef, type MouseEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { SafetyAnalysisOutput, ProtectiveEquipmentOutput } from '@/server/ai-actions';
import type { SafetyFormValues, Work, Employee, Company } from '@/lib/types';
import { getSafetyAnalysis, getProtectiveEquipment } from '@/server/ai-actions';
import { sendDocumentForSignature } from '@/server/signature-actions';
import { saveDocument, markDocumentAsSent, getDocument } from '@/server/document-actions';
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
import { getWorks } from '@/server/work-actions';
import { getEmployees } from '@/server/employee-actions';
import { getCompanyById } from '@/server/company-actions';
import { DocumentPreviewPanel } from '@/components/document-preview-panel';
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Coins,
  FileText,
  Flame,
  GraduationCap,
  HardHat,
  LogOut,
  PackageCheck,
  Plus,
  Settings,
  Shield,
  ShieldAlert,
  Siren,
  UserCog,
  UserRound,
  Users,
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
import { createSupabaseBrowserClient } from '@/supabase/browser';
import { signOut } from '@/server/auth-actions';
import { getModuleColor, moduleColorForSection } from '@/lib/module-colors';

function normalizeAnalysisSteps(steps: any[] | undefined): SafetyAnalysisOutput | null {
  if (!steps || steps.length === 0) return null;

  const normalized = steps
    .map((step) => ({
      activity: (step?.activity || '').trim(),
      potentialRisks: (step?.potentialRisks || '').trim(),
      preventiveMeasures: (step?.preventiveMeasures || '').trim(),
    }))
    .filter((step) => step.activity || step.potentialRisks || step.preventiveMeasures)
    .map((step, index) => ({
      item: index + 1,
      activity: step.activity,
      potentialRisks: step.potentialRisks,
      preventiveMeasures: step.preventiveMeasures,
    }));

  if (normalized.length === 0) return null;

  return { proceduralSteps: normalized };
}

const companyNavItems = {
  dashboard: { label: 'Dashboard', icon: BarChart3, section: 'dashboardGeneral', description: 'Veja indicadores gerais de segurança.' },
  works: { label: 'Obras', icon: HardHat, section: 'works', description: 'Gerencie obras usadas em APRs e permissões.' },
  employees: { label: 'Funcionários', icon: Users, section: 'employees', description: 'Gerencie funcionários usados em APRs e PTs.' },
  jobRoles: { label: 'Cargos', icon: Shield, section: 'jobRoles', description: 'Mantenha funções e responsabilidades.' },
  subcontractors: { label: 'Terceirizadas', icon: UserCog, section: 'subcontractors', description: 'Gerencie empresas terceirizadas.' },
  collaborators: { label: 'Colaboradores', icon: UserRound, section: 'collaborators', description: 'Cadastre e acompanhe colaboradores.' },
  epiDeliveries: { label: 'Entregas de EPI', icon: PackageCheck, section: 'epiDeliveries', description: 'Controle EPIs entregues, pendentes e vencidos.' },
  trainings: { label: 'Treinamentos', icon: GraduationCap, section: 'trainings', description: 'Controle treinamentos, certificados e vencimentos.' },
  inspections: { label: 'Inspeções', icon: ClipboardCheck, section: 'inspections', description: 'Realize checklists e inspeções em campo.' },
  fireExtinguishers: { label: 'Extintores', icon: Flame, section: 'fireExtinguishers', description: 'Controle vencimentos, recargas, inspeções e mapa de extintores.' },
  nonconformities: { label: 'Não Conformidades', icon: ShieldAlert, section: 'nonconformities', description: 'Acompanhe desvios, correções e prazos.' },
  incidents: { label: 'Incidentes', icon: Siren, section: 'incidents', description: 'Registre e investigue ocorrências.' },
  costsPrevention: { label: 'Custos & Prevenção', icon: Coins, section: 'costsPrevention', description: 'Acompanhe custos e oportunidades de prevenção.' },
  settings: { label: 'Configurações', icon: Settings, section: 'settings', description: 'Configure empresa e integrações.' },
} as const;

const reportNavigationGroups = [
  { title: 'Início', items: [companyNavItems.dashboard] },
  { title: 'APRs e Permissões', items: [companyNavItems.works, companyNavItems.employees, companyNavItems.jobRoles, companyNavItems.subcontractors], apr: true },
  { title: 'Gestão de Segurança', items: [companyNavItems.collaborators, companyNavItems.epiDeliveries, companyNavItems.trainings, companyNavItems.inspections] },
  { title: 'Prevenção e Emergência', items: [companyNavItems.fireExtinguishers] },
  { title: 'Ocorrências e Ações', items: [companyNavItems.nonconformities, companyNavItems.incidents] },
  { title: 'Financeiro e Análises', items: [companyNavItems.costsPrevention] },
  { title: 'Administração', items: [companyNavItems.settings] },
] as const;

const DEFAULT_PREVIEW_PANEL_WIDTH = 640;

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
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [isPreviewMinimized, setIsPreviewMinimized] = useState(false);
  const [previewPanelWidth, setPreviewPanelWidth] = useState(DEFAULT_PREVIEW_PANEL_WIDTH);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [unsavedDialogMode, setUnsavedDialogMode] = useState<'new-report' | 'leave'>('leave');
  const [isAprPtMenuOpen, setIsAprPtMenuOpen] = useState(true);
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
          const [companyResult, worksResult, employeesResult] = await Promise.all([
            getCompanyById(companyId),
            getWorks(companyId),
            getEmployees(companyId),
          ]);
          if (companyResult.success && companyResult.data) {
            setCompany(companyResult.data);
          } else {
            toast({ variant: 'destructive', title: 'Erro ao buscar dados da empresa', description: companyResult.error });
          }
          if (worksResult.success && worksResult.data) {
            setWorks(worksResult.data);
          } else {
            toast({ variant: 'destructive', title: 'Erro ao buscar obras', description: worksResult.error });
          }
          if (employeesResult.success && employeesResult.data) {
            setEmployees(employeesResult.data);
          } else {
            toast({ variant: 'destructive', title: 'Erro ao buscar funcionarios', description: employeesResult.error });
          }
        } catch (fetchError: any) {
          toast({ variant: 'destructive', title: 'Erro ao carregar dados da empresa', description: fetchError.message });
        } finally {
          setIsDataLoading(false);
        }
      };
      void fetchData();
    } else if (user && !user.companyId) {
      toast({ variant: 'destructive', title: 'Usuario sem empresa', description: 'Sua conta nao esta associada a uma empresa.' });
      setIsDataLoading(false);
    }
  }, [user, toast]);

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
        const merged = [...manualSteps, ...analysisResult.data.proceduralSteps].map((step, index) => ({
          item: index + 1,
          activity: step.activity,
          potentialRisks: step.potentialRisks,
          preventiveMeasures: step.preventiveMeasures,
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
        company,
      });

      if (!result.success) {
        throw new Error(result.error || 'Falha ao enviar para assinatura.');
      }

      if (currentDocumentId && result.signatureDocumentId) {
        await markDocumentAsSent(currentDocumentId, result.signatureDocumentId);
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
          company,
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
    const href = companyPanelHref(item.section);
    const color = getModuleColor(moduleColorForSection(item.section));
    return (
      <Link
        key={item.section}
        href={href}
        title={item.description}
        onClick={(event) => {
          if (href !== '#') handleGuardedLinkClick(event, href);
        }}
        className={[
          'flex items-center gap-3 rounded-xl text-[#4f5f7a] transition-colors hover:bg-[#e6e8eb] hover:text-[#191c1e]',
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
      <div className="no-print min-h-screen bg-[#f7f9fc]">
        <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center border-b border-[#e6cfc1] bg-[#f8f8f8] px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Logo className="h-auto w-[170px]" />
            <nav className="ml-10 hidden items-center gap-10 md:flex text-body-md text-[#584237]">
              <Link href="/reports" onClick={(event) => handleGuardedLinkClick(event, '/reports')} className="border-b-2 border-[#9e4300] pb-1 font-semibold text-[#9e4300]">
                Relatórios
              </Link>
              <Link href="/documents" onClick={(event) => handleGuardedLinkClick(event, '/documents')} className="transition-colors hover:text-[#b74813]">
                Documentos
              </Link>
            </nav>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[#2a2d34] hover:bg-[#eef1f5]">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[#2a2d34] hover:bg-[#eef1f5]">
              <CircleHelp className="h-4 w-4" />
            </Button>
            <UserNav />
          </div>
        </header>

        <aside className="fixed inset-y-0 left-0 top-16 z-20 hidden w-80 flex-col border-r border-[#e6cfc1] bg-[#f3f4f6] lg:flex">
          <div className="px-5 pb-5 pt-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff1e7] text-[#9e4300]">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold leading-6 text-[#191c1e]">Gestão</h1>
                <p className="mt-1 truncate text-sm text-[#4f5f7a]">{company?.name || 'Phi Docs'}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 pb-3">
            <div className="space-y-5">
              {reportNavigationGroups.map((group) => (
                <section key={group.title} className="space-y-1.5">
                  <p className="px-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#7b8495]">{group.title}</p>
                  {'apr' in group && group.apr ? (
                    <div>
                      <button
                        type="button"
                        onClick={() => setIsAprPtMenuOpen((current) => !current)}
                        className="flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left text-[0.95rem] font-semibold transition-colors hover:bg-[#e6e8eb]"
                        style={{ color: getModuleColor('aprs').text }}
                      >
                        <span className="flex items-center gap-3">
                          <FileText className="h-5 w-5" style={{ color: getModuleColor('aprs').icon }} />
                          APRs e PTs
                        </span>
                        <ChevronDown className={['h-4 w-4 transition-transform', isAprPtMenuOpen ? 'rotate-180' : ''].join(' ')} />
                      </button>
                      {isAprPtMenuOpen ? (
                        <div className="ml-4 mt-1 space-y-1 border-l border-[#d8dadd] pl-3">
                          {group.items.map((item) => renderCompanyNavItem(item, true))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {group.items.map((item) => renderCompanyNavItem(item))}
                      {group.title === 'Financeiro e Análises' ? (
                        <>
                          <Link href="/reports" className="flex items-center gap-3 rounded-xl border-l-4 px-3.5 py-3 text-[0.95rem] font-semibold" style={{ backgroundColor: getModuleColor('relatorios').soft, borderLeftColor: getModuleColor('relatorios').primary, color: getModuleColor('relatorios').text }}>
                            <BarChart3 className="h-5 w-5 shrink-0" style={{ color: getModuleColor('relatorios').icon }} />
                            Relatórios
                          </Link>
                          <Link href="/documents" onClick={(event) => handleGuardedLinkClick(event, '/documents')} className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-[0.95rem] text-[#4f5f7a] transition-colors hover:bg-[#e6e8eb] hover:text-[#191c1e]">
                            <FileText className="h-5 w-5 shrink-0" style={{ color: getModuleColor('documentos').icon }} />
                            Documentos
                          </Link>
                        </>
                      ) : null}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </nav>

          <div className="mt-auto border-t border-[#e0c0b1] px-4 py-4">
            <Button
              className="h-12 w-full rounded-xl bg-[#9e4300] font-semibold text-white hover:bg-[#8c3b00]"
              onClick={() => requestNavigation(handleNewReport, 'new-report')}
            >
              <Plus className="h-4 w-4" />
              Novo Relatório
            </Button>

            <div className="mt-6 space-y-1 pb-4">
              <Button variant="ghost" className="w-full justify-start rounded-xl px-4 py-3 text-body-sm text-[#4f5f7a] hover:bg-[#e6e8eb] hover:text-[#191c1e]">
                <CircleHelp className="h-4 w-4" />
                Suporte
              </Button>
              <Button
                variant="ghost"
                onClick={() => requestNavigation(handleSignOut, 'leave')}
                className="w-full justify-start rounded-xl px-4 py-3 text-body-sm text-[#d01818] hover:bg-[#fbe2df] hover:text-[#d01818]"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </aside>

        <main
          className="pt-16 transition-all duration-300 lg:pl-80"
          style={{
            paddingRight: showPreview ? (isPreviewMinimized ? '72px' : `${previewPanelWidth}px`) : undefined,
            paddingLeft: 'calc(20rem + 2rem)',
          }}
        >
          <div className="min-h-[calc(100vh-64px)]">
            <FormPanel
              form={form}
              onSubmit={handleFormSubmit}
              isLoading={isLoading}
              works={works}
              employees={employees}
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
            />
          </div>
        </main>
      </div>

      {showPreview && (
        <DocumentPreviewPanel
          formData={liveFormData}
          analysisData={analysis}
          equipmentData={equipment}
          company={company}
          error={analysis?.proceduralSteps?.length ? null : error}
          panelWidth={previewPanelWidth}
          onHide={() => setShowPreview(false)}
          onMinimizedChange={setIsPreviewMinimized}
          onWidthChange={setPreviewPanelWidth}
        />
      )}

      <div className="print-only">
        <PrintPreview
          formData={liveFormData}
          analysisData={analysis}
          equipmentData={equipment}
          company={company}
          error={analysis?.proceduralSteps?.length ? null : error}
        />
      </div>

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
              className="rounded-md border-[#ccb4a6] text-[#584237] hover:bg-[#fff4e8]"
            >
              Continuar sem salvar
            </Button>
            <Button
              type="button"
              onClick={handleSaveAndContinue}
              disabled={isSavingDraft}
              className="rounded-md bg-[#f46e11] text-white hover:bg-[#e96710]"
            >
              {isSavingDraft ? 'Salvando...' : 'Salvar rascunho'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
