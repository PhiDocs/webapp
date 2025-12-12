'use client';

import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, FormInput, Eye } from 'lucide-react';
import { ptBr } from '@/lib/data/strings';

interface HeaderProps {
  mobileView: 'form' | 'preview';
  setMobileView: (view: 'form' | 'preview') => void;
  onGeneratePdf: () => void;
  isDownloading: boolean;
  isAprReady: boolean;
  isPtReady: boolean;
}

export function Header({
  mobileView,
  setMobileView,
  onGeneratePdf,
  isDownloading,
  isAprReady,
  isPtReady,
}: HeaderProps) {
  const canDownload = isPtReady || isAprReady;

  return (
    <header className="sticky top-0 z-20 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Logo className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold text-foreground font-headline">
            {ptBr.header.title}
          </h1>
        </div>
        
        {/* Mobile View Toggles */}
        <div className="xl:hidden flex items-center gap-1 rounded-md bg-muted p-1">
            <Button
              size="sm"
              variant={mobileView === 'form' ? 'secondary' : 'ghost'}
              onClick={() => setMobileView('form')}
              className="flex-1"
            >
                <FormInput className="mr-2 h-4 w-4" />
                {ptBr.header.form}
            </Button>
            <Button
              size="sm"
              variant={mobileView === 'preview' ? 'secondary' : 'ghost'}
              onClick={() => setMobileView('preview')}
              className="flex-1"
            >
                <Eye className="mr-2 h-4 w-4" />
                {ptBr.header.preview}
            </Button>
        </div>

        <div className="hidden xl:flex items-center gap-2">
          <Button
            onClick={onGeneratePdf}
            disabled={isDownloading || !canDownload}
          >
            {isDownloading ? (
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
        </div>
      </div>
    </header>
  );
}
