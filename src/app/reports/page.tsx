'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { SafetyAnalysisOutput, ProtectiveEquipmentOutput } from '@/server/ai-actions';
import type { SafetyFormValues, Work, Employee, Company } from '@/lib/types';
import { getSafetyAnalysis, getProtectiveEquipment } from '@/server/ai-actions';

import { sendDocumentForSignature } from '@/server/signature-actions';
import { saveDocument, markDocumentAsSent, markDocumentAsCompleted, getDocument } from '@/server/document-actions';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formSchema } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/header';
import { FormPanel } from '@/components/form-panel';
import { ptBr } from '@/lib/data/strings';
import { DOCUMENT_TYPES, PT_FIT_STATUS } from '@/lib/constants';
import { PrintPreview } from '@/components/print-preview';
import { UserNav } from '@/components/auth/user-nav';
import { useSession } from '@/components/auth/session-provider';
import { getWorks } from '@/server/work-actions';
import { getEmployees } from '@/server/employee-actions';
import { getCompanyById } from '@/server/company-actions';
import { FloatingPreview } from '@/components/floating-preview';
import {
  trackApiError,
  trackFormClearedAfterDownload,
  trackPdfDownloaded,
  trackSignatureSent,
} from '@/lib/telemetry/events';
import { reportClientError } from '@/lib/telemetry/crash-reporter';

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

export default function ReportsPage() {
  const { user } = useSession();
  const activeCompanyId = user?.activeCompanyId ?? user?.companyId;
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
  const { toast } = useToast();
  const [showFloatingPreview, setShowFloatingPreview] = useState(true);
  const [isPreviewMinimized, setIsPreviewMinimized] = useState(false);

  const form = useForm<SafetyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentType: DOCUMENT_TYPES.APR,
      documentNumber: '',
      revisionNumber: 1,
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
        }
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
  const analysis = useMemo(
    () => normalizeAnalysisSteps(watchedAnalysisSteps),
    [watchedAnalysisSteps]
  );


  useEffect(() => {
    if (activeCompanyId) {
      const fetchData = async () => {
        setIsDataLoading(true);
        try {
          const [companyResult, worksResult, employeesResult] = await Promise.all([
            getCompanyById(activeCompanyId),
            getWorks(activeCompanyId),
            getEmployees(activeCompanyId)
          ]);
          if (companyResult.success && companyResult.data) {
            setCompany(companyResult.data);
          } else {
            toast({ variant: 'destructive', title: "Erro ao buscar dados da empresa", description: companyResult.error });
          }
          if (worksResult.success && worksResult.data) {
            setWorks(worksResult.data);
          } else {
            toast({ variant: 'destructive', title: "Erro ao buscar obras", description: worksResult.error });
          }
          if (employeesResult.success && employeesResult.data) {
            setEmployees(employeesResult.data);
          } else {
            toast({ variant: 'destructive', title: "Erro ao buscar funcionários", description: employeesResult.error });
          }
        } catch (error: any) {
          const message = error?.message || 'Erro ao carregar dados da empresa';
          trackApiError({ context: 'reports_fetch_company_data', message });
          reportClientError({
            source: 'manual',
            context: 'reports_fetch_company_data',
            message,
            stack: error?.stack,
          });
          toast({ variant: 'destructive', title: "Erro ao carregar dados da empresa", description: error.message });
        } finally {
          setIsDataLoading(false);
        }
      };
      fetchData();
    } else if (user && !activeCompanyId) {
      toast({ variant: 'destructive', title: "Usuário sem empresa", description: "Sua conta não está associada a uma empresa." });
      setIsDataLoading(false);
    }
  }, [activeCompanyId, user, toast]);

  // Carregar documento salvo via query param
  const draftLoadedRef = useRef<string | null>(null);
  useEffect(() => {
    const documentId = searchParams.get('documentId');
    if (!documentId || draftLoadedRef.current === documentId) return;
    draftLoadedRef.current = documentId;

    (async () => {
      try {
        console.log('[loadDraft] Loading document:', documentId);
        const result = await getDocument(documentId);
        console.log('[loadDraft] Result:', result.success, result.data ? 'has data' : 'no data');
        if (result.success && result.data) {
          const doc = result.data;
          setCurrentDocumentId(doc.id);

          // Converter null → undefined para compatibilidade com React Hook Form
          const cleanFormData = JSON.parse(
            JSON.stringify(doc.formData, (_, v) => (v === null ? undefined : v))
          );

          console.log('[loadDraft] Restoring formData:', JSON.stringify(cleanFormData).substring(0, 200));

          // Restaurar formulário completo
          form.reset(cleanFormData);

          // Restaurar análise (sobrescreve analysisSteps do formData com os da análise salva)
          if (doc.analysisData?.proceduralSteps?.length) {
            form.setValue('analysisSteps', doc.analysisData.proceduralSteps, { shouldDirty: true });
          }

          // Restaurar equipamentos
          if (doc.equipmentData) {
            setEquipment(doc.equipmentData);
          }

          toast({ title: 'Documento carregado', description: `"${doc.documentName}" foi carregado.` });
        } else {
          console.error('[loadDraft] Failed:', result.error);
          toast({ variant: 'destructive', title: 'Erro ao carregar documento', description: result.error || 'Documento não encontrado.' });
        }
      } catch (e) {
        console.error('[loadDraft] Exception:', e);
        const message = e instanceof Error ? e.message : 'Erro inesperado ao carregar documento';
        trackApiError({ context: 'reports_load_draft', message });
        reportClientError({
          source: 'manual',
          context: 'reports_load_draft',
          message,
          stack: e instanceof Error ? e.stack : undefined,
        });
        toast({ variant: 'destructive', title: 'Erro ao carregar documento', description: 'Erro inesperado ao carregar o documento.' });
      }
    })();
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFormSubmit = async (data: SafetyFormValues) => {
    if (data.documentType !== DOCUMENT_TYPES.APR) return;

    setIsLoading(true);
    setError(null);
    setEquipment(null);

    try {
      const manualNormalized = normalizeAnalysisSteps(form.getValues('analysisSteps'));
      const [analysisResult, equipmentResult] = await Promise.all([
        getSafetyAnalysis({ activityDescription: data.activityDescription! }),
        getProtectiveEquipment({ activityDescription: data.activityDescription! })
      ]);

      if (analysisResult.error || !analysisResult.data) {
        const errorMsg = analysisResult.error || ptBr.validations.safetyAnalysisFailed;
        if (!manualNormalized) {
          setError(errorMsg);
        }
        toast({
          variant: 'destructive',
          title: ptBr.toasts.errors.fetchAnalysis,
          description: errorMsg,
        });
      } else {
        const manualSteps = manualNormalized?.proceduralSteps ?? [];
        const merged = [...manualSteps, ...analysisResult.data.proceduralSteps]
          .map((step, index) => ({
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
        toast({
          variant: 'destructive',
          title: ptBr.toasts.errors.fetchEpi,
          description: errorMsg,
        });
      } else {
        setEquipment(equipmentResult.data);
      }
    } catch (e: any) {
      const errorMsg = e.message || ptBr.errors.unexpectedError;
      setError(errorMsg);
      toast({
        variant: 'destructive',
        title: ptBr.toasts.errors.fetchAnalysis,
        description: errorMsg,
      });
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

  const saveCurrentFormOrThrow = useCallback(async () => {
    if (!company?.id) {
      throw new Error('Empresa não identificada.');
    }

    const formData = form.getValues();
    const result = await saveDocument({
      companyId: company.id,
      documentId: currentDocumentId || undefined,
      formData,
      analysisData: analysis,
      equipmentData: equipment,
    });

    if (!result.success || !result.documentId) {
      throw new Error(result.error || 'Falha ao salvar documento.');
    }

    setCurrentDocumentId(result.documentId);

    const persisted = await getDocument(result.documentId);
    if (persisted.success && persisted.data) {
      const persistedFormData = persisted.data.formData;
      form.reset(persistedFormData);
      return { formData: persistedFormData, documentId: result.documentId };
    }

    return { formData, documentId: result.documentId };
  }, [analysis, company?.id, currentDocumentId, equipment, form]);


  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      await saveCurrentFormOrThrow();

      toast({
        title: 'Rascunho salvo',
        description: 'O documento foi salvo com sucesso.',
      });
    } catch (error: any) {
      const message = error?.message || 'Falha ao salvar rascunho';
      trackApiError({ context: 'reports_save_draft', message });
      reportClientError({
        source: 'manual',
        context: 'reports_save_draft',
        message,
        stack: error?.stack,
      });
      console.error('[saveDraft] Error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message,
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSendForSignature = async () => {
    setIsSendingSignature(true);
    try {
      // 1. Salvar o documento no banco antes de enviar (obrigatório)
      const { formData, documentId } = await saveCurrentFormOrThrow();

      // 2. Enviar para assinatura
      const result = await sendDocumentForSignature({
        formData,
        analysisData: analysis,
        equipmentData: equipment,
        company,
      });

      if (!result.success) {
        throw new Error(result.error || 'Falha ao enviar para assinatura.');
      }

      // 3. Marcar documento como enviado
      if (result.signatureDocumentId) {
        await markDocumentAsSent(documentId, result.signatureDocumentId);
      }

      trackSignatureSent({
        documentType: formData.documentType,
        documentId,
        companyId: company?.id,
        signerCount: (formData.responsiblePersons?.length ?? 0) + (formData.teamMembers?.length ?? 0),
      });

      // Limpar estado após envio bem-sucedido
      setCurrentDocumentId(null);
      draftLoadedRef.current = null;
      router.replace('/reports', { scroll: false });

      toast({
        title: ptBr.toasts.success.signatureSent,
        description: ptBr.toasts.success.signatureSentDescription,
      });
    } catch (error: any) {
      const message = error?.message || 'Falha ao enviar para assinatura';
      trackApiError({ context: 'reports_send_for_signature', message });
      reportClientError({
        source: 'manual',
        context: 'reports_send_for_signature',
        message,
        stack: error?.stack,
      });
      toast({
        variant: 'destructive',
        title: ptBr.toasts.errors.signatureSendFailed,
        description: error.message,
      });
    } finally {
      setIsSendingSignature(false);
    }
  };

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      // Sempre persistir antes de gerar PDF para manter histórico
      const { formData, documentId } = await saveCurrentFormOrThrow();

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData,
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
        } catch {
          // ignore json parse error
        }
        throw new Error(`${ptBr.errors.pdfGenerationFailed}${details}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const disposition = response.headers.get('content-disposition') || '';
      const fileNameMatch = disposition.match(/filename="([^"]+)"/i);
      link.download = fileNameMatch?.[1] || 'documento_seguranca.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast({
        title: ptBr.toasts.success.pdfDownloaded,
        description: ptBr.toasts.success.pdfDownloadedDescription,
      });

      await markDocumentAsCompleted(documentId);

      trackPdfDownloaded({
        documentType: formData.documentType,
        documentId,
        companyId: company?.id,
      });

      // Após download bem-sucedido, limpar formulário para novo preenchimento
      handleNewReport();
      trackFormClearedAfterDownload({
        documentId,
        companyId: company?.id,
      });
    } catch (error: any) {
      const message = error?.message || 'Falha ao gerar PDF';
      trackApiError({ context: 'reports_generate_pdf', message });
      reportClientError({
        source: 'manual',
        context: 'reports_generate_pdf',
        message,
        stack: error?.stack,
      });
      toast({
        variant: 'destructive',
        title: ptBr.toasts.errors.pdfError,
        description: error?.message || ptBr.toasts.errors.pdfErrorDescription,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col no-print">
        <Header>
          <UserNav />
        </Header>

        <main className={`flex-grow h-[calc(100vh-65px)] transition-all duration-300 ${showFloatingPreview ? (isPreviewMinimized ? 'mr-16' : 'mr-[500px]') : 'mr-0'
          }`}>
          <FormPanel
            form={form}
            onNewReport={handleNewReport}
            onSubmit={handleFormSubmit}
            isLoading={isLoading}
            works={works}
            employees={employees}
            companyId={activeCompanyId}
            isDataLoading={isDataLoading}
            showFloatingPreview={showFloatingPreview}
            onToggleFloatingPreview={() => setShowFloatingPreview(!showFloatingPreview)}
            isSendingSignature={isSendingSignature}
            onSendForSignature={handleSendForSignature}
            canSendSignature={liveFormData.documentType === DOCUMENT_TYPES.APR || liveFormData.documentType === DOCUMENT_TYPES.PT}
            isGeneratingPdf={isGeneratingPdf}
            onGeneratePdf={handleGeneratePdf}
            isSavingDraft={isSavingDraft}
            onSaveDraft={handleSaveDraft}
          />
        </main>
      </div>

      {/* Floating Preview Panel */}
      {showFloatingPreview && (
        <FloatingPreview
          formData={liveFormData}
          analysisData={analysis}
          equipmentData={equipment}
          company={company}
          error={analysis?.proceduralSteps?.length ? null : error}
          onClose={() => setShowFloatingPreview(false)}
          onMinimizedChange={setIsPreviewMinimized}
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
