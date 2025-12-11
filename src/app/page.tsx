
'use client';

import { useState } from 'react';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import type { ProtectiveEquipmentOutput } from '@/ai/flows/recommend-protective-equipment';
import type { SafetyFormValues } from '@/lib/types';
import { getSafetyAnalysis, getProtectiveEquipment } from '@/server/ai-actions';
import { generatePdfOnServer } from '@/server/pdf-actions';
import { Logo } from '@/components/icons/logo';
import { SafetyForm } from '@/components/safety-form';
import { Card, CardContent } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formSchema } from '@/lib/types';
import { PrintPreview } from '@/components/print-preview';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, Zap, FlaskConical, FormInput, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from "@/lib/utils";


import './print/print-layout.css';

async function notifyN8n(payload: any, webhookUrl?: string) {
  try {
    const response = await fetch('/api/n8n-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payload, webhookUrl }),
    });

    const responseData = await response.json();
    if (!response.ok) {
      console.error('Falha ao notificar o n8n:', responseData);
      return { success: false, data: responseData };
    } else {
      console.log('n8n notificado com sucesso!', responseData);
      return { success: true, data: responseData };
    }
  } catch (error: any) {
    console.error('Erro de rede ao chamar o webhook do n8n:', error);
    return { success: false, data: { error: 'Erro de rede', details: error.message } };
  }
}


export default function Home() {
  const [analysis, setAnalysis] = useState<SafetyAnalysisOutput | null>(null);
  const [equipment, setEquipment] = useState<ProtectiveEquipmentOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isTestingN8n, setIsTestingN8n] = useState(false);
  const [isTestingEditor, setIsTestingEditor] = useState(false);
  const [n8nTestUrl, setN8nTestUrl] = useState('');
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
    setMobileView('preview'); // Switch to preview on mobile after generating
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
      // 1. Chama a Server Action para gerar o PDF no servidor
      const { fileName, dataUrl, error } = await generatePdfOnServer(formData, analysis, equipment);
      
      if (error || !dataUrl) {
          throw new Error(error || "A geração do PDF falhou no servidor.");
      }

      // 2. Prepara o payload para o n8n, incluindo o PDF como data URL.
      const payload = {
        event: 'pdf_generated',
        documentType: formData.documentType,
        fileName,
        pdfDataUrl: dataUrl, // O PDF em si!
        formData: formData,
        analysisData: analysis,
        equipmentData: equipment,
      };

      // 3. Envia os dados para a URL de teste (se fornecida) ou para a de produção.
      const targetWebhookUrl = n8nTestUrl || undefined;
      await notifyN8n(payload, targetWebhookUrl);
      
      // 4. Inicia o download do arquivo no navegador do usuário.
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

  const handleTestN8n = async (isEditorTest: boolean) => {
    if (isEditorTest) {
      if (!n8nTestUrl) {
          toast({
              variant: 'destructive',
              title: 'URL de Teste Faltando',
              description: 'Por favor, cole a URL de teste do n8n no campo apropriado.',
          });
          return;
      }
      setIsTestingEditor(true);
    } else {
      setIsTestingN8n(true);
    }

    const testPayload = {
      message: "Conexão com n8n funcionando! Teste enviado pelo botão do App.",
      testId: `test-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
      testType: isEditorTest ? 'Editor' : 'Production'
    };

    const result = await notifyN8n(testPayload, isEditorTest ? n8nTestUrl : undefined);

    if (result.success) {
      toast({
        title: 'Sucesso!',
        description: `Requisição enviada para a URL de ${isEditorTest ? 'teste' : 'produção'}.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: `Falha na Conexão com n8n (${result.data.status || 'Rede'})`,
        description: `O servidor respondeu com um erro: ${result.data.details || 'Verifique a URL e o console.'}`,
      });
    }

    if (isEditorTest) {
      setIsTestingEditor(false);
    } else {
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
          
          {/* Mobile View Toggles */}
          <div className="xl:hidden flex items-center gap-1 rounded-md bg-muted p-1">
              <Button
                size="sm"
                variant={mobileView === 'form' ? 'secondary' : 'ghost'}
                onClick={() => setMobileView('form')}
                className="flex-1"
              >
                  <FormInput className="mr-2 h-4 w-4" />
                  Formulário
              </Button>
              <Button
                size="sm"
                variant={mobileView === 'preview' ? 'secondary' : 'ghost'}
                onClick={() => setMobileView('preview')}
                className="flex-1"
              >
                  <Eye className="mr-2 h-4 w-4" />
                  Pré-visualização
              </Button>
          </div>

          <div className="hidden xl:flex items-center gap-2">
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
        <div className="grid grid-cols-1 xl:grid-cols-2 h-[calc(100vh-65px)]">
          <div className={cn("h-full xl:border-r", mobileView !== 'form' && "hidden xl:block")}>
            <ScrollArea className="h-full">
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
                <Card>
                    <CardContent className='pt-6 space-y-4'>
                        <h3 className="text-lg font-semibold flex items-center">
                            <Zap className="mr-2" /> Integração n8n
                        </h3>
                        <div className='space-y-2'>
                            <Label htmlFor='n8n-prod-test'>Teste em Produção</Label>
                            <Button
                                id='n8n-prod-test'
                                variant="outline"
                                className='w-full'
                                onClick={() => handleTestN8n(false)}
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
                                    Testar Conexão de Produção
                                    </>
                                )}
                            </Button>
                        </div>
                        <div className='space-y-2'>
                            <Label htmlFor='n8n-test-url'>URL de Teste do Editor n8n</Label>
                            <Input
                                id='n8n-test-url'
                                placeholder='Cole a "Test URL" do n8n aqui'
                                value={n8nTestUrl}
                                onChange={(e) => setN8nTestUrl(e.target.value)}
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label htmlFor='n8n-editor-test'>Teste no Editor</Label>
                            <Button
                                id='n8n-editor-test'
                                variant="outline"
                                className='w-full'
                                onClick={() => handleTestN8n(true)}
                                disabled={isTestingEditor || !n8nTestUrl}
                            >
                                {isTestingEditor ? (
                                    <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Enviando...
                                    </>
                                ) : (
                                    <>
                                    <FlaskConical className="mr-2 h-4 w-4" />
                                    Enviar para o Editor
                                    </>
                                )}
                            </Button>
                            <p className='text-xs text-muted-foreground'>Clique em "Listen for test event" no n8n antes de clicar aqui.</p>
                        </div>
                    </CardContent>
                </Card>
                </div>
            </ScrollArea>
          </div>
          
          <div className={cn("relative flex-col bg-muted h-full", mobileView === 'preview' ? 'flex' : 'hidden xl:flex')}>
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
             <div className="xl:hidden sticky bottom-0 left-0 right-0 w-full bg-background/80 backdrop-blur-sm p-4 border-t">
                 <Button
                    onClick={handleGeneratePdf}
                    disabled={isDownloading || (liveFormData.documentType === 'APR' && !analysis)}
                    className="w-full"
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
        </div>
      </main>
    </div>
  );

    

    