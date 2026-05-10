'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo, useRef } from 'react';
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
import { PrintPreview } from '@/components/print-preview';
import { UserNav } from '@/components/auth/user-nav';
import { useSession } from '@/components/auth/session-provider';
import { getWorks } from '@/server/work-actions';
import { getEmployees } from '@/server/employee-actions';
import { getCompanyById } from '@/server/company-actions';
import { DocumentPreviewPanel } from '@/components/document-preview-panel';
import { Bell, Briefcase, CircleHelp, HardHat, LogOut, Plus, Settings, Shield, UserCog, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { createSupabaseBrowserClient } from '@/supabase/browser';
import { signOut } from '@/server/auth-actions';

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

const adminNavItems = [
  { label: 'Obras', icon: HardHat, section: 'works' },
  { label: 'Funcionarios', icon: Users, section: 'employees' },
  { label: 'Cargos', icon: Shield, section: 'jobRoles' },
  { label: 'Terceirizadas', icon: UserCog, section: 'subcontractors' },
  { label: 'Configuracoes', icon: Settings, section: 'settings' },
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
      return;
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
    } catch (saveError: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: saveError.message });
    } finally {
      setIsSavingDraft(false);
    }
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

  const companyPanelHref = (section: (typeof adminNavItems)[number]['section']) =>
    user?.companyId ? `/company/${user.companyId}?section=${section}` : '#';

  return (
    <>
      <div className="no-print min-h-screen bg-[#f7f9fc]">
        <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center border-b border-[#e6cfc1] bg-[#f8f8f8] px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="font-headline text-h3 tracking-tight text-[#9e4300]">PhiDocs</span>
            <nav className="ml-10 hidden items-center gap-10 md:flex text-body-md text-[#584237]">
              <Link href="/reports" className="border-b-2 border-[#9e4300] pb-1 font-semibold text-[#9e4300]">
                Relatorios
              </Link>
              <Link href="/documents" className="transition-colors hover:text-[#b74813]">
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

         <aside className="fixed inset-y-0 left-0 top-16 z-20 hidden w-64 flex-col border-r border-[#e6cfc1] bg-[#f3f4f6] lg:flex">
          <div className="px-4 py-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-12 w-auto items-center justify-center rounded bg-white px-2 shadow-sm">
                <span className="text-[8px] font-bold text-[#f46e11]">Phi</span>
              </div>
              <span className="font-code text-code-label text-[#1f2b3e]">PhiDocs</span>
            </div>
            <h1 className="font-headline text-h3 text-[#191c1e]">Gestao PhiDocs</h1>
            <p className="mt-1 text-body-sm italic text-[#4f5f7a]">AI Safety &amp; Compliance</p>
          </div>

          <nav className="flex-1 px-2">
            <ul className="space-y-1.5">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <Link
                      href={companyPanelHref(item.section)}
                      className="flex items-center gap-4 rounded-md px-4 py-3 text-body-sm text-[#4f5f7a] transition-colors hover:bg-[#e6e8eb] hover:text-[#191c1e]"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-auto border-t border-[#e0c0b1] px-4 py-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="h-12 w-full rounded-md bg-[#f46e11] font-semibold text-white hover:bg-[#e96710]">
                  <Plus className="h-4 w-4" />
                  Novo Relatorio
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{ptBr.formPanel.newReportConfirmation.title}</AlertDialogTitle>
                  <AlertDialogDescription>{ptBr.formPanel.newReportConfirmation.description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{ptBr.actions.cancel}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleNewReport}>{ptBr.actions.continue}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="mt-6 space-y-1 pb-4">
              <Button variant="ghost" className="w-full justify-start rounded-md px-4 py-3 text-body-sm text-[#4f5f7a] hover:bg-[#e6e8eb] hover:text-[#191c1e]">
                <CircleHelp className="h-4 w-4" />
                Suporte
              </Button>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="w-full justify-start rounded-md px-4 py-3 text-body-sm text-[#4f5f7a] hover:bg-[#e6e8eb] hover:text-[#191c1e]"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </aside>

        <main
          className="pt-16 transition-all duration-300 lg:pl-64"
          style={{
            paddingRight: showPreview ? (isPreviewMinimized ? '72px' : `${previewPanelWidth}px`) : undefined,
            paddingLeft: 'calc(16rem + 2rem)',
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
    </>
  );
}
