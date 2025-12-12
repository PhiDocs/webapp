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
      documentType: 'APR',
      companyName: 'Engenharia Delta',
      workName: 'Construção Edifício Alpha',
      workAddress: 'Av. Principal, 123, São Paulo, SP',
      startDate: '2024-08-01',
      endDate: '2024-12-31',
      workLocationDetails: 'Todos os pavimentos',
      activityDescription: 'Montagem de andaime para trabalhos na fachada do prédio, incluindo instalação de plataformas de trabalho e guarda-corpos. A atividade será realizada em todos os lados do edifício, começando pela face norte, até uma altura máxima de 50 metros.',
      responsiblePersons: [
        { name: 'João Silva', role: 'Técnico de Segurança', signatureType: 'typed', signatureData: 'João Silva' },
        { name: 'Maria Souza', role: 'Engenheira Chefe', signatureType: 'typed', signatureData: 'Maria Souza' }
      ],
      teamMembers: [
        { date: '2024-08-01', name: 'Carlos Pereira', role: 'Montador de Andaime' },
        { date: '2024-08-01', name: 'Ana Costa', role: 'Ajudante' },
      ],
      pt: {
        ptLocalAtividade: 'Torre B, 5º Andar',
        ptEquipamentoLinha: 'Sistema de Ventilação Central',
        ptData: new Date().toISOString().split('T')[0],
        ptHoraInicio: '09:00',
        ptHoraFim: '17:00',
        ptDescricaoTarefa: 'Manutenção preventiva no motor do exaustor principal.',
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
            { name: 'Pedro Martins', rgCpf: '12.345.678-9', func: 'Eletricista', empresa: 'Engenharia Delta', apto: 'sim' }
        ],
        ptVigias: [],
        ptResgatistas: [],
        ptGestorArea: {name: 'Lucas Mendes', signatureType: 'typed', signatureData: 'Lucas Mendes'},
        ptResponsavelAtividade: {name: 'Fernanda Lima', signatureType: 'typed', signatureData: 'Fernanda Lima'},
        ptSesmt: {name: 'João Silva', signatureType: 'typed', signatureData: 'João Silva'},
      },
    },
    mode: 'onChange',
  });

  const liveFormData = form.watch();
  const { toast } = useToast();

  const handleFormSubmit = async (data: SafetyFormValues) => {
    if (data.documentType !== 'APR') return;

    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setEquipment(null);

    const [analysisResult, equipmentResult] = await Promise.all([
        getSafetyAnalysis({ activityDescription: data.activityDescription! }),
        getProtectiveEquipment({ activityDescription: data.activityDescription! })
    ]);

    if (analysisResult.error || !analysisResult.data) {
      setError(analysisResult.error || 'An unknown error occurred during safety analysis.');
    } else {
      setAnalysis(analysisResult.data);
    }
    
    if (equipmentResult.error || !equipmentResult.data) {
        console.error(equipmentResult.error);
        toast({
            variant: 'destructive',
            title: 'Falha ao buscar EPIs/EPCs',
            description: equipmentResult.error || 'Não foi possível gerar as recomendações de equipamento.',
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

    if (formData.documentType === 'APR' && !analysis) {
      toast({
        variant: 'destructive',
        title: 'Análise de Risco não gerada',
        description:
          'Por favor, gere a análise da atividade antes de baixar o PDF.',
      });
      return;
    }

    setIsDownloading(true);
    try {
      const { fileName, dataUrl, error } = await generatePdfOnServer(formData, analysis, equipment);
      
      if (error || !dataUrl) {
          throw new Error(error || "A geração do PDF falhou no servidor.");
      }

      const payload = {
        event: 'pdf_generated',
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
        title: 'Sucesso!',
        description: 'PDF baixado e dados enviados para o n8n.',
      });

    } catch (error: any) {
      console.error('Falha ao gerar ou enviar PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Processar PDF',
        description:
          error.message || 'Não foi possível gerar ou enviar o PDF. Por favor, tente novamente.',
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
        isAprReady={!!(liveFormData.documentType === 'APR' && analysis)}
        isPtReady={liveFormData.documentType === 'PT'}
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
            isAprReady={!!(liveFormData.documentType === 'APR' && analysis)}
            isPtReady={liveFormData.documentType === 'PT'}
          />
        </div>
      </main>
    </div>
  );
}
