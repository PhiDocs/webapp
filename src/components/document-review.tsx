'use client';

import { AlertTriangle, CheckCircle2, Eye, Loader2, Pencil, Send, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

/**
 * Casca da tela de revisao, compartilhada por APR e PT.
 *
 * O que e igual nos dois documentos mora aqui: a situacao no topo, a lista de
 * pendencias clicaveis, a confirmacao humana e o rodape de acoes. O conteudo
 * de cada secao continua sendo de cada documento — sao coisas diferentes e
 * devem continuar sendo.
 */

/** Uma informacao obrigatoria que falta, e a etapa que resolve. */
export type Pendencia = {
  texto: string;
  passo: number;
};

export function ReviewSection({
  titulo,
  passo,
  onEditStep,
  vazio,
  children,
}: {
  titulo: string;
  passo: number;
  onEditStep: (passo: number) => void;
  vazio?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-[#e3e0d8] px-4 py-4 last:border-b-0 sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <p className="label-oficial">{titulo}</p>
        <button
          type="button"
          onClick={() => onEditStep(passo)}
          className="flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.07em] text-[#7a1f1f] transition-colors hover:text-[#5f1818]"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </button>
      </div>
      <div className={cn('mt-2 text-sm', vazio ? 'italic text-[#6e6a61]' : 'text-[#111111]')}>
        {children}
      </div>
    </section>
  );
}

export function ReviewField({ rotulo, valor }: { rotulo: string; valor?: string }) {
  return (
    <div>
      <dt className="text-xs text-[#6e6a61]">{rotulo}</dt>
      <dd className={cn('mt-0.5', !valor && 'italic text-[#6e6a61]')}>{valor || 'Não informado'}</dd>
    </div>
  );
}

export function ReviewEmpty({ children }: { children: React.ReactNode }) {
  return <span className="italic text-[#6e6a61]">{children}</span>;
}

type DocumentReviewProps = {
  pendencias: Pendencia[];
  revisada: boolean;
  onRevisadaChange: (marcado: boolean) => void;
  onEditStep: (passo: number) => void;
  /** Cada documento tem seu texto de confirmacao e seu rotulo de emissao. */
  textoRevisao: React.ReactNode;
  tituloPronto: string;
  rotuloFinalizar: string;
  mensagemFinalizado?: string;
  onVisualizarDocumento?: () => void;
  onFinalizar?: () => void;
  isFinalizando?: boolean;
  jaFinalizado?: boolean;
  onEnviarAssinatura?: () => void;
  isEnviando?: boolean;
  children: React.ReactNode;
};

export function DocumentReview({
  pendencias,
  revisada,
  onRevisadaChange,
  onEditStep,
  textoRevisao,
  tituloPronto,
  rotuloFinalizar,
  mensagemFinalizado,
  onVisualizarDocumento,
  onFinalizar,
  isFinalizando = false,
  jaFinalizado = false,
  onEnviarAssinatura,
  isEnviando = false,
  children,
}: DocumentReviewProps) {
  const temPendencia = pendencias.length > 0;
  const situacao = temPendencia ? 'faltando' : revisada ? 'completo' : 'revisar';

  const cabecalho = {
    faltando: {
      icone: XCircle,
      titulo: `Faltam ${pendencias.length} ${pendencias.length === 1 ? 'informação' : 'informações'} para finalizar.`,
      fundo: 'bg-[#f6edec] border-[#7a1f1f]',
      cor: 'text-[#7a1f1f]',
    },
    revisar: {
      icone: AlertTriangle,
      titulo: tituloPronto,
      fundo: 'bg-[#faf3e4] border-[#8a5a00]',
      cor: 'text-[#8a5a00]',
    },
    completo: {
      icone: CheckCircle2,
      titulo: 'Documento completo e revisado. Pronto para finalizar.',
      fundo: 'bg-[#eaf2ed] border-[#1b5e3f]',
      cor: 'text-[#1b5e3f]',
    },
  }[situacao];

  const Icone = cabecalho.icone;

  return (
    <div className="rounded-sm border border-[#cfcbc0] bg-white">
      {/* Situação, sempre no topo */}
      <div className={cn('border-b-2 px-4 py-4 sm:px-5', cabecalho.fundo)}>
        <div className={cn('flex items-start gap-2.5', cabecalho.cor)}>
          <Icone className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="font-semibold">{cabecalho.titulo}</p>
        </div>

        {temPendencia && (
          <ul className="mt-3 space-y-1.5">
            {pendencias.map((pendencia, index) => (
              <li key={`${pendencia.passo}-${index}`}>
                <button
                  type="button"
                  onClick={() => onEditStep(pendencia.passo)}
                  className="flex w-full items-center gap-2 rounded-sm bg-white/70 px-3 py-2 text-left text-sm text-[#7a1f1f] transition-colors hover:bg-white"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#7a1f1f]" aria-hidden="true" />
                  <span className="min-w-0 flex-1">{pendencia.texto}</span>
                  <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.07em]">
                    Resolver
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Seções específicas de cada documento */}
      {children}

      {/* Validação humana e ações */}
      <div className="border-t border-[#cfcbc0] bg-[#faf9f5] px-4 py-4 sm:px-5">
        <label className="flex items-start gap-3 rounded-sm border border-[#e8d9ae] bg-[#faf3e4] px-3 py-2.5">
          <Checkbox
            className="mt-0.5"
            checked={revisada}
            onCheckedChange={(marcado) => onRevisadaChange(marcado === true)}
          />
          <span className="text-sm leading-6 text-[#8a5a00]">{textoRevisao}</span>
        </label>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {onVisualizarDocumento && (
            <Button
              type="button"
              variant="outline"
              onClick={onVisualizarDocumento}
              className="h-12 w-full sm:h-11 sm:w-auto"
            >
              <Eye className="h-4 w-4" />
              Visualizar documento
            </Button>
          )}

          {!jaFinalizado ? (
            <Button
              type="button"
              disabled={temPendencia || !revisada || isFinalizando}
              onClick={onFinalizar}
              className="h-12 w-full bg-[#7a1f1f] text-white hover:bg-[#5f1818] sm:h-11 sm:w-auto"
            >
              {isFinalizando && <Loader2 className="h-4 w-4 animate-spin" />}
              {rotuloFinalizar}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={isEnviando}
              onClick={onEnviarAssinatura}
              className="h-12 w-full bg-[#7a1f1f] text-white hover:bg-[#5f1818] sm:h-11 sm:w-auto"
            >
              {isEnviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar para assinatura
            </Button>
          )}
        </div>

        {jaFinalizado && mensagemFinalizado && (
          <p className="mt-2 text-right text-xs text-[#1b5e3f]">{mensagemFinalizado}</p>
        )}
      </div>
    </div>
  );
}
