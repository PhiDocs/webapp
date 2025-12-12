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
import { ptBr } from '@/lib/data/strings';


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
              title: ptBr.toasts.errors.n8nTestUrlMissing,
              description: ptBr.toasts.errors.n8nTestUrlMissingDescription,
          });
          return;
      }
      setIsTestingEditor(true);
    } else {
      setIsTestingN8n(true);
    }

    const testPayload = {
      message: ptBr.n8n.testMessage,
      testId: `test-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
      testType: isEditorTest ? 'Editor' : 'Production'
    };

    const result = await notifyN8n(testPayload, isEditorTest ? n8nTestUrl : undefined);

    if (result.success) {
      toast({
        title: ptBr.toasts.success.n8nConnection,
        description: ptBr.toasts.success.n8nConnectionDescription.replace('{{target}}', isEditorTest ? ptBr.toasts.success.n8nTest : ptBr.toasts.success.n8nProduction),
      });
    } else {
      toast({
        variant: 'destructive',
        title: `${ptBr.toasts.errors.n8nConnectionFailed} (${result.data.status || ptBr.toasts.errors.n8nConnectionFailedNetwork})`,
        description: ptBr.toasts.errors.n8nConnectionFailedDescription.replace('{{details}}', result.data.details || ptBr.errors.n8nCheckUrl),
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
                    <Zap className="mr-2" /> {ptBr.n8n.title}
                </h3>
                <div className='space-y-2'>
                    <Label htmlFor='n8n-prod-test'>{ptBr.n8n.productionTest}</Label>
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
                            {ptBr.actions.testingConnection}
                            </>
                        ) : (
                            <>
                            <Zap className="mr-2 h-4 w-4" />
                            {ptBr.actions.testConnection}
                            </>
                        )}
                    </Button>
                </div>
                <div className='space-y-2'>
                    <Label htmlFor='n8n-test-url'>{ptBr.n8n.testUrl}</Label>
                    <Input
                        id='n8n-test-url'
                        placeholder={ptBr.n8n.testUrlPlaceholder}
                        value={n8nTestUrl}
                        onChange={(e) => setN8nTestUrl(e.target.value)}
                    />
                </div>
                <div className='space-y-2'>
                    <Label htmlFor='n8n-editor-test'>{ptBr.n8n.editorTest}</Label>
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
                            {ptBr.actions.sendingToEditor}
                            </>
                        ) : (
                            <>
                            <FlaskConical className="mr-2 h-4 w-4" />
                            {ptBr.actions.sendToEditor}
                            </>
                        )}
                    </Button>
                    <p className='text-xs text-muted-foreground'>{ptBr.n8n.editorHelpText}</p>
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
                {ptBr.formPanel.title}
                </h2>
                <p className="text-muted-foreground">
                {ptBr.formPanel.description}
                </p>
            </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {ptBr.actions.startNewReport}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{ptBr.formPanel.newReportConfirmation.title}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {ptBr.formPanel.newReportConfirmation.description}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{ptBr.actions.cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={onNewReport}>{ptBr.actions.continue}</AlertDialogAction>
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
