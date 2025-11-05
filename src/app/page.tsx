'use client';

import { useState } from 'react';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import type { SafetyFormValues } from '@/lib/types';
import { getSafetyAnalysis } from '@/app/actions';
import { Logo } from '@/components/icons/logo';
import { SafetyForm } from '@/components/safety-form';
import { AnalysisResult } from '@/components/analysis-result';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  const [analysis, setAnalysis] = useState<SafetyAnalysisOutput | null>(null);
  const [formData, setFormData] = useState<SafetyFormValues | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safetyIllustration = PlaceHolderImages.find(p => p.id === 'safety-illustration');

  const handleFormSubmit = async (data: SafetyFormValues) => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setFormData(data);

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
    setFormData(null);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold text-foreground font-headline">
              Safety Docs AI
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
          <div className="space-y-6 lg:sticky lg:top-20">
            {!analysis ? (
              <>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground font-headline">
                    Gere seu Documento de Segurança
                  </h2>
                  <p className="text-muted-foreground">
                    Selecione um tipo de documento e descreva a atividade de trabalho. Nossa IA irá analisá-la com base nas NRs brasileiras.
                  </p>
                </div>
                <SafetyForm onSubmit={handleFormSubmit} isLoading={isLoading} isFormSubmitted={!!analysis} onNewReport={handleNewReport} />
              </>
            ) : (
               <SafetyForm onSubmit={handleFormSubmit} isLoading={isLoading} isFormSubmitted={!!analysis} onNewReport={handleNewReport} />
            )}
          </div>

          <div className="space-y-6">
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

            {!isLoading && !analysis && !error && (
              <Card className="relative overflow-hidden rounded-lg lg:min-h-[calc(100vh-10rem)] flex items-center justify-center">
                <CardContent className="p-0">
                  {safetyIllustration && (
                    <Image
                      src={safetyIllustration.imageUrl}
                      alt={safetyIllustration.description}
                      width={800}
                      height={600}
                      className="object-cover"
                      data-ai-hint={safetyIllustration.imageHint}
                      priority
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 p-6">
                    <h3 className="text-2xl font-bold text-white font-headline">
                      Sua análise aparecerá aqui
                    </h3>
                    <p className="mt-2 text-white/80">
                      Preencha o formulário para começar.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {analysis && formData && !isLoading && !error && (
              <AnalysisResult analysisData={analysis} formData={formData} />
            )}
          </div>
        </div>
      </main>

      <footer className="container mx-auto mt-12 px-4 md:px-6">
          <Separator/>
          <div className="py-6 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Safety Docs AI. All Rights Reserved.</p>
          </div>
      </footer>
    </div>
  );
}
