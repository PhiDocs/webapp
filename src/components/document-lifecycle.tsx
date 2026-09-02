'use client';

import { Ban, Check, Circle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocumentEvent } from '@/repositories/document-event.repository';
import {
  CORES_POR_TOM, DOCUMENT_STATUS, ROTULO_ACAO, STATUS_INFO, TRILHA,
  acoesPermitidas, motivoDoBloqueio, type DocumentStatus,
} from '@/lib/document-status';

/** Espelha o limite de DocumentEventRepository.listByDocument. */
const LIMITE_HISTORICO = 50;

type DocumentLifecycleProps = {
  status: DocumentStatus;
  versao?: number;
  eventos?: DocumentEvent[];
};

const ROTULO_EVENTO: Record<string, string> = {
  created: 'Criado',
  updated: 'Editado',
  in_review: 'Revisado',
  pdf_generated: 'PDF gerado',
  sent_for_signature: 'Enviado para assinatura',
  signature_synced: 'Status sincronizado',
  signed: 'Assinado por todos',
  declined: 'Assinatura recusada',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
  blocked_edit: 'Alteração bloqueada',
};

function dataHora(valor: string) {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor;
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function DocumentLifecycle({ status, versao, eventos = [] }: DocumentLifecycleProps) {
  const info = STATUS_INFO[status];
  const cores = CORES_POR_TOM[info.tom];
  const permitidas = acoesPermitidas(status);
  const bloqueio = motivoDoBloqueio(status);

  // Estados fora da trilha principal (recusado, cancelado) nao tem posicao nela.
  const posicao = TRILHA.indexOf(status);
  const foraDaTrilha = posicao === -1;

  // A timeline mostra o que realmente aconteceu, na ordem em que aconteceu.
  const linhaDoTempo = [...eventos]
    .filter((evento) => ROTULO_EVENTO[evento.action])
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="rounded-sm border border-[#cfcbc0] bg-white">
      {/* Situação atual */}
      <div
        className="border-b-2 px-4 py-4 sm:px-5"
        style={{ background: cores.fundo, borderBottomColor: cores.borda }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="rounded-pill px-3 py-1 text-sm font-semibold"
            style={{ background: cores.ponto, color: '#ffffff' }}
          >
            {info.rotulo}
          </span>
          {versao ? (
            <span className="text-xs tabular-nums" style={{ color: cores.texto }}>
              versão {versao}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm" style={{ color: cores.texto }}>{info.descricao}</p>
      </div>

      {/* Trilha do ciclo de vida */}
      {!foraDaTrilha && (
        <div className="border-b border-[#e3e0d8] px-4 py-4 sm:px-5">
          <p className="label-oficial mb-3">Ciclo de vida</p>
          <ol className="flex flex-wrap gap-x-1 gap-y-2">
            {TRILHA.map((etapa, index) => {
              const passou = index < posicao;
              const atual = index === posicao;
              return (
                <li key={etapa} className="flex items-center gap-1">
                  <span
                    className={cn(
                      'flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs',
                      atual && 'border-[#111111] bg-[#111111] font-semibold text-white',
                      passou && 'border-[#dde9e2] bg-[#eaf2ed] text-[#1b5e3f]',
                      !atual && !passou && 'border-[#e3e0d8] text-[#6e6a61]',
                    )}
                  >
                    {passou ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Circle className={cn('h-2.5 w-2.5', atual && 'fill-current')} />
                    )}
                    {STATUS_INFO[etapa].rotulo}
                  </span>
                  {index < TRILHA.length - 1 && (
                    <span className="text-[#cfcbc0]" aria-hidden="true">→</span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* O que pode e o que não pode */}
      <div className="grid gap-4 border-b border-[#e3e0d8] px-4 py-4 sm:grid-cols-2 sm:px-5">
        <div>
          <p className="label-oficial">Ações permitidas</p>
          <ul className="mt-2 space-y-1">
            {permitidas.map((acao) => (
              <li key={acao} className="flex items-center gap-2 text-sm text-[#111111]">
                <Check className="h-3.5 w-3.5 shrink-0 text-[#1b5e3f]" />
                {ROTULO_ACAO[acao]}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="label-oficial">Bloqueado</p>
          {bloqueio ? (
            <div className="mt-2 flex items-start gap-2 rounded-sm border border-[#e4cfcc] bg-[#f6edec] px-3 py-2">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7a1f1f]" />
              <p className="text-sm text-[#7a1f1f]">{bloqueio}</p>
            </div>
          ) : (
            <p className="mt-2 flex items-center gap-2 text-sm text-[#6e6a61]">
              <Ban className="h-3.5 w-3.5 shrink-0" />
              Nada bloqueado neste estado.
            </p>
          )}
        </div>
      </div>

      {/* Timeline do que aconteceu. Fica recolhida: em documento antigo sao
          dezenas de linhas, e elas nao podem empurrar o resto da pagina. */}
      <div className="px-4 py-4 sm:px-5">
        {linhaDoTempo.length === 0 ? (
          <>
            <p className="label-oficial">Histórico</p>
            <p className="mt-2 text-sm italic text-[#6e6a61]">
              Nenhum evento registrado ainda.
            </p>
          </>
        ) : (
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm py-1 hover:text-[#7a1f1f]">
              <span className="label-oficial">
                Histórico ({linhaDoTempo.length}
                {linhaDoTempo.length === LIMITE_HISTORICO ? '+' : ''})
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.07em] text-[#6e6a61] group-open:hidden">
                Ver
              </span>
              <span className="hidden text-xs font-semibold uppercase tracking-[0.07em] text-[#6e6a61] group-open:inline">
                Ocultar
              </span>
            </summary>
          <ol className="mt-3 max-h-80 space-y-0 overflow-y-auto pr-1">
            {linhaDoTempo.map((evento, index) => (
              <li key={evento.id} className="relative flex gap-3 pb-4 last:pb-0">
                <div className="flex flex-col items-center">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#7a1f1f]" />
                  {index < linhaDoTempo.length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-[#e3e0d8]" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-[#111111]">
                      {ROTULO_EVENTO[evento.action]}
                    </p>
                    <p className="text-xs tabular-nums text-[#6e6a61]">
                      {dataHora(evento.createdAt)}
                    </p>
                  </div>
                  <p className="text-xs text-[#6e6a61]">
                    {evento.userEmail || 'Usuário não identificado'}
                    {evento.version ? ` · versão ${evento.version}` : ''}
                  </p>
                  {evento.detail && (
                    <p className="mt-0.5 text-xs text-[#6e6a61]">{evento.detail}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
          </details>
        )}
      </div>
    </div>
  );
}
