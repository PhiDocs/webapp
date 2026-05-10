'use client';

import type { UseFormReturn } from 'react-hook-form';
import type { SafetyFormValues, Work, Employee } from '@/lib/types';
import { SafetyForm } from '@/components/safety-form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Send, Loader2, Save, FileDown } from 'lucide-react';
import { ptBr } from '@/lib/data/strings';

interface FormPanelProps {
  form: UseFormReturn<SafetyFormValues>;
  onSubmit: (data: SafetyFormValues) => void;
  isLoading: boolean;
  works: Work[];
  employees: Employee[];
  isDataLoading: boolean;
  showPreview?: boolean;
  onTogglePreview?: () => void;
  isSendingSignature?: boolean;
  onSendForSignature?: () => void;
  canSendSignature?: boolean;
  isGeneratingPdf?: boolean;
  onGeneratePdf?: () => void;
  isSavingDraft?: boolean;
  onSaveDraft?: () => void;
}

export function FormPanel({
  form,
  onSubmit,
  isLoading,
  works,
  employees,
  isDataLoading,
  showPreview,
  onTogglePreview,
  isSendingSignature,
  onSendForSignature,
  canSendSignature,
  isGeneratingPdf,
  onGeneratePdf,
  isSavingDraft,
  onSaveDraft,
}: FormPanelProps) {
  const hasUnsavedChanges = form.formState.isDirty;

  return (
    <div className="h-full">
      <ScrollArea className="h-full">
        <div className="mx-auto max-w-[940px] px-4 py-6 md:px-8 md:py-8">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="max-w-[620px] font-headline text-h1 text-foreground">
                Gerar Novo Documento de Seguranca
              </h2>
              <p className="max-w-[560px] text-body-lg leading-8 text-muted-foreground">
                Preencha as informacoes detalhadas para a emissao da Analise Preliminar de Risco (APR).
              </p>
            </div>
            {onTogglePreview && (
              <Button
                variant="outline"
                size="icon"
                onClick={onTogglePreview}
                title={showPreview ? 'Ocultar pre-visualizacao' : 'Mostrar pre-visualizacao'}
                className="h-10 w-10 shrink-0 rounded-md border-[#d7dce4] bg-white text-[#0c1e36] hover:bg-[#f5f7fa]"
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            )}
          </div>

          <SafetyForm
            form={form}
            onSubmit={onSubmit}
            isLoading={isLoading}
            works={works}
            employees={employees}
            isDataLoading={isDataLoading}
          />

          <div className="sticky bottom-0 z-20 mt-6 border-t border-[#e0c0b1] bg-[#f7f9fc]/95 backdrop-blur">
            <div className="flex min-h-24 flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
              <div className="flex items-center gap-2 text-body-sm text-[#584237]">
                <span className={`h-2.5 w-2.5 rounded-full ${hasUnsavedChanges ? 'bg-[#d48f58]' : 'bg-[#d6d9df]'}`} />
                {hasUnsavedChanges ? 'Alteracoes nao salvas' : 'Tudo salvo'}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 md:flex-nowrap">
                {onSaveDraft && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onSaveDraft}
                    disabled={isSavingDraft}
                    className="min-w-[184px] whitespace-nowrap rounded-md border-[#4f5f7a] bg-white font-medium text-[#4f5f7a] hover:bg-[#eceef1]"
                  >
                    {isSavingDraft ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Rascunho
                      </>
                    )}
                  </Button>
                )}
                {onGeneratePdf && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onGeneratePdf}
                    disabled={isGeneratingPdf}
                    className="min-w-[184px] whitespace-nowrap rounded-md border-[#4f5f7a] bg-white font-medium text-[#4f5f7a] hover:bg-[#eceef1]"
                  >
                    {isGeneratingPdf ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {ptBr.actions.generatingPdf}
                      </>
                    ) : (
                      <>
                        <FileDown className="mr-2 h-4 w-4" />
                        {ptBr.actions.generatePdf}
                      </>
                    )}
                  </Button>
                )}
                {onSendForSignature && (
                  <Button
                    type="button"
                    onClick={onSendForSignature}
                    disabled={isSendingSignature || !canSendSignature}
                    className="min-w-[210px] whitespace-nowrap rounded-md bg-[#f46e11] font-semibold text-white shadow-lg hover:bg-[#e96710]"
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
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
