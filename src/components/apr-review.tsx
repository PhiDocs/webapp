'use client';

import { cn } from '@/lib/utils';
import {
  DocumentReview, ReviewField as Campo, ReviewSection as Secao, type Pendencia,
} from '@/components/document-review';
import type { SafetyFormValues } from '@/lib/types';
import type { ProtectiveEquipmentOutput } from '@/server/ai-actions';

export type { Pendencia };

type AprReviewProps = {
  values: SafetyFormValues;
  equipment?: ProtectiveEquipmentOutput | null;
  companyLabel: string;
  pendencias: Pendencia[];
  analiseRevisada: boolean;
  onAnaliseRevisadaChange: (marcado: boolean) => void;
  /** Abre a etapa numa janela, sem tirar a pessoa da revisao. */
  onEditStep: (passo: number) => void;
  onVisualizarDocumento?: () => void;
  onFinalizar?: () => void;
  isFinalizando?: boolean;
  jaFinalizado?: boolean;
  onEnviarAssinatura?: () => void;
  isEnviando?: boolean;
};

/** Etapas geradas antes das listas so tem texto: cada linha vira um item. */
function paraItens(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.map((item) => String(item).trim()).filter(Boolean);
  if (typeof valor === 'string') return valor.split('\n').map((linha) => linha.trim()).filter(Boolean);
  return [];
}

function formatarData(valor?: string) {
  if (!valor) return '';
  const [ano, mes, dia] = valor.split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : valor;
}

function duracao(inicio?: string, fim?: string) {
  if (!inicio || !fim) return '';
  const a = new Date(inicio).getTime();
  const b = new Date(fim).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return '';
  const dias = Math.round((b - a) / 86400000) + 1;
  return dias === 1 ? '1 dia' : `${dias} dias`;
}

export function AprReview({
  values,
  equipment,
  companyLabel,
  pendencias,
  analiseRevisada,
  onAnaliseRevisadaChange,
  onEditStep,
  onVisualizarDocumento,
  onFinalizar,
  isFinalizando = false,
  jaFinalizado = false,
  onEnviarAssinatura,
  isEnviando = false,
}: AprReviewProps) {
  const etapas = (values.analysisSteps || []).filter(
    (etapa) => etapa?.activity || etapa?.potentialRisks || etapa?.preventiveMeasures,
  );
  const equipe = (values.teamMembers || []).filter((pessoa) => pessoa?.name);
  const responsaveis = (values.responsiblePersons || []).filter((pessoa) => pessoa?.name);
  const participantes = [
    ...equipe.map((pessoa) => ({ ...pessoa, papel: 'Equipe de trabalho' })),
    ...responsaveis.map((pessoa) => ({ ...pessoa, papel: 'Responsável' })),
  ];

  return (
    <DocumentReview
      pendencias={pendencias}
      revisada={analiseRevisada}
      onRevisadaChange={onAnaliseRevisadaChange}
      onEditStep={onEditStep}
      tituloPronto="Requer revisão. Confirme que você validou a análise."
      rotuloFinalizar="Finalizar APR"
      mensagemFinalizado="APR finalizada e salva como rascunho. Envie para assinatura quando quiser."
      textoRevisao={(
        <>
          <strong>Revise as informações antes de finalizar o documento.</strong>{' '}
          O conteúdo foi sugerido por inteligência artificial e precisa da validação de um
          responsável técnico. Ao marcar, você assume essa revisão.
        </>
      )}
      onVisualizarDocumento={onVisualizarDocumento}
      onFinalizar={onFinalizar}
      isFinalizando={isFinalizando}
      jaFinalizado={jaFinalizado}
      onEnviarAssinatura={onEnviarAssinatura}
      isEnviando={isEnviando}
    >
      {/* Situação do documento, sempre no topo */}
      <Secao titulo="Dados da atividade" passo={0} onEditStep={onEditStep}>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Campo rotulo="Empresa" valor={companyLabel} />
          <Campo rotulo="Local" valor={values.workName} />
          <Campo rotulo="Detalhe do local" valor={values.workLocationDetails} />
          <Campo
            rotulo="Período"
            valor={
              values.startDate
                ? `${formatarData(values.startDate)}${values.endDate ? ` até ${formatarData(values.endDate)}` : ''}${
                    duracao(values.startDate, values.endDate) ? ` · ${duracao(values.startDate, values.endDate)}` : ''
                  }`
                : undefined
            }
          />
        </dl>
        <div className="mt-3 border-t border-[#e3e0d8] pt-3">
          <p className="text-xs text-[#6e6a61]">Atividade</p>
          <p className={cn('mt-0.5 whitespace-pre-line', !values.activityDescription && 'italic text-[#6e6a61]')}>
            {values.activityDescription?.trim() || 'Não informada'}
          </p>
        </div>
      </Secao>

      <Secao
        titulo={`Participantes (${participantes.length})`}
        passo={3}
        onEditStep={onEditStep}
        vazio={participantes.length === 0}
      >
        {participantes.length === 0 ? (
          'Nenhuma pessoa vinculada ao documento.'
        ) : (
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[380px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#e3e0d8]">
                  <th className="px-1 pb-1.5 text-left text-xs font-medium text-[#6e6a61]">Nome</th>
                  <th className="px-1 pb-1.5 text-left text-xs font-medium text-[#6e6a61]">Cargo / Função</th>
                  <th className="px-1 pb-1.5 text-left text-xs font-medium text-[#6e6a61]">Papel</th>
                </tr>
              </thead>
              <tbody>
                {participantes.map((pessoa, index) => (
                  <tr key={`${pessoa.name}-${index}`} className="border-b border-[#f2f1ed] last:border-b-0">
                    <td className="px-1 py-1.5">{pessoa.name}</td>
                    <td className="px-1 py-1.5 text-[#6e6a61]">{pessoa.role || '—'}</td>
                    <td className="px-1 py-1.5 text-[#6e6a61]">{pessoa.papel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>

      <Secao
        titulo={`Etapas da atividade (${etapas.length})`}
        passo={4}
        onEditStep={onEditStep}
        vazio={etapas.length === 0}
      >
        {etapas.length === 0 ? (
          'Análise ainda não gerada.'
        ) : (
          <ol className="space-y-1.5">
            {etapas.map((etapa, index) => (
              <li key={index} className="flex gap-2">
                <span className="shrink-0 tabular-nums text-[#6e6a61]">{index + 1}.</span>
                <span className="min-w-0">{etapa.activity?.trim() || 'Etapa sem descrição'}</span>
              </li>
            ))}
          </ol>
        )}
      </Secao>

      <Secao titulo="Riscos" passo={4} onEditStep={onEditStep} vazio={etapas.length === 0}>
        {etapas.length === 0 ? (
          'Nenhum risco levantado.'
        ) : (
          <div className="space-y-3">
            {etapas.map((etapa, index) => {
              const perigos = paraItens(etapa.hazards);
              const consequencias = paraItens(etapa.consequences);
              const listaDeRiscos = paraItens(etapa.risks);
              // Sem lista propria, o texto antigo vira os itens.
              const riscos = listaDeRiscos.length ? listaDeRiscos : paraItens(etapa.potentialRisks);
              if (!riscos.length && !consequencias.length && !perigos.length) return null;
              return (
                <div key={index} className="rounded-sm bg-[#faf9f5] px-3 py-2">
                  <p className="text-xs font-semibold text-[#6e6a61]">Etapa {index + 1}</p>
                  {perigos.length > 0 && (
                    <p className="mt-1"><span className="text-[#6e6a61]">Perigos: </span>{perigos.join(' · ')}</p>
                  )}
                  {riscos.length > 0 && (
                    <p className="mt-0.5"><span className="text-[#6e6a61]">Riscos: </span>{riscos.join(' · ')}</p>
                  )}
                  {consequencias.length > 0 && (
                    <p className="mt-0.5"><span className="text-[#6e6a61]">Consequências: </span>{consequencias.join(' · ')}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Secao>

      <Secao titulo="Medidas preventivas" passo={4} onEditStep={onEditStep} vazio={etapas.length === 0}>
        {etapas.length === 0 ? (
          'Nenhuma medida definida.'
        ) : (
          <div className="space-y-3">
            {etapas.map((etapa, index) => {
              const listaDeMedidas = paraItens(etapa.measures);
              const medidas = listaDeMedidas.length ? listaDeMedidas : paraItens(etapa.preventiveMeasures);
              if (!medidas.length) return null;
              return (
                <div key={index}>
                  <p className="text-xs font-semibold text-[#6e6a61]">Etapa {index + 1}</p>
                  <ul className="mt-1 space-y-0.5">
                    {medidas.map((medida, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#1b5e3f]" aria-hidden="true" />
                        <span className="min-w-0">{medida}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {responsaveis.length > 0 && (
              <p className="border-t border-[#e3e0d8] pt-2 text-xs text-[#6e6a61]">
                Responsáveis pela verificação: {responsaveis.map((pessoa) => pessoa.name).join(', ')}
              </p>
            )}
          </div>
        )}
      </Secao>

      <Secao
        titulo="EPIs e EPCs"
        passo={4}
        onEditStep={onEditStep}
        vazio={!equipment || (!equipment.epiItems.length && !equipment.epcItems.length)}
      >
        {!equipment || (!equipment.epiItems.length && !equipment.epcItems.length) ? (
          'Nenhum equipamento recomendado.'
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-[#6e6a61]">EPI ({equipment.epiItems.length})</p>
              <ul className="mt-1 space-y-0.5">
                {equipment.epiItems.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
            <div>
              <p className="text-xs text-[#6e6a61]">EPC ({equipment.epcItems.length})</p>
              <ul className="mt-1 space-y-0.5">
                {equipment.epcItems.map((item, i) => <li key={i}>{item}</li>)}
                {equipment.epcItems.length === 0 && <li className="italic text-[#6e6a61]">Nenhum.</li>}
              </ul>
            </div>
          </div>
        )}
      </Secao>

    </DocumentReview>
  );
}
