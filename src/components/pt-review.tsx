'use client';

import { cn } from '@/lib/utils';
import {
  DocumentReview, ReviewField as Campo, ReviewSection as Secao,
} from '@/components/document-review';
import { ptChecklistItems } from '@/lib/data/pt-checklist';
import { ptBr } from '@/lib/data/strings';
import { PT_FIT_STATUS } from '@/lib/constants';
import { secaoVisivel, type PendenciaPt } from '@/lib/pt-rules';
import type { SafetyFormValues } from '@/lib/types';

type PtReviewProps = {
  values: SafetyFormValues;
  companyLabel: string;
  pendencias: PendenciaPt[];
  revisada: boolean;
  onRevisadaChange: (marcado: boolean) => void;
  onEditStep: (passo: number) => void;
  onVisualizarDocumento?: () => void;
  onFinalizar?: () => void;
  isFinalizando?: boolean;
  jaFinalizado?: boolean;
  onEnviarAssinatura?: () => void;
  isEnviando?: boolean;
};

function formatarData(valor?: string) {
  if (!valor) return '';
  const [ano, mes, dia] = valor.split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : valor;
}

export function PtReview({
  values,
  companyLabel,
  pendencias,
  revisada,
  onRevisadaChange,
  onEditStep,
  onVisualizarDocumento,
  onFinalizar,
  isFinalizando = false,
  jaFinalizado = false,
  onEnviarAssinatura,
  isEnviando = false,
}: PtReviewProps) {
  const pt = values.pt;
  const checklist = pt?.ptChecklist || {};
  const colaboradores = (pt?.ptColaboradores || []).filter((pessoa) => pessoa?.name);
  const responsaveis = (pt?.ptResponsaveis || []).filter((pessoa) => pessoa?.name);
  const vigias = (pt?.ptVigias || []).filter((pessoa) => pessoa?.name);

  // Só as seções que se aplicam a esta permissão entram no resumo.
  const condicoes = ptChecklistItems
    .filter((secao) => secaoVisivel(secao.id, checklist))
    .map((secao) => ({
      titulo: ptBr.ptChecklist.titles[secao.id as keyof typeof ptBr.ptChecklist.titles],
      marcados: secao.items
        .filter((item) => checklist[item.id])
        .map((item) => ptBr.ptChecklist.items[item.id as keyof typeof ptBr.ptChecklist.items]),
    }))
    .filter((secao) => secao.marcados.length > 0);

  return (
    <DocumentReview
      pendencias={pendencias}
      revisada={revisada}
      onRevisadaChange={onRevisadaChange}
      onEditStep={onEditStep}
      tituloPronto="Pronta para emissão. Confirme que você revisou a permissão."
      rotuloFinalizar="Finalizar PT"
      textoRevisao={(
        <>
          <strong>Revise a permissão antes de emitir.</strong>{' '}
          Ao marcar, você assume que as condições e os controles conferem com a atividade
          que será executada.
        </>
      )}
      onVisualizarDocumento={onVisualizarDocumento}
      onFinalizar={onFinalizar}
      isFinalizando={isFinalizando}
      jaFinalizado={jaFinalizado}
      onEnviarAssinatura={onEnviarAssinatura}
      isEnviando={isEnviando}
    >
      <Secao titulo="Contexto" passo={0} onEditStep={onEditStep}>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Campo rotulo="Empresa" valor={companyLabel} />
          <Campo rotulo="Local da atividade" valor={pt?.ptLocalAtividade} />
          <Campo rotulo="Equipamento / linha" valor={pt?.ptEquipamentoLinha} />
          <Campo
            rotulo="Período"
            valor={
              pt?.ptData
                ? `${formatarData(pt.ptData)} · ${pt.ptHoraInicio || '--:--'} às ${pt.ptHoraFim || '--:--'}`
                : undefined
            }
          />
        </dl>
        <div className="mt-3 border-t border-[#e3e0d8] pt-3">
          <p className="text-xs text-[#6e6a61]">Tarefa</p>
          <p className={cn('mt-0.5 whitespace-pre-line', !pt?.ptDescricaoTarefa && 'italic text-[#6e6a61]')}>
            {pt?.ptDescricaoTarefa?.trim() || 'Não descrita'}
          </p>
        </div>
      </Secao>

      <Secao
        titulo="Condições e requisitos"
        passo={2}
        onEditStep={onEditStep}
        vazio={condicoes.length === 0}
      >
        {condicoes.length === 0 ? (
          'Nenhuma condição marcada.'
        ) : (
          <div className="space-y-2.5">
            {condicoes.map((secao) => (
              <div key={secao.titulo}>
                <p className="text-xs text-[#6e6a61]">{secao.titulo}</p>
                <p className="mt-0.5">{secao.marcados.join(' · ')}</p>
              </div>
            ))}
          </div>
        )}
      </Secao>

      {pt?.ptEnableEspacoConfinado && (
        <Secao titulo="Avaliação de espaço confinado" passo={2} onEditStep={onEditStep}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
            <Campo rotulo="Oxigênio" valor={pt?.ptOxigenio} />
            <Campo rotulo="L.E." valor={pt?.ptLE} />
            <Campo rotulo="H₂S" valor={pt?.ptH2S} />
            <Campo rotulo="CO₂" valor={pt?.ptCO2} />
          </dl>
        </Secao>
      )}

      <Secao
        titulo={`Participantes (${colaboradores.length + vigias.length})`}
        passo={3}
        onEditStep={onEditStep}
        vazio={colaboradores.length === 0 && vigias.length === 0}
      >
        {colaboradores.length === 0 && vigias.length === 0 ? (
          'Nenhum participante adicionado.'
        ) : (
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#e3e0d8]">
                  <th className="px-1 pb-1.5 text-left text-xs font-medium text-[#6e6a61]">Nome</th>
                  <th className="px-1 pb-1.5 text-left text-xs font-medium text-[#6e6a61]">RG / CPF</th>
                  <th className="px-1 pb-1.5 text-left text-xs font-medium text-[#6e6a61]">Função</th>
                  <th className="px-1 pb-1.5 text-left text-xs font-medium text-[#6e6a61]">Apto</th>
                </tr>
              </thead>
              <tbody>
                {[...colaboradores, ...vigias.map((v) => ({ ...v, func: `${v.func || ''} (vigia)` }))].map((pessoa, index) => (
                  <tr key={`${pessoa.name}-${index}`} className="border-b border-[#f2f1ed] last:border-b-0">
                    <td className="px-1 py-1.5">{pessoa.name}</td>
                    <td className="px-1 py-1.5 tabular-nums text-[#6e6a61]">{pessoa.rgCpf || '—'}</td>
                    <td className="px-1 py-1.5 text-[#6e6a61]">{pessoa.func || '—'}</td>
                    <td className="px-1 py-1.5 text-[#6e6a61]">
                      {pessoa.apto === PT_FIT_STATUS.YES ? 'Sim' : pessoa.apto === PT_FIT_STATUS.NO ? 'Não' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>

      <Secao
        titulo={`Liberação e assinaturas (${responsaveis.length})`}
        passo={4}
        onEditStep={onEditStep}
        vazio={responsaveis.length === 0}
      >
        {responsaveis.length === 0 ? (
          'Ninguém definido para liberar a atividade.'
        ) : (
          <ul className="space-y-1">
            {responsaveis.map((pessoa, index) => (
              <li key={`${pessoa.name}-${index}`}>
                {pessoa.name}
                {pessoa.role ? ` — ${pessoa.role}` : ''}
              </li>
            ))}
          </ul>
        )}
      </Secao>

    </DocumentReview>
  );
}
