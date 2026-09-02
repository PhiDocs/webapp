'use client';

import type { UseFormReturn } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import type { SafetyFormValues, Work, Employee, ResponsibleContact, ResponsibleContactInput, AprPtProject } from '@/lib/types';
import type { ProtectiveEquipmentOutput } from '@/server/ai-actions';
import { SafetyForm } from '@/components/safety-form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, Send, Loader2, Save, FileDown } from 'lucide-react';
import { ptBr } from '@/lib/data/strings';
import { DOCUMENT_TYPES } from '@/lib/constants';

interface FormPanelProps {
  form: UseFormReturn<SafetyFormValues>;
  onSubmit: (data: SafetyFormValues) => void;
  isLoading: boolean;
  works: Work[];
  employees: Employee[];
  responsibleContacts?: ResponsibleContact[];
  onSaveResponsibleContact?: (data: ResponsibleContactInput) => Promise<boolean>;
  equipment?: ProtectiveEquipmentOutput | null;
  onEquipmentChange?: (next: ProtectiveEquipmentOutput) => void;
  projects?: AprPtProject[];
  selectedProjectId?: string;
  onSelectProject?: (projectId: string) => void;
  onCreateProject?: () => void;
  onSelectCompany?: (workId: string) => void;
  onCreateCompany?: () => void;
  recentActivities?: string[];
  knownLocations?: string[];
  similarActivities?: string[];
  onVisualizarDocumento?: () => void;
  onFinalizarDocumento?: () => Promise<boolean> | void;
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
  autoSaveState?: 'idle' | 'saving' | 'saved';
}

export function FormPanel({
  form,
  onSubmit,
  isLoading,
  works,
  employees,
  responsibleContacts = [],
  onSaveResponsibleContact,
  equipment,
  onEquipmentChange,
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onSelectCompany,
  onCreateCompany,
  recentActivities,
  knownLocations,
  similarActivities,
  onVisualizarDocumento,
  onFinalizarDocumento,
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
  autoSaveState = 'idle',
}: FormPanelProps) {
  const hasUnsavedChanges = form.formState.isDirty;
  const documentType = useWatch({ control: form.control, name: 'documentType' });
  const isApr = documentType === DOCUMENT_TYPES.APR;

  return (
    <div className="h-full">
      <ScrollArea className="h-full">
        <div className="mx-auto max-w-[940px] px-4 py-6 md:px-8 md:py-8">
          <div className="mb-8 rounded-2xl border border-[#cfcbc0] bg-white p-4 shadow-sm md:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7a1f1f]">Tipo de documento</p>
            <Tabs
              value={documentType}
              onValueChange={(value) => form.setValue('documentType', value as SafetyFormValues['documentType'], { shouldDirty: true })}
              className="mt-3"
            >
              <TabsList className="grid h-auto w-full max-w-xl grid-cols-2 gap-2 bg-[#f7f5f0] p-1">
                <TabsTrigger value={DOCUMENT_TYPES.APR} className="h-auto rounded-xl px-4 py-3 text-left data-[state=active]:bg-[#7a1f1f] data-[state=active]:text-white">
                  <span>
                    <span className="block font-semibold">APR</span>
                    <span className="block text-xs font-normal opacity-80">Analise Preliminar de Risco</span>
                  </span>
                </TabsTrigger>
                <TabsTrigger value={DOCUMENT_TYPES.PT} className="h-auto rounded-xl px-4 py-3 text-left data-[state=active]:bg-[#111111] data-[state=active]:text-white">
                  <span>
                    <span className="block font-semibold">PT</span>
                    <span className="block text-xs font-normal opacity-80">Permissao de Trabalho</span>
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="mb-8 flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="max-w-[620px] font-headline text-h1 text-foreground">
                Gerar {isApr ? 'APR' : 'PT'}
              </h2>
              <p className="max-w-[560px] text-body-lg leading-8 text-muted-foreground">
                {isApr
                  ? 'Preencha as informacoes para identificar riscos e definir medidas de controle.'
                  : 'Preencha as informacoes para autorizar e controlar uma atividade de trabalho.'}
              </p>
            </div>
            {onTogglePreview && (
              <Button
                variant="outline"
                size="icon"
                onClick={onTogglePreview}
                title={showPreview ? 'Ocultar pre-visualizacao' : 'Mostrar pre-visualizacao'}
                className="h-10 w-10 shrink-0 rounded-md border-[#cfcbc0] bg-white text-[#111111] hover:bg-[#f7f5f0]"
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
            responsibleContacts={responsibleContacts}
            onSaveResponsibleContact={onSaveResponsibleContact}
            equipment={equipment}
            onEquipmentChange={onEquipmentChange}
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={onSelectProject}
            onCreateProject={onCreateProject}
            onSelectCompany={onSelectCompany}
            onCreateCompany={onCreateCompany}
            recentActivities={recentActivities}
            knownLocations={knownLocations}
            similarActivities={similarActivities}
            onVisualizarDocumento={onVisualizarDocumento}
            onFinalizar={onFinalizarDocumento || onSaveDraft}
            isFinalizando={Boolean(isSavingDraft)}
            onEnviarAssinatura={onSendForSignature}
            isEnviando={Boolean(isSendingSignature)}
            isDataLoading={isDataLoading}
          />

          <div className="sticky bottom-0 z-20 mt-6 border-t border-[#cfcbc0] bg-[#f2f1ed]/95 backdrop-blur">
            {/* Empilha ate lg. Em tablet, esta barra em linha unica com botoes
                de largura fixa forcava 841px de largura minima e empurrava a
                pagina inteira para fora do scrollport, que tem overflow-x
                hidden — o conteudo ficava inalcancavel no dedo. */}
            <div className="flex min-h-24 flex-col gap-4 px-4 py-4 md:px-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 text-body-sm text-[#6e6a61]">
                {autoSaveState === 'saving' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    {/* O isDirty do react-hook-form nunca volta a false depois
                        de salvar, entao ele nao pode mandar aqui: senao a barra
                        diz "nao salvas" para sempre, mesmo com tudo gravado. */}
                    <span className={`h-2.5 w-2.5 rounded-full ${autoSaveState === 'saved' || !hasUnsavedChanges ? 'bg-[#1b5e3f]' : 'bg-[#8a5a00]'}`} />
                    {autoSaveState === 'saved'
                      ? 'Salvo automaticamente'
                      : hasUnsavedChanges
                        ? 'Alteracoes nao salvas'
                        : 'Tudo salvo'}
                  </>
                )}
              </div>
              {/* Sem largura minima e sem nowrap: os botoes quebram sozinhos
                  quando a coluna aperta. Breakpoint de viewport nao serve aqui,
                  porque a largura util e a janela menos a barra lateral menos a
                  previa — o lg: chegava com 672px de coluna para 841px de barra. */}
              <div className="flex flex-wrap items-center justify-end gap-3">
                {onSaveDraft && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onSaveDraft}
                    disabled={isSavingDraft}
                    className="h-12 min-w-0 flex-1 whitespace-nowrap rounded-md border-[#6e6a61] bg-white font-medium text-[#6e6a61] hover:bg-[#ebe9e3] sm:flex-none lg:h-10"
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
                    className="h-12 min-w-0 flex-1 whitespace-nowrap rounded-md border-[#6e6a61] bg-white font-medium text-[#6e6a61] hover:bg-[#ebe9e3] sm:flex-none lg:h-10"
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
                    className="h-12 min-w-0 flex-1 whitespace-nowrap rounded-md bg-[#7a1f1f] font-semibold text-white shadow-lg hover:bg-[#5f1818] sm:flex-none lg:h-10"
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
