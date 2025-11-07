'use client';

import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Signature, Trash2, Check } from 'lucide-react';

interface SignaturePadProps {
  value?: string;
  onChange: (value: string) => void;
}

export function SignaturePad({ value, onChange }: SignaturePadProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const sigPadRef = useRef<SignatureCanvas>(null);

  const handleClear = () => {
    sigPadRef.current?.clear();
  };

  const handleSave = () => {
    if (sigPadRef.current?.isEmpty()) {
      onChange('');
    } else {
      const dataUrl = sigPadRef.current?.toDataURL('image/png') ?? '';
      onChange(dataUrl);
    }
    setIsOpen(false);
  };

  return (
    <div>
      <div className="relative w-full h-24 border rounded-md bg-gray-50 flex items-center justify-center">
        {value ? (
          <img src={value} alt="Signature" className="max-h-full max-w-full" />
        ) : (
          <p className="text-sm text-muted-foreground">Sem assinatura</p>
        )}
         <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={() => setIsOpen(true)}
        >
            <Signature className="h-4 w-4" />
            <span className="sr-only">Abrir para assinar</span>
        </Button>
      </div>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Desenhe sua Assinatura</DialogTitle>
          </DialogHeader>
          <div className="relative w-full aspect-video border rounded-md bg-white">
            <SignatureCanvas
              ref={sigPadRef}
              penColor="black"
              canvasProps={{ className: 'w-full h-full' }}
            />
          </div>
          <DialogFooter className='gap-2 sm:justify-end'>
            <Button variant="outline" onClick={handleClear}>
              <Trash2 className="mr-2 h-4 w-4" /> Limpar
            </Button>
            <Button onClick={handleSave}>
              <Check className="mr-2 h-4 w-4" /> Salvar Assinatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
