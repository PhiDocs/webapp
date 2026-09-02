'use client';

import { useState } from 'react';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type ListaDaEtapa = 'hazards' | 'risks' | 'consequences' | 'measures' | 'epis' | 'epcs';

export type ItensDaEtapa = Record<ListaDaEtapa, string[]>;

const GRUPOS: Array<{ campo: ListaDaEtapa; titulo: string; exemplo: string; cor: string }> = [
  { campo: 'hazards', titulo: 'Perigos', exemplo: 'Ex.: energia elétrica', cor: '#8a5a00' },
  { campo: 'risks', titulo: 'Riscos', exemplo: 'Ex.: choque elétrico', cor: '#7a1f1f' },
  { campo: 'consequences', titulo: 'Consequências', exemplo: 'Ex.: queimadura de 2º grau', cor: '#7a1f1f' },
  { campo: 'measures', titulo: 'Medidas preventivas', exemplo: 'Ex.: bloqueio e etiquetagem', cor: '#1b5e3f' },
  { campo: 'epis', titulo: 'EPIs', exemplo: 'Ex.: luva isolante classe 0', cor: '#1b5e3f' },
  { campo: 'epcs', titulo: 'EPCs', exemplo: 'Ex.: sinalização e isolamento', cor: '#1b5e3f' },
];

type AnalysisStepCardProps = {
  index: number;
  activity: string;
  itens: ItensDaEtapa;
  emEdicao: boolean;
  onToggleEdit: () => void;
  onRemove: () => void;
  onChangeActivity: (valor: string) => void;
  onChangeLista: (campo: ListaDaEtapa, itens: string[]) => void;
};

function ListaEditavel({
  titulo,
  exemplo,
  cor,
  itens,
  emEdicao,
  onChange,
}: {
  titulo: string;
  exemplo: string;
  cor: string;
  itens: string[];
  emEdicao: boolean;
  onChange: (itens: string[]) => void;
}) {
  const [rascunho, setRascunho] = useState('');

  const adicionar = () => {
    const valor = rascunho.trim();
    if (!valor) return;
    onChange([...itens, valor]);
    setRascunho('');
  };

  if (!emEdicao && itens.length === 0) return null;

  return (
    <div>
      <p className="label-oficial" style={{ color: cor }}>{titulo}</p>

      <ul className="mt-1.5 space-y-1">
        {itens.map((item, i) => (
          <li
            key={`${item}-${i}`}
            className="flex items-start gap-2 rounded-sm border border-[#e3e0d8] bg-white px-2.5 py-1.5 text-sm text-[#111111]"
          >
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: cor }}
              aria-hidden="true"
            />
            {emEdicao ? (
              <input
                value={item}
                onChange={(event) => {
                  const proximos = [...itens];
                  proximos[i] = event.target.value;
                  onChange(proximos);
                }}
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none"
              />
            ) : (
              <span className="min-w-0 flex-1">{item}</span>
            )}
            {emEdicao && (
              <button
                type="button"
                aria-label={`Remover ${item}`}
                onClick={() => onChange(itens.filter((_, indice) => indice !== i))}
                className="shrink-0 text-[#7a1f1f] transition-colors hover:text-[#5f1818]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}

        {itens.length === 0 && emEdicao && (
          <li className="rounded-sm border border-dashed border-[#cfcbc0] px-2.5 py-1.5 text-sm text-[#6e6a61]">
            Nada informado.
          </li>
        )}
      </ul>

      {emEdicao && (
        <div className="mt-1.5 flex gap-2">
          <Input
            value={rascunho}
            onChange={(event) => setRascunho(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                adicionar();
              }
            }}
            placeholder={exemplo}
            className="h-9 text-sm"
          />
          <button
            type="button"
            onClick={adicionar}
            aria-label={`Adicionar em ${titulo}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-[#cfcbc0] bg-white transition-colors hover:border-[#7a1f1f]"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function AnalysisStepCard({
  index,
  activity,
  itens,
  emEdicao,
  onToggleEdit,
  onRemove,
  onChangeActivity,
  onChangeLista,
}: AnalysisStepCardProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-sm border bg-[#faf9f5]',
        emEdicao ? 'border-[#7a1f1f]' : 'border-[#cfcbc0]',
      )}
    >
      <div className="flex items-start gap-3 border-b border-[#e3e0d8] px-4 py-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-[#111111] text-xs font-semibold text-white">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <p className="label-oficial">Etapa {index + 1}</p>
          {emEdicao ? (
            <Textarea
              value={activity}
              onChange={(event) => onChangeActivity(event.target.value)}
              placeholder="O que é feito nesta etapa"
              className="mt-1 min-h-[52px] resize-y bg-white text-sm"
            />
          ) : (
            <p className="mt-0.5 text-sm font-semibold text-[#111111]">
              {activity?.trim() || 'Etapa sem descrição'}
            </p>
          )}
        </div>

        <button
          type="button"
          aria-label={emEdicao ? `Concluir edição da etapa ${index + 1}` : `Editar etapa ${index + 1}`}
          onClick={onToggleEdit}
          className={cn(
            'shrink-0 rounded-sm p-1.5 transition-colors',
            emEdicao
              ? 'bg-[#7a1f1f] text-white'
              : 'text-[#6e6a61] hover:bg-[#ebe9e3] hover:text-[#111111]',
          )}
        >
          {emEdicao ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        </button>

        <button
          type="button"
          aria-label={`Remover etapa ${index + 1}`}
          onClick={onRemove}
          className="shrink-0 rounded-sm p-1.5 text-[#7a1f1f] transition-colors hover:bg-[#f0e2e0]"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 px-4 py-3 md:grid-cols-2">
        {GRUPOS.map((grupo) => (
          <ListaEditavel
            key={grupo.campo}
            titulo={grupo.titulo}
            exemplo={grupo.exemplo}
            cor={grupo.cor}
            itens={itens[grupo.campo] || []}
            emEdicao={emEdicao}
            onChange={(proximos) => onChangeLista(grupo.campo, proximos)}
          />
        ))}
      </div>
    </div>
  );
}
