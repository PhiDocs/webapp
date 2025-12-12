'use client';

import { useState } from 'react';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import type { ProtectiveEquipmentOutput } from '@/ai/flows/recommend-protective-equipment';
import type { SafetyFormValues } from '@/lib/types';
import { getSafetyAnalysis, getProtectiveEquipment } from '@/server/ai-actions';
import { generatePdfOnServer } from '@/server/pdf-actions';
import { notifyN8n } from '@/server/n8n-actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formSchema } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/header';
import { FormPanel } from '@/components/form-panel';
import { PreviewPanel } from '@/components/preview-panel';
import { ptBr } from '@/lib/data/strings';
import { DOCUMENT_TYPES, N8N_EVENTS, PT_FIT_STATUS, SIGNATURE_TYPES } from '@/lib/constants';

import './print/print-layout.css';

export default function Home() {
  const [analysis, setAnalysis] = useState<SafetyAnalysisOutput | null>(null);
  const [equipment, setEquipment] = useState<ProtectiveEquipmentOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form');

  const form = useForm<SafetyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentType: DOCUMENT_TYPES.APR,
      companyName: ptBr.defaultValues.companyName,
      workName: ptBr.defaultValues.workName,
      workAddress: ptBr.defaultValues.workAddress,
      startDate: '2024-08-01',
      endDate: '2024-12-31',
      workLocationDetails: ptBr.defaultValues.workLocationDetails,
      activityDescription: ptBr.defaultValues.activityDescription,
      responsiblePersons: [
        { name: ptBr.defaultValues.responsible1Name, role: ptBr.defaultValues.responsible1Role, signatureType: SIGNATURE_TYPES.TYPED, signatureData: ptBr.defaultValues.responsible1Name },
        { name: ptBr.defaultValues.responsible2Name, role: ptBr.defaultValues.responsible2Role, signatureType: SIGNATURE_TYPES.TYPED, signatureData: ptBr.defaultValues.responsible2Name }
      ],
      teamMembers: [
        { date: '2024-08-01', name: ptBr.defaultValues.teamMember1Name, role: ptBr.defaultValues.teamMember1Role },
        { date: '2024-08-01', name: ptBr.defaultValues.teamMember2Name, role: ptBr.defaultValues.teamMember2Role },
      ],
      pt: {
        ptLocalAtividade: ptBr.defaultValues.ptLocation,
        ptEquipamentoLinha: ptBr.defaultValues.ptEquipment,
        ptData: new Date().toISOString().split('T')[0],
        ptHoraInicio: '09:00',
        ptHoraFim: '17:00',
        ptDescricaoTarefa: ptBr.defaultValues.ptTaskDescription,
        ptChecklist: {
          trabalho_frio: true,
          eletricidade: true,
          ferramentas_manuais: true,
          parar_drenar: true,
          bloqueio_eqptos: true,
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
        ptColaboradores: [
            { name: ptBr.defaultValues.collaborator1Name, rgCpf: ptBr.defaultValues.collaborator1Rg, func: ptBr.defaultValues.collaborator1Func, empresa: ptBr.defaultValues.collaborator1Company, apto: PT_FIT_STATUS.YES }
        ],
        ptVigias: [],
        ptResgatistas: [],
        ptGestorArea: {name: ptBr.defaultValues.areaManagerName, signatureType: SIGNATURE_TYPES.TYPED, signatureData: ptBr.defaultValues.areaManagerName},
        ptResponsavelAtividade: {name: ptBr.defaultValues.activityResponsibleName, signatureType: SIGNATURE_TYPES.TYPED, signatureData: ptBr.defaultValues.activityResponsibleName},
        ptSesmt: {name: ptBr.defaultValues.sesmtName, signatureType: SIGNATURE_TYPES.TYPED, signatureData: ptBr.defaultValues.sesmtName},
      },
    },
    mode: 'onChange',
  });

  const liveFormData = form.watch();
  const { toast } = useToast();

  const handleFormSubmit = async (data: SafetyFormValues) => {
    if (data.documentType !== DOCUMENT_TYPES.APR) return;

    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setEquipment(null);

    const [analysisResult, equipmentResult] = await Promise.all([
        getSafetyAnalysis({ activityDescription: data.activityDescription! }),
        getProtectiveEquipment({ activityDescription: data.activityDescription! })
    ]);

    if (analysisResult.error || !analysisResult.data) {
      setError(analysisResult.error || ptBr.validations.safetyAnalysisFailed);
    } else {
      setAnalysis(analysisResult.data);
    }
    
    if (equipmentResult.error || !equipmentResult.data) {
        console.error(equipmentResult.error);
        toast({
            variant: 'destructive',
            title: ptBr.toasts.errors.fetchEpi,
            description: equipmentResult.error || ptBr.validations.equipmentRecommendationFailed,
        });
    } else {
        setEquipment(equipmentResult.data);
    }

    setIsLoading(false);
    setMobileView('preview');
  };

  const handleNewReport = () => {
    setAnalysis(null);
    setEquipment(null);
    setError(null);
    form.reset();
  };

  const handleGeneratePdf = async () => {
    const formData = form.getValues();

    if (formData.documentType === DOCUMENT_TYPES.APR && !analysis) {
      toast({
        variant: 'destructive',
        title: ptBr.toasts.errors.noAnalysis,
        description: ptBr.toasts.errors.noAnalysisDescription,
      });
      return;
    }

    setIsDownloading(true);
    try {
      const { fileName, dataUrl, error } = await generatePdfOnServer(formData, analysis, equipment);
      
      if (error || !dataUrl) {
          throw new Error(error || ptBr.errors.pdfGenerationFailed);
      }

      const payload = {
        event: N8N_EVENTS.PDF_GENERATED,
        documentType: formData.documentType,
        fileName,
        pdfDataUrl: dataUrl,
        formData: formData,
        analysisData: analysis,
        equipmentData: equipment,
      };

      await notifyN8n(payload);
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: ptBr.toasts.success.pdfDownloaded,
        description: ptBr.toasts.success.pdfDownloadedDescription,
      });

    } catch (error: any) {
      console.error(ptBr.errors.pdfProcessingError, error);
      toast({
        variant: 'destructive',
        title: ptBr.toasts.errors.pdfError,
        description:
          error.message || ptBr.toasts.errors.pdfErrorDescription,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        mobileView={mobileView}
        setMobileView={setMobileView}
        onGeneratePdf={handleGeneratePdf}
        isDownloading={isDownloading}
        isAprReady={!!(liveFormData.documentType === DOCUMENT_TYPES.APR && analysis)}
        isPtReady={liveFormData.documentType === DOCUMENT_TYPES.PT}
      />

      <main className="flex-grow">
        <div className="grid grid-cols-1 xl:grid-cols-2 h-[calc(100vh-65px)]">
          <FormPanel
            form={form}
            onNewReport={handleNewReport}
            onSubmit={handleFormSubmit}
            isLoading={isLoading}
            mobileView={mobileView}
          />
          <PreviewPanel
            isLoading={isLoading}
            error={error}
            liveFormData={liveFormData}
            analysisData={analysis}
            equipmentData={equipment}
            mobileView={mobileView}
            isDownloading={isDownloading}
            onGeneratePdf={handleGeneratePdf}
            isAprReady={!!(liveFormData.documentType === DOCUMENT_TYPES.APR && analysis)}
            isPtReady={liveFormData.documentType === DOCUMENT_TYPES.PT}
          />
        </div>
      </main>
    </div>
  );
}
