'use client';

import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { SafetyFormValues } from '@/lib/types';
import { SafetyForm } from '@/components/safety-form';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Zap, FlaskConical, RefreshCcw, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { notifyN8n } from '@/server/n8n-actions';


interface N8nIntegrationCardProps {}

function N8nIntegrationCard({}: N8nIntegrationCardProps) {
  const [isTestingN8n, setIsTestingN8n] = useState(false);
  const [isTestingEditor, setIsTestingEditor] = useState(false);
  const [n8nTestUrl, setN8nTestUrl] = useState('');
  const { toast } = useToast();

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
    );
}

interface FormPanelProps {
  form: UseFormReturn<SafetyFormValues>;
  onNewReport: () => void;
  onSubmit: (data: SafetyFormValues) => void;
  isLoading: boolean;
  mobileView: 'form' | 'preview';
}

export function FormPanel({ form, onNewReport, onSubmit, isLoading, mobileView }: FormPanelProps) {
  return (
    <div className={cn("h-full xl:border-r", mobileView !== 'form' && "hidden xl:block")}>
      <ScrollArea className="h-full">
          <div className="p-4 md:p-6 space-y-6">
          <div className="flex justify-between items-start">
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Começar Novo Relatório
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso limpará todos os dados do formulário e a análise de IA gerada.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onNewReport}>Continuar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          </div>
          <SafetyForm
              form={form}
              onSubmit={onSubmit}
              isLoading={isLoading}
          />
          <N8nIntegrationCard />
          </div>
      </ScrollArea>
    </div>
  );
}
