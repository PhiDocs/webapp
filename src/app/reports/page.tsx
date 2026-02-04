'use client';

import { useState, useEffect, useMemo } from 'react';
import type { SafetyAnalysisOutput, ProtectiveEquipmentOutput } from '@/server/ai-actions';
import type { SafetyFormValues, Work, Employee, Company } from '@/lib/types';
import { getSafetyAnalysis, getProtectiveEquipment } from '@/server/ai-actions';
import { notifyN8n } from '@/server/n8n-actions';
import { sendDocumentForSignature } from '@/server/signature-actions';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formSchema } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/header';
import { FormPanel } from '@/components/form-panel';
import { PreviewPanel } from '@/components/preview-panel';
import { ptBr } from '@/lib/data/strings';
import { DOCUMENT_TYPES, N8N_EVENTS, PT_FIT_STATUS, SIGNATURE_TYPES } from '@/lib/constants';
import { PrintPreview } from '@/components/print-preview';
import { UserNav } from '@/components/auth/user-nav';
import { useSession } from '@/components/auth/session-provider';
import { getWorks } from '@/server/work-actions';
import { getEmployees } from '@/server/employee-actions';
import { getCompanyById } from '@/server/company-actions';
import { FloatingPreview } from '@/components/floating-preview';

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
  const [equipment, setEquipment] = useState<ProtectiveEquipmentOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingSignature, setIsSendingSignature] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form');

  const [company, setCompany] = useState<Company | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { toast } = useToast();
  const [showFloatingPreview, setShowFloatingPreview] = useState(true);
  const [isPreviewMinimized, setIsPreviewMinimized] = useState(false);

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
          signatureType: SIGNATURE_TYPES.TYPED,
          signatureData: '',
          email: '',
          phone: '',
          useAssinafy: false,
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
        ptGestorArea: { name: '', signatureType: SIGNATURE_TYPES.TYPED, signatureData: '' },
        ptResponsavelAtividade: { name: '', signatureType: SIGNATURE_TYPES.TYPED, signatureData: '' },
        ptSesmt: { name: '', signatureType: SIGNATURE_TYPES.TYPED, signatureData: '' },
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
    if (user?.companyId) {
      const fetchData = async () => {
        setIsDataLoading(true);
        try {
          const [companyResult, worksResult, employeesResult] = await Promise.all([
            getCompanyById(user.companyId!),
            getWorks(user.companyId!),
            getEmployees(user.companyId!)
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
          toast({ variant: 'destructive', title: "Erro ao carregar dados da empresa", description: error.message });
        } finally {
          setIsDataLoading(false);
        }
      };
      fetchData();
    } else if (user && !user.companyId) {
      toast({ variant: 'destructive', title: "Usuário sem empresa", description: "Sua conta não está associada a uma empresa." });
      setIsDataLoading(false);
    }
  }, [user, toast]);


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
    setMobileView('preview');
  };

  const handleNewReport = () => {
    setEquipment(null);
    setError(null);
    form.reset();
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    toast({ title: ptBr.actions.generatingPdf });

    try {
      const formData = form.getValues();
      const payload = {
        event: N8N_EVENTS.PDF_GENERATED,
        documentType: formData.documentType,
        company,
        formData,
        analysisData: analysis,
        equipmentData: equipment,
      };

      // Notify n8n in parallel
      if (company?.n8nProductionUrl) {
        notifyN8n(payload, company.n8nProductionUrl).catch(err => console.error("N8N notification failed:", err));
      }

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Falha ao decodificar a resposta de erro do servidor.' }));
        throw new Error(errorData.error || 'Falha ao gerar o PDF no servidor.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = `documento_seguranca_${new Date().toISOString().split('T')[0]}.pdf`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast({ title: ptBr.toasts.success.pdfDownloaded });

    } catch (error: any) {
      console.error("Failed to generate or download PDF:", error);
      toast({
        variant: 'destructive',
        title: ptBr.toasts.errors.pdfError,
        description: error.message,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendForSignature = async () => {
    setIsSendingSignature(true);
    try {
      const formData = form.getValues();
      const result = await sendDocumentForSignature({
        formData,
        analysisData: analysis,
        equipmentData: equipment,
        company,
      });

      if (!result.success) {
        throw new Error(result.error || 'Falha ao enviar para assinatura.');
      }

      toast({
        title: ptBr.toasts.success.signatureSent,
        description: ptBr.toasts.success.signatureSentDescription,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: ptBr.toasts.errors.signatureSendFailed,
        description: error.message,
      });
    } finally {
      setIsSendingSignature(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col no-print">
        <Header
          mobileView={mobileView}
          setMobileView={setMobileView}
        >
          <UserNav />
        </Header>

        <main className={`flex-grow h-[calc(100vh-65px)] transition-all duration-300 ${showFloatingPreview ? (isPreviewMinimized ? 'mr-16' : 'mr-[500px]') : 'mr-0'
          }`}>
          <FormPanel
            form={form}
            onNewReport={handleNewReport}
            onSubmit={handleFormSubmit}
            isLoading={isLoading}
            mobileView={mobileView}
            works={works}
            employees={employees}
            isDataLoading={isDataLoading}
            showFloatingPreview={showFloatingPreview}
            onToggleFloatingPreview={() => setShowFloatingPreview(!showFloatingPreview)}
          />
          <PreviewPanel
            isLoading={isLoading}
            error={analysis?.proceduralSteps?.length ? null : error}
            liveFormData={liveFormData}
            analysisData={analysis}
            equipmentData={equipment}
            company={company}
            mobileView={mobileView}
            isDownloading={isDownloading}
            onGeneratePdf={handleDownloadPdf}
            isSendingSignature={isSendingSignature}
            onSendForSignature={handleSendForSignature}
            isAprReady={!!(liveFormData.documentType === DOCUMENT_TYPES.APR && analysis?.proceduralSteps?.length)}
            isPtReady={liveFormData.documentType === DOCUMENT_TYPES.PT}
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
