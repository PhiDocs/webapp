'use client';

import { Lightbulb } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

/**
 * Descricao da atividade com reuso do que ja foi escrito antes.
 *
 * A APR chama isso de "atividade" e a PT de "tarefa", mas o comportamento e o
 * mesmo: campo livre, sugestoes do historico, nada copiado automaticamente.
 */
type DocumentActivityPickerProps = {
  titulo: string;
  dica: string;
  placeholder?: string;
  valor: string;
  onChange: (valor: string) => void;
  /** Descricoes parecidas com a atual. Referencia, nunca copia automatica. */
  semelhantes?: string[];
  /** Ultimas descricoes usadas. Clicar preenche o campo. */
  recentes?: string[];
  icone?: React.ReactNode;
};

export function DocumentActivityPicker({
  titulo,
  dica,
  placeholder,
  valor,
  onChange,
  semelhantes = [],
  recentes = [],
  icone,
}: DocumentActivityPickerProps) {
  return (
    <div className="overflow-hidden rounded-md border border-[#cfcbc0] bg-white">
      <div className="flex items-center bg-[#111111] px-5 py-3">
        {icone}
        <h3 className="font-headline text-h3 text-white">{titulo}</h3>
      </div>

      <div className="space-y-4 px-5 pb-5 pt-4">
        <div className="flex items-start gap-2 rounded-md border border-[#e8d9ae] bg-[#f7f5f0] px-3 py-2 text-sm text-[#8a5a00]">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#7a1f1f]" />
          <p>{dica}</p>
        </div>

        <Textarea
          value={valor}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-h-[150px] resize-y rounded-md border-[#cfcbc0] text-base"
        />

        {semelhantes.length > 0 && (
          <div className="rounded-sm border border-[#cfcbc0] bg-[#faf9f5] px-3 py-2.5">
            <p className="label-oficial">Já feitas, parecidas com esta</p>
            <p className="mt-1 text-xs text-[#6e6a61]">
              Só para consulta. Nada é copiado automaticamente.
            </p>
            <ul className="mt-2 space-y-1">
              {semelhantes.map((texto, index) => (
                <li key={`semelhante-${index}`} className="text-sm text-[#111111]">
                  <span className="mr-1.5 text-[#6e6a61]">&bull;</span>
                  {texto}
                </li>
              ))}
            </ul>
          </div>
        )}

        {recentes.length > 0 && (
          <div>
            <p className="label-oficial mb-2">Descrições recentes</p>
            <div className="flex flex-wrap gap-2">
              {recentes.slice(0, 5).map((texto, index) => (
                <button
                  key={`${index}-${texto.slice(0, 12)}`}
                  type="button"
                  onClick={() => onChange(texto)}
                  title={texto}
                  className="max-w-full truncate rounded-pill border border-[#cfcbc0] bg-[#faf9f5] px-3 py-1.5 text-xs text-[#111111] transition-colors hover:border-[#7a1f1f] hover:bg-white"
                >
                  {texto}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
