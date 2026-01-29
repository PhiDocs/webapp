'use client';

import type { SafetyAnalysisOutput, ProtectiveEquipmentOutput } from '@/server/ai-actions';
import type { SafetyFormValues, Company } from '@/lib/types';
import { PrintPreview } from '@/components/print-preview';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Printer, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { ptBr } from '@/lib/data/strings';

interface PreviewPanelProps {
  isLoading: boolean;
  error: string | null;
  liveFormData: SafetyFormValues;
  analysisData: SafetyAnalysisOutput | null;
  equipmentData: ProtectiveEquipmentOutput | null;
  company: Company | null;
  mobileView: 'form' | 'preview';
  isDownloading: boolean;
  onGeneratePdf: () => void;
  isAprReady: boolean;
  isPtReady: boolean;
}

export function PreviewPanel({
  isLoading,
  error,
  liveFormData,
  analysisData,
  equipmentData,
  company,
  mobileView,
  isDownloading,
  onGeneratePdf,
  isAprReady,
  isPtReady,
}: PreviewPanelProps) {
  const canDownload = isPtReady || isAprReady;

  return (
    <div className={cn("relative flex-col bg-muted h-full", mobileView === 'preview' ? 'flex' : 'hidden xl:flex')}>
      <ScrollArea className="h-full">
        <div className="flex flex-col items-center w-full p-4 sm:p-8">
          {isLoading && (
            <div className="absolute inset-0 bg-muted/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-lg">
              <div className="flex flex-col items-center gap-4 text-center p-6 bg-background rounded-xl shadow-2xl">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <h3 className="text-xl font-semibold">
                  {ptBr.previewPanel.loading.title}
                </h3>
                <p className="text-muted-foreground">
                  {ptBr.previewPanel.loading.description}
                </p>
              </div>
            </div>
          )}
          
          <PrintPreview
              formData={liveFormData}
              analysisData={analysisData}
              equipmentData={equipmentData}
              company={company}
              error={error}
          />

        </div>
      </ScrollArea>
      <div className="xl:hidden sticky bottom-0 left-0 right-0 w-full bg-background/80 backdrop-blur-sm p-4 border-t">
           <Button
              onClick={onGeneratePdf}
              disabled={isDownloading || !canDownload}
              className="w-full"
          >
              {isDownloading ? (
                  <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {ptBr.actions.generatingPdf}
                  </>
              ) : (
                  <>
                  <Printer className="mr-2 h-4 w-4" />
                  {ptBr.actions.generatePdf}
                  </>
              )}
          </Button>
      </div>
    </div>
  );
}
