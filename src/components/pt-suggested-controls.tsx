'use client';

import { useMemo } from 'react';
import { Check, Lightbulb, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ptBr } from '@/lib/data/strings';
import {
  ROTULO_ORIGEM, idsValidos, regrasAtivas,
  type OrigemControle, type PtChecklist, type RegistroDeControle,
} from '@/lib/pt-rules';

/**
 * Painel de controles da PT.
 *
 * As sugestoes em si aparecem ao lado de cada item do checklist, no contexto
 * onde a pessoa decide. Aqui ficam so o gatilho da IA, o motivo da sugestao e
 * a lista do que ja foi aplicado, com a origem de cada um.
 */
type PtSuggestedControlsProps = {
  checklist: PtChecklist;
  registros: RegistroDeControle[];
  quantidadeSugerida: number;
  motivoIa?: string;
  erroIa?: string;
  carregandoIa?: boolean;
  podeSugerir?: boolean;
  onPedirSugestoes: () => void;
  onRemover: (itemId: string) => void;
};

function rotuloDoItem(itemId: string) {
  return ptBr.ptChecklist.items[itemId as keyof typeof ptBr.ptChecklist.items] || itemId;
}

export function PtSuggestedControls({
  checklist,
  registros,
  quantidadeSugerida,
  motivoIa,
  erroIa,
  carregandoIa = false,
  podeSugerir = false,
  onPedirSugestoes,
  onRemover,
}: PtSuggestedControlsProps) {
  const ativas = regrasAtivas(checklist);

  const aplicados = useMemo(() => {
    const porItem = new Map<string, OrigemControle>();
    for (const registro of registros) {
      if (!registro.removidoEm) porItem.set(registro.itemId, registro.origem);
    }
    const validos = idsValidos();
    return Object.entries(checklist || {})
      .filter(([itemId, marcado]) => marcado && validos.has(itemId))
      .map(([itemId]) => ({ itemId, origem: porItem.get(itemId) }));
  }, [checklist, registros]);

  return (
    <div className="overflow-hidden rounded-md border border-[#cfcbc0] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111111] px-5 py-3">
        <div>
          <h3 className="font-headline text-h3 text-white">Controles</h3>
          <p className="mt-0.5 text-xs text-white/80">
            As sugestões aparecem ao lado de cada item abaixo. Você decide o que marcar.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPedirSugestoes}
          disabled={carregandoIa || !podeSugerir}
          title={podeSugerir ? undefined : 'Descreva a tarefa na etapa anterior para receber sugestões'}
          className="h-9 bg-white"
        >
          {carregandoIa ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Sugerir com IA
        </Button>
      </div>

      <div className="space-y-3 px-5 py-4">
        {ativas.length === 0 && (
          <p className="text-sm italic text-[#6e6a61]">
            Marque o tipo de atividade abaixo para o sistema indicar os controles.
          </p>
        )}

        {quantidadeSugerida > 0 && (
          <p className="flex items-center gap-2 text-sm text-[#111111]">
            <span className="h-2 w-2 rounded-full bg-[#8a5a00]" aria-hidden="true" />
            {quantidadeSugerida} {quantidadeSugerida === 1 ? 'controle sugerido' : 'controles sugeridos'} —
            procure as marcas ao lado dos itens.
          </p>
        )}

        {erroIa && <p className="text-sm text-[#7a1f1f]">{erroIa}</p>}

        {motivoIa && !erroIa && (
          <div className="flex items-start gap-2 rounded-sm border border-[#e8d9ae] bg-[#faf3e4] px-3 py-2 text-sm text-[#8a5a00]">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {motivoIa}{' '}
              <strong>Confira cada item antes de marcar — a decisão é sua.</strong>
            </p>
          </div>
        )}

        {aplicados.length > 0 && (
          <div className="border-t border-[#e3e0d8] pt-3">
            <p className="label-oficial">Controles marcados ({aplicados.length})</p>
            <ul className="mt-2 space-y-1.5">
              {aplicados.map(({ itemId, origem }) => (
                <li
                  key={itemId}
                  className="flex items-start gap-2 rounded-sm border border-[#dde9e2] bg-[#eaf2ed] px-3 py-2"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1b5e3f]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#111111]">{rotuloDoItem(itemId)}</p>
                    <p className={cn('mt-0.5 text-xs', origem ? 'text-[#1b5e3f]' : 'text-[#6e6a61]')}>
                      {origem ? ROTULO_ORIGEM[origem] : 'Marcado no checklist'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemover(itemId)}
                    aria-label={`Remover ${rotuloDoItem(itemId)}`}
                    className="shrink-0 rounded-sm p-1.5 text-[#7a1f1f] transition-colors hover:bg-[#f0e2e0]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
