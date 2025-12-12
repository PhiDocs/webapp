'use client';

import { useState } from 'react';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
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
import { generateAPRPages } from '@/lib/pdf/templates/apr';
import { generatePTPages } from '@/lib/pdf/templates/pt';

import './print/print-layout.css';


// PDF Generation Function (Client-Side)
async function generatePdfOnClient(
  formData: SafetyFormValues,
  analysisData: SafetyAnalysisOutput | null,
  equipmentData: ProtectiveEquipmentOutput | null
): Promise<{ fileName: string; dataUrl: string }> {
  
  // Dynamically import pdfmake and fonts ONLY on the client when the function is called.
  const pdfmake = await import('pdfmake/build/pdfmake');
  const pdfFonts = await import('pdfmake/build/vfs_fonts');
  pdfmake.vfs = pdfFonts.pdfMake.vfs;

  return new Promise((resolve, reject) => {
    try {
      
      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageMargins: [25, 25, 25, 40], // [left, top, right, bottom]
        
        content: formData.documentType === DOCUMENT_TYPES.APR
            ? generateAPRPages(formData, analysisData, equipmentData)
            : generatePTPages(formData),

        footer: function (currentPage, pageCount) {
            return {
                columns: [
                    { text: formData.companyName || 'Safety Docs AI', alignment: 'left', margin: [25, 0, 0, 0] },
                    { text: `${currentPage} / ${pageCount}`, alignment: 'right', margin: [0, 0, 25, 0] }
                ],
                fontSize: 8,
                color: '#555',
                margin: [0, 20, 0, 0],
            };
        },
        styles: {
            h1: { fontSize: 16, bold: true },
            sectionTitle: { fontSize: 10, bold: true, background: '#E0E0E0', color: '#000', alignment: 'center', margin: [0, 0, 0, 0], fillColor: '#e0e0e0' },
            th: { bold: true, fontSize: 9, alignment: 'center', fillColor: '#f2f2f2' },
            thHeader: { bold: true, fontSize: 7, alignment: 'center' },
            label: { bold: true, fontSize: 7, textTransform: 'uppercase', color: '#555' },
            value: { fontSize: 9 },
            td: { fontSize: 9, alignment: 'left' },
            tdSmall: { fontSize: 8, alignment: 'left' },
            listItem: { fontSize: 9, margin: [0, 0, 0, 2] },
            cellPadding: { margin: [5, 5, 5, 5] },
        },
        defaultStyle: {
            fontSize: 10,
            lineHeight: 1.15,
            color: '#333',
            alignment: 'left'
        },
        layout: {
            sectionLayout: {
                 hLineWidth: () => 0.5,
                 vLineWidth: () => 0.5,
                 hLineColor: () => '#ccc',
                 vLineColor: () => '#ccc',
                 paddingLeft: () => 0,
                 paddingRight: () => 0,
                 paddingTop: (i, node) => i === 0 ? 0 : 5,
                 paddingBottom: () => 5,
            },
            boxLayout: {
                hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 0.5 : 0.5,
                vLineWidth: (i, node) => (i === 0 || i === node.table.widths?.length) ? 0.5 : 0.5,
                hLineColor: () => '#ccc',
                vLineColor: () => '#ccc',
                paddingLeft: (i) => 5,
                paddingRight: (i, node) => 5,
                paddingTop: () => 4,
                paddingBottom: () => 4,
            },
        }
      };

      const docName = formData.documentType === DOCUMENT_TYPES.APR ? DOCUMENT_TYPES.APR : DOCUMENT_TYPES.PT;
      const fileName = `${docName}-${(formData.companyName || 'doc').replace(/ /g, "_")}-${new Date().toLocaleDateString('pt-br').replace(/\//g, '-')}.pdf`;

      const pdfDoc = pdfmake.createPdf(docDefinition);
      
      pdfDoc.getDataUrl((dataUrl) => {
        resolve({ fileName, dataUrl });
      }, (err) => {
        reject(err);
      });

    } catch (error) {
      console.error("Error during PDF document definition:", error);
      reject(error);
    }
  });
}


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

  const handleGeneratePdf = async () => {
    const formData = form.getValues();
     const parsedData = formSchema.safeParse(formData);

    if (!parsedData.success) {
      const errorMessage = parsedData.error.errors.map((e) => e.message).join(', ');
      toast({
        variant: 'destructive',
        title: ptBr.validations.invalidFormData.split(':')[0],
        description: errorMessage,
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

    setIsDownloading(true);
    try {
      // Generate PDF on the client
      const { fileName, dataUrl } = await generatePdfOnClient(parsedData.data, analysis, equipment);
      
      const payload = {
        event: N8N_EVENTS.PDF_GENERATED,
        documentType: formData.documentType,
        fileName,
        pdfDataUrl: dataUrl,
        formData: formData,
        analysisData: analysis,
        equipmentData: equipment,
      };

      // Notify n8n in the background
      await notifyN8n(payload);
      
      // Trigger download
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
