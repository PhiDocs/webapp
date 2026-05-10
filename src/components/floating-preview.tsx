'use client';

import { useMemo, useState } from 'react';
import { Search, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrintPreview } from '@/components/print-preview';
import type { SafetyFormValues, Company } from '@/lib/types';
import type { SafetyAnalysisOutput, ProtectiveEquipmentOutput } from '@/server/ai-actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FloatingPreviewProps {
  formData: SafetyFormValues;
  analysisData: SafetyAnalysisOutput | null;
  equipmentData: ProtectiveEquipmentOutput | null;
  company: Company | null;
  error?: string | null;
  onClose?: () => void;
  onMinimizedChange?: (isMinimized: boolean) => void;
}

export function FloatingPreview({
  formData,
  analysisData,
  equipmentData,
  company,
  error,
  onMinimizedChange,
}: FloatingPreviewProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const documentWidth = 794;
  const documentHeight = 1123;
  const [previewScale, setPreviewScale] = useState(0.34);
  const previewWidth = useMemo(() => documentWidth * previewScale, [documentWidth, previewScale]);
  const previewHeight = useMemo(() => documentHeight * previewScale, [documentHeight, previewScale]);

  const handleMinimizeToggle = () => {
    const nextValue = !isMinimized;
    setIsMinimized(nextValue);
    onMinimizedChange?.(nextValue);
  };

  const handleZoomOut = () => setPreviewScale((current) => Math.max(0.24, Number((current - 0.03).toFixed(2))));
  const handleZoomIn = () => setPreviewScale((current) => Math.min(0.5, Number((current + 0.03).toFixed(2))));
  const handleZoomReset = () => setPreviewScale(0.34);

  return (
    <div
      className={`fixed right-0 top-16 z-10 hidden h-[calc(100vh-64px)] border-l border-[#e6cfc1] bg-[#f3f4f6] transition-all duration-300 ease-in-out xl:flex ${
        isMinimized ? 'w-[68px]' : 'w-[360px]'
      }`}
    >
      <div className="flex h-16 items-center justify-between gap-2 border-b border-[#e6cfc1] bg-[#f8f8f8] px-4">
        {!isMinimized && (
          <h3 className="font-headline text-[16px] font-semibold leading-5 text-[#191c1e]">
            Pre-visualizacao
          </h3>
        )}
        <div className="ml-auto flex items-center gap-2">
          {!isMinimized && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md text-[#2a2d34] hover:bg-white"
                onClick={handleZoomOut}
                title="Diminuir zoom"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md text-[#2a2d34] hover:bg-white"
                onClick={handleZoomIn}
                title="Aumentar zoom"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-md px-2 text-xs text-[#2a2d34] hover:bg-white"
                onClick={handleZoomReset}
                title="Redefinir zoom"
              >
                {Math.round(previewScale * 100)}%
              </Button>
            </>
          )}
          {!isMinimized && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md text-[#2a2d34] hover:bg-white"
              onClick={() => setIsZoomOpen(true)}
              title="Ampliar preview"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md text-[#2a2d34] hover:bg-white"
            onClick={handleMinimizeToggle}
            title={isMinimized ? 'Expandir preview' : 'Minimizar preview'}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {!isMinimized ? (
        <div className="h-[calc(100vh-64px-64px)] overflow-y-auto overflow-x-hidden bg-[#efefef] px-3 py-4">
          <div className="flex w-full justify-center">
            <div
              className="overflow-hidden border border-[#ddd] bg-white shadow-[0_12px_24px_rgba(16,24,40,0.12)]"
              style={{ width: `${previewWidth}px`, height: `${previewHeight}px` }}
            >
              <div
                className="origin-top-left"
                style={{
                  width: `${documentWidth}px`,
                  height: `${documentHeight}px`,
                  transform: `scale(${previewScale})`,
                }}
              >
                <PrintPreview
                  formData={formData}
                  analysisData={analysisData}
                  equipmentData={equipmentData}
                  company={company}
                  error={error}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-64px-64px)] items-center justify-center">
          <div className="-rotate-90 whitespace-nowrap font-code text-code-label text-[#4a5b73]">
            PREVIEW
          </div>
        </div>
      )}

      <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
        <DialogContent className="h-[92vh] max-w-[96vw] p-0">
          <DialogHeader className="border-b border-[#e1d6cb] px-5 py-4">
            <DialogTitle>Pre-visualizacao</DialogTitle>
          </DialogHeader>
          <div className="h-[calc(92vh-70px)] overflow-auto bg-[#eceef1] p-6">
            <div className="mx-auto w-fit overflow-hidden bg-white shadow-[0_10px_30px_rgba(12,30,54,0.12)]">
              <PrintPreview
                formData={formData}
                analysisData={analysisData}
                equipmentData={equipmentData}
                company={company}
                error={error}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
