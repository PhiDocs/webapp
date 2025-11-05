'use client';

import { useState } from 'react';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import type { SafetyFormValues } from '@/lib/types';
import { getSafetyAnalysis } from '@/app/actions';
import { Logo } from '@/components/icons/logo';
import { SafetyForm } from '@/components/safety-form';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formSchema } from '@/lib/types';
import { PrintPreview } from '@/components/print-preview';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import './print/print-layout.css';

export default function Home() {
  const [analysis, setAnalysis] = useState<SafetyAnalysisOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
      teamMembers: '',
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
  }

  const { toast } = useToast();

  const handleGeneratePdf = () => {
    if (!analysis && !form.getValues('activityDescription')) {
        toast({
            variant: 'destructive',
            title: 'Análise não gerada',
            description: 'Por favor, preencha o formulário e gere a análise da atividade primeiro.',
        });
        return;
    }
    try {
      const printData = {
        ...liveFormData,
        ...analysis,
        date: new Date().toLocaleDateString('pt-BR'),
      };
      sessionStorage.setItem('printData', JSON.stringify(printData));
      window.open('/print', '_blank');
    } catch (error) {
      console.error('Failed to prepare data for PDF generation:', error);
      toast({
        variant: 'destructive',
        title: 'PDF Generation Error',
        description:
          'Could not prepare data for PDF generation. Please check console for details.',
      });
    }
  };


  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold text-foreground font-headline">
              Safety Docs AI
            </h1>
          </div>
          <Button onClick={handleGeneratePdf}>
            <FileDown className="mr-2 h-4 w-4" />
            Gerar & Baixar PDF
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="space-y-6 lg:pr-4">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground font-headline">
                    Gere seu Documento de Segurança
                  </h2>
                  <p className="text-muted-foreground">
                    Preencha o formulário e veja a pré-visualização ao lado. Nossa IA irá analisar a atividade com base nas NRs brasileiras.
                  </p>
                </div>
                <SafetyForm form={form} onSubmit={handleFormSubmit} isLoading={isLoading} onNewReport={handleNewReport} />
            </div>
          </ScrollArea>

          <div className="space-y-6">
            <div className="lg:sticky lg:top-20">
             {isLoading && (
              <Card className="flex h-full min-h-[400px] w-full flex-col items-center justify-center">
                <CardContent className="flex flex-col items-center justify-center gap-4 text-center p-6">
                  <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
                  <style jsx>{`
                    .loader {
                      border-top-color: hsl(var(--primary));
                      animation: spinner 1.2s linear infinite;
                    }
                    @keyframes spinner {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                  <h3 className="text-xl font-semibold">Gerando Análise...</h3>
                  <p className="text-muted-foreground">
                    Por favor, aguarde enquanto nossa IA prepara seu relatório de segurança.
                  </p>
                </CardContent>
              </Card>
            )}

            {error && (
               <Card className="flex h-full min-h-[400px] w-full flex-col items-center justify-center bg-destructive/10 border-destructive">
                <CardContent className="flex flex-col items-center justify-center gap-4 text-center p-6">
                  <h3 className="text-xl font-semibold text-destructive-foreground">Erro</h3>
                  <p className="text-destructive-foreground/80">{error}</p>
                </CardContent>
               </Card>
            )}
            
            <div className="print-bg h-[calc(100vh-120px)] overflow-hidden">
              <ScrollArea className='h-full' type='always'>
                <div className='scale-75 origin-top'>
                  <PrintPreview formData={liveFormData} analysisData={analysis} />
                </div>
              </ScrollArea>
            </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="container mx-auto mt-auto px-4 md:px-6">
          <Separator/>
          <div className="py-6 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Safety Docs AI. All Rights Reserved.</p>
          </div>
      </footer>
    </div>
  );
}
