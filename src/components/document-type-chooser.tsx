'use client';

import { FileText, ShieldCheck, ArrowRight } from 'lucide-react';
import { DOCUMENT_TYPES } from '@/lib/constants';
import type { SafetyFormValues } from '@/lib/types';

type DocumentTypeChooserProps = {
  onChoose: (tipo: SafetyFormValues['documentType']) => void;
};

const OPCOES = [
  {
    tipo: DOCUMENT_TYPES.APR,
    sigla: 'APR',
    nome: 'Análise Preliminar de Riscos',
    resumo: 'Levanta as etapas da atividade, os perigos e as medidas de controle antes do trabalho começar.',
    quando: 'Use antes de iniciar qualquer atividade com risco.',
    icone: ShieldCheck,
  },
  {
    tipo: DOCUMENT_TYPES.PT,
    sigla: 'PT',
    nome: 'Permissão de Trabalho',
    resumo: 'Autoriza formalmente a execução de uma atividade específica, com checklist e liberação assinada.',
    quando: 'Use para trabalho a quente, espaço confinado, altura e afins.',
    icone: FileText,
  },
] as const;

export function DocumentTypeChooser({ onChoose }: DocumentTypeChooserProps) {
  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-10 md:py-16">
      <p className="label-oficial">Novo documento</p>
      <h2 className="mt-2 font-headline text-h1 text-[#111111]">Novo documento de segurança</h2>
      <p className="mt-3 max-w-[52ch] text-[#6e6a61]">
        Escolha o tipo de documento que você precisa emitir. Dá para trocar depois, sem perder o
        que já foi preenchido.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {OPCOES.map((opcao) => {
          const Icone = opcao.icone;
          return (
            <button
              key={opcao.tipo}
              type="button"
              onClick={() => onChoose(opcao.tipo)}
              className="group flex flex-col rounded-sm border border-[#cfcbc0] bg-white p-6 text-left transition-colors hover:border-[#7a1f1f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-[#111111] text-white">
                  <Icone className="h-5 w-5" />
                </span>
                <span className="font-headline text-h2 text-[#111111]">{opcao.sigla}</span>
              </div>

              <p className="mt-4 font-semibold text-[#111111]">{opcao.nome}</p>
              <p className="mt-2 text-sm leading-6 text-[#6e6a61]">{opcao.resumo}</p>

              <p className="mt-4 border-t border-[#e3e0d8] pt-3 text-xs text-[#6e6a61]">
                {opcao.quando}
              </p>

              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.07em] text-[#7a1f1f]">
                Começar
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
