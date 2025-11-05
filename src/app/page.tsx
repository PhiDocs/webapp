'use client';

import { useState } from 'react';
import { jsPDF } from 'jspdf';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import type { SafetyFormValues } from '@/lib/types';
import { getSafetyAnalysis } from '@/app/ai-actions';
import { Logo } from '@/components/icons/logo';
import { SafetyForm } from '@/components/safety-form';
import { Card, CardContent } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formSchema } from '@/lib/types';
import { PrintPreview } from '@/components/print-preview';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import './print/print-layout.css';

export default function Home() {
  const [analysis, setAnalysis] = useState<SafetyAnalysisOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
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
      responsiblePersons: [{ name: '', role: '' }],
      companyName: '',
      companyLogo: '',
      teamMembers: [],
    },
    mode: 'onChange',
  });

  const liveFormData = form.watch();

  const handleFormSubmit = async (data: SafetyFormValues) => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    const result = await getSafetyAnalysis({
      activityDescription: data.activityDescription,
    });

    if (result.error || !result.data) {
      setError(result.error || 'An unknown error occurred.');
    } else {
      setAnalysis(result.data);
    }
    setIsLoading(false);
  };

  const handleNewReport = () => {
    setAnalysis(null);
    setError(null);
    form.reset();
  };

  const { toast } = useToast();

  const handleGeneratePdf = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast({
        variant: 'destructive',
        title: 'Formulário incompleto',
        description:
          'Por favor, preencha todos os campos obrigatórios antes de gerar o PDF.',
      });
      return;
    }
    if (!analysis) {
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
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });
      
      const content = document.getElementById('print-content-root');

      if (!content) {
        throw new Error('Elemento de impressão não encontrado.');
      }
      
      // Get all style tags and link tags from the document head
      const styles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML).join('');


      const fullHtml = `
        <html>
          <head>
            <meta charset="utf-8">
            ${styles}
          </head>
          <body>
            ${content.innerHTML}
          </body>
        </html>
      `;

      await doc.html(fullHtml, {
        callback: function (doc) {
            const printData = form.getValues();
            const fileName = `${printData.documentType}-${printData.companyName.replace(/ /g,"_")}-${new Date().toLocaleDateString('pt-br').replace(/\//g, '-')}.pdf`;
            doc.save(fileName);
        },
        margin: [15, 15, 15, 15],
        autoPaging: 'text',
        width: 180, // A4 width in mm minus margins (210 - 15 - 15)
        windowWidth: 794 // A4 width in px for 96 DPI
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
          <Button
            onClick={handleGeneratePdf}
            disabled={isDownloading || !analysis}
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
