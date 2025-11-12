'use client';

import { useState } from 'react';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import type { ProtectiveEquipmentOutput } from '@/ai/flows/recommend-protective-equipment';
import type { SafetyFormValues } from '@/lib/types';
import { getSafetyAnalysis, getProtectiveEquipment } from '@/app/ai-actions';
import { Logo } from '@/components/icons/logo';
import { SafetyForm } from '@/components/safety-form';
import { Card, CardContent } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formSchema } from '@/lib/types';
import { PrintPreview } from '@/components/print-preview';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generatePdf } from '@/lib/pdf-generator';

import './print/print-layout.css';

async function notifyN8n(data: any) {
  try {
    const response = await fetch('/api/n8n-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorDetails = await response.json();
      console.error('Falha ao notificar o n8n:', errorDetails);
      // Não vamos mostrar um toast de erro aqui para não interromper o usuário
      // A notificação ao n8n é um processo em segundo plano.
    } else {
      console.log('n8n notificado com sucesso!', await response.json());
    }
  } catch (error) {
    console.error('Erro ao chamar o webhook do n8n:', error);
  }
}


export default function Home() {
  const [analysis, setAnalysis] = useState<SafetyAnalysisOutput | null>(null);
  const [equipment, setEquipment] = useState<ProtectiveEquipmentOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isTestingN8n, setIsTestingN8n] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SafetyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentType: 'APR',
      workName: '',
      workAddress: '',
      startDate: '',
      endDate: '',
      workLocationDetails: '',
      activityDescription: '',
      responsiblePersons: [{ name: '', role: '', signatureType: 'typed', signatureData: '' }],
      companyName: '',
      companyLogo: '',
      teamMembers: [],
      pt: {
        ptLocalAtividade: '',
        ptEquipamentoLinha: '',
        ptData: new Date().toISOString().split('T')[0],
        ptHoraInicio: '',
        ptHoraFim: '',
        ptDescricaoTarefa: '',
        ptChecklist: {},
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
        ptGestorArea: {name: '', signatureType: 'typed', signatureData: ''},
        ptResponsavelAtividade: {name: '', signatureType: 'typed', signatureData: ''},
        ptSesmt: {name: '', signatureType: 'typed', signatureData: ''},
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
      await generatePdf(formData, analysis, equipment);
      
      // Chama o webhook do n8n após o PDF ser gerado com sucesso.
      await notifyN8n({
        event: 'pdf_generated',
        documentType: formData.documentType,
        formData: formData,
        analysisData: analysis,
        equipmentData: equipment,
      });

    } catch (error: any) {
      console.error('Falha ao gerar PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar PDF',
        description:
          error.message || 'Não foi possível gerar o PDF. Por favor, tente novamente.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleTestN8n = async () => {
    setIsTestingN8n(true);
    try {
      const response = await fetch('/api/n8n-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test_connection',
          message: 'This is a test from the application button.',
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast({
          title: 'Sucesso!',
          description: 'Mensagem de teste enviada para o n8n. Verifique seu workflow.',
        });
      } else {
        const errorData = await response.json();
        toast({
          variant: 'destructive',
          title: 'Falha na Conexão com n8n',
          description: `O servidor respondeu com um erro: ${errorData.details || response.statusText}`,
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro de Rede',
        description: `Não foi possível conectar à API de webhook. Detalhes: ${error.message}`,
      });
    } finally {
      setIsTestingN8n(false);
    }
  };


  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold text-foreground font-headline">
              Safety Docs AI
            </h1>
          </div>
          <div className="flex items-center gap-2">
             <Button
              variant="outline"
              onClick={handleTestN8n}
              disabled={isTestingN8n}
            >
              {isTestingN8n ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Testar n8n
                </>
              )}
            </Button>
            <Button
              onClick={handleGeneratePdf}
              disabled={isDownloading || (liveFormData.documentType === 'APR' && !analysis)}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Baixando...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  Baixar PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-2 h-[calc(100vh-65px)]">
          <ScrollArea className="h-full border-r">
            <div className="p-4 md:p-6 space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-foreground font-headline">
                  Gere seu Documento de Segurança
                </h2>
                <p className="text-muted-foreground">
                  Preencha o formulário e veja a pré-visualização ao lado.
                  Nossa IA irá analisar a atividade com base nas NRs
                  brasileiras.
                </p>
              </div>
              <SafetyForm
                form={form}
                onSubmit={handleFormSubmit}
                isLoading={isLoading}
                onNewReport={handleNewReport}
              />
            </div>
          </ScrollArea>

          <div className="relative flex flex-col bg-muted h-full">
            <ScrollArea className="h-full">
              <div className="print-container-wrapper p-4 sm:p-8">
                {isLoading && (
                  <div className="absolute inset-0 bg-muted/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-lg">
                    <div className="flex flex-col items-center gap-4 text-center p-6 bg-background rounded-xl shadow-2xl">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <h3 className="text-xl font-semibold">
                        Gerando Análise...
                      </h3>
                      <p className="text-muted-foreground">
                        Aguarde enquanto nossa IA prepara seu relatório.
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="w-[210mm] min-h-[297mm] mx-auto bg-white shadow-lg flex items-center justify-center">
                    <Card className="flex h-full min-h-[400px] w-full flex-col items-center justify-center bg-destructive/10 border-destructive">
                      <CardContent className="flex flex-col items-center justify-center gap-4 text-center p-6">
                        <h3 className="text-xl font-semibold text-destructive-foreground">
                          Erro
                        </h3>
                        <p className="text-destructive-foreground/80">
                          {error}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div id="print-content-root">
                  <PrintPreview
                    formData={liveFormData}
                    analysisData={analysis}
                    equipmentData={equipment}
                  />
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </main>
    </div>
  );
}
