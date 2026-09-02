'use client';

import { useState } from 'react';
import {
  CheckCircle2, Clock, Download, ExternalLink, History, Loader2,
  RefreshCw, Send, Share2, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { SignatureDocument } from '@/lib/types';
import type { DocumentEvent } from '@/repositories/document-event.repository';
import {
  CORES_POR_TOM, DOCUMENT_STATUS, STATUS_INFO,
  progressoAssinaturas, type DocumentStatus,
} from '@/lib/document-status';

type SignaturePanelProps = {
  status: DocumentStatus;
  signatureDocument?: SignatureDocument | null;
  eventos?: DocumentEvent[];
  onAtualizarStatus?: () => void;
  isAtualizando?: boolean;
  onEnviarLembrete?: () => void;
  isEnviandoLembrete?: boolean;
  onVisualizarPdf?: () => void;
  onBaixarPdf?: () => void;
  onCompartilhar?: () => void;
  onCarregarHistorico?: () => void;
  /** Arquiva o documento. So aparece quando todos ja assinaram. */
  onConcluir?: () => void;
};

const ROTULO_ACAO: Record<string, string> = {
  created: 'Documento criado',
  updated: 'Conteúdo alterado',
  sent_for_signature: 'Enviado para assinatura',
  signature_synced: 'Status sincronizado',
  signed: 'Assinado por todos',
  declined: 'Assinatura recusada',
  completed: 'Documento finalizado',
  cancelled: 'Documento cancelado',
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

export function SignaturePanel({
  status,
  signatureDocument,
  eventos = [],
  onAtualizarStatus,
  isAtualizando = false,
  onEnviarLembrete,
  isEnviandoLembrete = false,
  onVisualizarPdf,
  onBaixarPdf,
  onCompartilhar,
  onCarregarHistorico,
  onConcluir,
}: SignaturePanelProps) {
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const { concluidas, total } = progressoAssinaturas(signatureDocument);
  const info = STATUS_INFO[status];
  const cores = CORES_POR_TOM[info.tom];
  const finalizado = status === DOCUMENT_STATUS.SIGNED || status === DOCUMENT_STATUS.COMPLETED;
  const percentual = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  return (
    <div className="rounded-sm border border-[#cfcbc0] bg-white">
      {/* Situação */}
      <div
        className="border-b-2 px-4 py-4 sm:px-5"
        style={{ background: cores.fundo, borderBottomColor: cores.borda }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5" style={{ color: cores.texto }}>
            {finalizado ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            ) : status === DOCUMENT_STATUS.DECLINED || status === DOCUMENT_STATUS.CANCELLED ? (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <Clock className="mt-0.5 h-5 w-5 shrink-0" />
            )}
            <div>
              <p className="font-semibold">
                {finalizado ? 'Documento finalizado' : info.rotulo}
              </p>
              <p className="text-sm opacity-90">{info.descricao}</p>
            </div>
          </div>

          {onAtualizarStatus && signatureDocument && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAtualizarStatus}
              disabled={isAtualizando}
              className="h-9 bg-white"
            >
              {isAtualizando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Atualizar
            </Button>
          )}
        </div>

        {total > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium tabular-nums" style={{ color: cores.texto }}>
              {concluidas} de {total} {total === 1 ? 'assinatura concluída' : 'assinaturas concluídas'}
            </p>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/70"
              role="progressbar"
              aria-valuenow={percentual}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${percentual}%`, background: cores.ponto }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Signatários */}
      <div className="px-4 py-4 sm:px-5">
        <p className="label-oficial">Assinaturas</p>

        {!signatureDocument || total === 0 ? (
          <p className="mt-2 text-sm italic text-[#6e6a61]">
            Este documento ainda não foi enviado para assinatura.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-[#e3e0d8]">
            {signatureDocument.signers.map((pessoa, index) => {
              const assinou = pessoa.status === 'signed';
              const recusou = pessoa.status === 'declined';
              const tom = assinou ? 'ok' : recusou ? 'alerta' : 'andamento';
              const c = CORES_POR_TOM[tom];

              return (
                <li
                  key={`${pessoa.email}-${index}`}
                  className="flex flex-wrap items-center gap-3 py-3"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: c.ponto }}
                    aria-hidden="true"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#111111]">{pessoa.name}</p>
                    <p className="truncate text-xs text-[#6e6a61]">{pessoa.email}</p>
                  </div>

                  <span
                    className="shrink-0 rounded-pill px-2.5 py-1 text-xs font-semibold"
                    style={{ background: c.fundo, color: c.texto }}
                  >
                    {assinou ? 'Assinado' : recusou ? 'Recusado' : 'Aguardando assinatura'}
                  </span>

                  {assinou && onBaixarPdf ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0"
                      onClick={onBaixarPdf}
                    >
                      Ver assinatura
                    </Button>
                  ) : !assinou && pessoa.signingUrl ? (
                    <a
                      href={pessoa.signingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-sm border border-strong bg-card px-4 text-[13px] font-semibold uppercase tracking-[0.07em] transition-colors hover:bg-muted"
                    >
                      Assinar
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {signatureDocument && concluidas < total && onEnviarLembrete && (
          <div className="mt-3 border-t border-[#e3e0d8] pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEnviarLembrete}
              disabled={isEnviandoLembrete}
              className="h-9"
            >
              {isEnviandoLembrete ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar lembrete
            </Button>
            <p className="mt-1.5 text-xs text-[#6e6a61]">
              A Assinafy reenvia a notificação para todos que ainda não assinaram.
            </p>
          </div>
        )}
      </div>

      {/* Ações do documento concluído */}
      <div className="flex flex-col gap-2 border-t border-[#cfcbc0] bg-[#faf9f5] px-4 py-4 sm:flex-row sm:flex-wrap sm:px-5">
        {onVisualizarPdf && (
          <Button type="button" variant="outline" onClick={onVisualizarPdf} className="h-12 w-full sm:h-10 sm:w-auto">
            Visualizar PDF
          </Button>
        )}
        {finalizado && onBaixarPdf && (
          <Button type="button" variant="outline" onClick={onBaixarPdf} className="h-12 w-full sm:h-10 sm:w-auto">
            <Download className="h-4 w-4" />
            Baixar PDF
          </Button>
        )}
        {status === DOCUMENT_STATUS.SIGNED && onConcluir && (
          <Button
            type="button"
            onClick={onConcluir}
            className="h-12 w-full bg-[#1b5e3f] text-white hover:bg-[#164d34] sm:h-10 sm:w-auto"
          >
            <CheckCircle2 className="h-4 w-4" />
            Concluir documento
          </Button>
        )}
        {finalizado && onCompartilhar && (
          <Button type="button" variant="outline" onClick={onCompartilhar} className="h-12 w-full sm:h-10 sm:w-auto">
            <Share2 className="h-4 w-4" />
            Compartilhar
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full sm:ml-auto sm:h-10 sm:w-auto"
          onClick={() => {
            onCarregarHistorico?.();
            setHistoricoAberto(true);
          }}
        >
          <History className="h-4 w-4" />
          Ver histórico
        </Button>
      </div>

      <Dialog open={historicoAberto} onOpenChange={setHistoricoAberto}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline text-h3">Histórico do documento</DialogTitle>
          </DialogHeader>

          {eventos.length === 0 ? (
            <p className="text-sm italic text-[#6e6a61]">Nenhum evento registrado ainda.</p>
          ) : (
            <ol className="space-y-3">
              {eventos.map((evento) => (
                <li key={evento.id} className="border-b border-[#e3e0d8] pb-3 last:border-b-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-[#111111]">
                      {ROTULO_ACAO[evento.action] || evento.action}
                    </p>
                    <p className="text-xs tabular-nums text-[#6e6a61]">{dataHora(evento.createdAt)}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-[#6e6a61]">
                    {evento.userEmail || 'Usuário não identificado'}
                    {evento.version ? ` · versão ${evento.version}` : ''}
                    {evento.documentStatus
                      ? ` · ${STATUS_INFO[evento.documentStatus as DocumentStatus]?.rotulo || evento.documentStatus}`
                      : ''}
                  </p>
                  {evento.detail && (
                    <p className="mt-1 text-xs text-[#6e6a61]">{evento.detail}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
