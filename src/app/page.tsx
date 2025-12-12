'use client';

import { useState } from 'react';
import type { SafetyAnalysisOutput } from '@/ai/flows/generateSafetyAnalysis';
import type { ProtectiveEquipmentOutput } from '@/ai/flows/recommendProtectiveEquipment';
import type { SafetyFormValues } from '@/lib/types';
import { getSafetyAnalysis, getProtectiveEquipment } from '@/server/ai-actions';
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
import { PrintPreview } from '@/components/print-preview';
import { generatePdfOnClient } from '@/lib/pdf/generator';

import './print/print-layout.css';


export default function Home() {
  const [analysis, setAnalysis] = useState<SafetyAnalysisOutput | null>({
    proceduralSteps: [
        {
            "item": 1,
            "activity": "Verificação e Isolamento da Área",
            "potentialRisks": "Acesso de pessoas não autorizadas, queda de materiais.",
            "preventiveMeasures": "Isolar a área com fita zebrada e cones. Instalar telas de proteção na fachada. Todos os trabalhadores devem usar capacete com jugular."
        },
        {
            "item": 2,
            "activity": "Montagem da Base do Andaime",
            "potentialRisks": "Instabilidade do equipamento, tombamento.",
            "preventiveMeasures": "Verificar nivelamento do solo. Utilizar sapatas de apoio adequadas. Inspecionar todos os componentes antes da montagem."
        },
        {
            "item": 3,
            "activity": "Içamento de Peças e Plataformas",
            "potentialRisks": "Queda de peças, esforço excessivo.",
            "preventiveMeasures": "Utilizar sistema de roldanas ou guincho para içar materiais. Amarrar todas as ferramentas. Proibido arremessar peças."
        }
    ]
  });
  const [equipment, setEquipment] = useState<ProtectiveEquipmentOutput | null>({
    "epiItems": [
        "Capacete de segurança com jugular",
        "Botas de segurança com biqueira de aço",
        "Luvas de raspa",
        "Cinto de segurança tipo paraquedista com duplo talabarte"
    ],
    "epiNote": "Todos os Equipamentos de Proteção Individual (EPI), devem atender os requisitos da NR06, estar válidos e em conformidade com os órgãos fiscalizadores para utilização na atividade.",
    "epcItems": [
        "Guarda-corpo e rodapé no andaime",
        "Telas de proteção (fachadeiro)",
        "Sinalização de segurança (cones, fitas)",
        "Linha de vida"
    ],
    "epcNote": "Todos os Equipamentos de Proteção Coletiva (EPC), devem ser verificados quanto a integridade e conformidade com o projeto específico antes de iniciar a atividade."
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
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

    try {
      const [analysisResult, equipmentResult] = await Promise.all([
          getSafetyAnalysis({ activityDescription: data.activityDescription! }),
          getProtectiveEquipment({ activityDescription: data.activityDescription! })
      ]);

      if (analysisResult.error || !analysisResult.data) {
        const errorMsg = analysisResult.error || ptBr.validations.safetyAnalysisFailed;
        setError(errorMsg);
        toast({
            variant: 'destructive',
            title: ptBr.toasts.errors.fetchAnalysis,
            description: errorMsg,
        });
      } else {
        setAnalysis(analysisResult.data);
      }
      
      if (equipmentResult.error || !equipmentResult.data) {
          const errorMsg = equipmentResult.error || ptBr.validations.equipmentRecommendationFailed;
          console.error(errorMsg);
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
    setAnalysis(null);
    setEquipment(null);
    setError(null);
    form.reset();
  };

  const handlePrint = () => {
    const formData = form.getValues();
    const parsedData = formSchema.safeParse(formData);

    if (!parsedData.success) {
      const errorMessages = parsedData.error.errors.map(err => `${err.path.join('.')} - ${err.message}`).join('; ');
      toast({
        variant: 'destructive',
        title: ptBr.validations.invalidFormData.split(':')[0],
        description: errorMessages,
      });
      return;
    }

    if (formData.documentType === DOCUMENT_TYPES.APR && !analysis) {
      toast({
        variant: 'destructive',
        title: ptBr.toasts.errors.noAnalysis,
        description: ptBr.toasts.errors.noAnalysisDescription,
      });
      return;
    }

    setIsPrinting(true);

    generatePdfOnClient();

    // Fire-and-forget notification to n8n
    try {
      const payload = {
        event: N8N_EVENTS.PDF_GENERATED,
        documentType: formData.documentType,
        formData: formData,
        analysisData: analysis,
        equipmentData: equipment,
      };
      notifyN8n(payload);

      toast({
        title: ptBr.toasts.success.pdfDownloaded,
        description: ptBr.toasts.success.pdfDownloadedDescription,
      });
    } catch (error: any) {
      console.error(ptBr.errors.n8nCheckUrl, error);
      // Don't show an error toast for n8n failure, as it's a background task
    } finally {
      // Use a timeout to allow the print dialog to appear before resetting state
      setTimeout(() => setIsPrinting(false), 2000);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col no-print">
        <Header
          className="no-print"
          mobileView={mobileView}
          setMobileView={setMobileView}
          onGeneratePdf={handlePrint}
          isDownloading={isPrinting}
          isAprReady={!!(liveFormData.documentType === DOCUMENT_TYPES.APR && analysis)}
          isPtReady={liveFormData.documentType === DOCUMENT_TYPES.PT}
        />

        <main className="flex-grow grid grid-cols-1 xl:grid-cols-2 h-[calc(100vh-65px)]">
          <div className="h-full">
              <FormPanel
                  form={form}
                  onNewReport={handleNewReport}
                  onSubmit={handleFormSubmit}
                  isLoading={isLoading}
                  mobileView={mobileView}
              />
          </div>
          <div className="h-full">
              <PreviewPanel
                  isLoading={isLoading}
                  error={error}
                  liveFormData={liveFormData}
                  analysisData={analysis}
                  equipmentData={equipment}
                  mobileView={mobileView}
                  isDownloading={isPrinting}
                  onGeneratePdf={handlePrint}
                  isAprReady={!!(liveFormData.documentType === DOCUMENT_TYPES.APR && analysis)}
                  isPtReady={liveFormData.documentType === DOCUMENT_TYPES.PT}
              />
          </div>
        </main>
      </div>
      <div className="print-only">
        <PrintPreview
          formData={liveFormData}
          analysisData={analysis}
          equipmentData={equipment}
        />
      </div>
    </>
  );
}
