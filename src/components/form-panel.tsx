'use client';

import type { UseFormReturn } from 'react-hook-form';
import type { SafetyFormValues, Work, Employee } from '@/lib/types';
import { SafetyForm } from '@/components/safety-form';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Eye, EyeOff, Send, Loader2, Save } from 'lucide-react';
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
import { ptBr } from '@/lib/data/strings';

interface FormPanelProps {
  form: UseFormReturn<SafetyFormValues>;
  onNewReport: () => void;
  onSubmit: (data: SafetyFormValues) => void;
  isLoading: boolean;
  mobileView: 'form' | 'preview';
  works: Work[];
  employees: Employee[];
  isDataLoading: boolean;
  showFloatingPreview?: boolean;
  onToggleFloatingPreview?: () => void;
  isSendingSignature?: boolean;
  onSendForSignature?: () => void;
  canSendSignature?: boolean;
  isSavingDraft?: boolean;
  onSaveDraft?: () => void;
}

export function FormPanel({ form, onNewReport, onSubmit, isLoading, mobileView, works, employees, isDataLoading, showFloatingPreview, onToggleFloatingPreview, isSendingSignature, onSendForSignature, canSendSignature, isSavingDraft, onSaveDraft }: FormPanelProps) {
  return (
    <div className={cn("h-full", mobileView !== 'form' && "hidden")}>
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
            <div className="flex gap-2">
              {onToggleFloatingPreview && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleFloatingPreview}
                  title={showFloatingPreview ? "Ocultar pré-visualização" : "Mostrar pré-visualização"}
                >
                  {showFloatingPreview ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      Ocultar Preview
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Mostrar Preview
                    </>
                  )}
                </Button>
              )}
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
          </div>
          <SafetyForm
            form={form}
            onSubmit={onSubmit}
            isLoading={isLoading}
            works={works}
            employees={employees}
            isDataLoading={isDataLoading}
          />

          <div className="flex flex-col gap-2">
            {onSaveDraft && (
              <Button
                type="button"
                variant="outline"
                onClick={onSaveDraft}
                disabled={isSavingDraft}
                className="w-full"
              >
                {isSavingDraft ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar rascunho
                  </>
                )}
              </Button>
            )}
            {onSendForSignature && (
              <Button
                type="button"
                onClick={onSendForSignature}
                disabled={isSendingSignature || !canSendSignature}
                className="w-full"
              >
                {isSendingSignature ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {ptBr.actions.sendingForSignature}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {ptBr.actions.sendForSignature}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
