'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronsLeft, ChevronsRight, EyeOff, Maximize2, Minimize2, Search, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PrintPreview } from '@/components/print-preview';
import type { SafetyFormValues, Company } from '@/lib/types';
import type { SafetyAnalysisOutput, ProtectiveEquipmentOutput } from '@/server/ai-actions';

interface DocumentPreviewPanelProps {
  formData: SafetyFormValues;
  analysisData: SafetyAnalysisOutput | null;
  equipmentData: ProtectiveEquipmentOutput | null;
  company: Company | null;
  error?: string | null;
  panelWidth?: number;
  onHide?: () => void;
  onMinimizedChange?: (isMinimized: boolean) => void;
  onWidthChange?: (width: number) => void;
}

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const PANEL_PADDING = 24;
const MIN_PANEL_WIDTH = 360;
const MAX_PANEL_WIDTH = 640;
const DEFAULT_PANEL_WIDTH = 640;
const DEFAULT_PREVIEW_SCALE = 0.7;

export function DocumentPreviewPanel({
  formData,
  analysisData,
  equipmentData,
  company,
  error,
  panelWidth = DEFAULT_PANEL_WIDTH,
  onHide,
  onMinimizedChange,
  onWidthChange,
}: DocumentPreviewPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomMode, setZoomMode] = useState<'fit' | 'custom'>('custom');
  const [customScale, setCustomScale] = useState(DEFAULT_PREVIEW_SCALE);
  const [viewportWidth, setViewportWidth] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const updateWidth = () => setViewportWidth(node.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const fitScale = useMemo(() => {
    if (!viewportWidth) return 0.32;
    return Math.min(0.5, Math.max(0.2, (viewportWidth - PANEL_PADDING) / PAGE_WIDTH));
  }, [viewportWidth]);

  const activeScale = zoomMode === 'fit' ? fitScale : customScale;
  const scaledWidth = PAGE_WIDTH * activeScale;
  const scaledHeight = PAGE_HEIGHT * activeScale;

  const toggleMinimize = () => {
    const next = !isMinimized;
    setIsMinimized(next);
    onMinimizedChange?.(next);
  };

  const zoomIn = () => {
    setZoomMode('custom');
    setCustomScale((current) => Math.min(0.7, Number((current + 0.04).toFixed(2))));
  };

  const zoomOut = () => {
    setZoomMode('custom');
    setCustomScale((current) => Math.max(0.2, Number((current - 0.04).toFixed(2))));
  };

  const resetZoom = () => {
    setZoomMode('custom');
    setCustomScale(DEFAULT_PREVIEW_SCALE);
  };

  const expandPanel = () => {
    onWidthChange?.(Math.min(MAX_PANEL_WIDTH, panelWidth + 48));
  };

  const shrinkPanel = () => {
    onWidthChange?.(Math.max(MIN_PANEL_WIDTH, panelWidth - 48));
  };

  const previewDocument = (
    <div
      className="overflow-hidden border border-[#ddd] bg-white shadow-[0_12px_24px_rgba(16,24,40,0.12)]"
      style={{ width: `${scaledWidth}px`, minHeight: `${scaledHeight}px` }}
    >
      <div
        className="origin-top-left"
        style={{
          width: `${PAGE_WIDTH}px`,
          minHeight: `${PAGE_HEIGHT}px`,
          transform: `scale(${activeScale})`,
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
  );

  return (
    <div
      className={`fixed right-0 top-16 z-10 hidden h-[calc(100vh-64px)] border-l border-[#e6cfc1] bg-[#f3f4f6] transition-all duration-300 ease-in-out xl:flex ${
        isMinimized ? 'w-[72px]' : ''
      }`}
      style={isMinimized ? undefined : { width: `${panelWidth}px` }}
    >
      <div className="flex h-full w-full flex-col">
        <div className="flex h-16 items-center justify-between gap-2 border-b border-[#e6cfc1] bg-[#f8f8f8] px-4">
          {!isMinimized && (
            <h3 className="font-headline text-[16px] font-semibold leading-5 text-[#191c1e]">
              Pre-visualizacao
            </h3>
          )}
          <div className="ml-auto flex items-center gap-2">
            {!isMinimized && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-white" onClick={shrinkPanel} title="Diminuir area do painel">
                  <ChevronsRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-white" onClick={expandPanel} title="Aumentar area do painel">
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-white" onClick={zoomOut} title="Diminuir zoom">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-white" onClick={zoomIn} title="Aumentar zoom">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 rounded-md px-2 text-xs hover:bg-white" onClick={resetZoom} title="Ajustar ao painel">
                  {Math.round(activeScale * 100)}%
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-white" onClick={() => setIsZoomOpen(true)} title="Ampliar">
                  <Search className="h-4 w-4" />
                </Button>
                {onHide && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-white" onClick={onHide} title="Fechar pre-visualizacao">
                    <EyeOff className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md hover:bg-white"
              onClick={toggleMinimize}
              title={isMinimized ? 'Expandir painel' : 'Recolher painel'}
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {!isMinimized ? (
          <div ref={viewportRef} className="flex-1 overflow-auto bg-[#efefef] p-3">
            <div className="flex min-h-full items-start justify-center">
              {previewDocument}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="-rotate-90 whitespace-nowrap text-xs font-semibold tracking-[0.2em] text-[#4a5b73]">
              PREVIEW
            </div>
          </div>
        )}
      </div>

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
