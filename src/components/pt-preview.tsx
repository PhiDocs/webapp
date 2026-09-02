import React from 'react';
import type { SafetyFormValues, PtTeamMember, Company } from '@/lib/types';
import { ptChecklistItems } from '@/lib/data/pt-checklist';
import { ptBr } from '@/lib/data/strings';
import { PT_FIT_STATUS } from '@/lib/constants';
import { ClipboardList, Construction, ShieldCheck, UserCheck, Users, Wind } from 'lucide-react';
import {
  COLORS, CheckBox, DocumentFooter, FieldLabel, SectionTitle, TableCell, TableHead,
  UnderlineValue, Vazio, getPageStyle, headingFont, monoFont,
} from './document-primitives';

interface PTPreviewProps {
  formData: SafetyFormValues;
  company: Company | null;
  renderMode?: 'preview' | 'pdf';
}

function formatarData(valor?: string) {
  if (!valor) return null;
  const [ano, mes, dia] = (valor || '').split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : valor;
}

function TeamTable({
  members,
  showEmpresa = false,
}: {
  members: PtTeamMember[];
  showEmpresa?: boolean;
}) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <thead>
        <tr>
          <TableHead width="30%">{ptBr.ptForm.name}</TableHead>
          <TableHead width="20%">{ptBr.ptForm.rgCpf}</TableHead>
          <TableHead width={showEmpresa ? '20%' : '30%'}>{ptBr.ptForm.role}</TableHead>
          {showEmpresa ? <TableHead width="18%">{ptBr.ptForm.company}</TableHead> : null}
          <TableHead width="12%">{ptBr.ptForm.isFit}</TableHead>
        </tr>
      </thead>
      <tbody>
        {members.map((membro, indice) => (
          <tr key={indice}>
            <TableCell>{membro.name || <Vazio texto={ptBr.other.notFilled} />}</TableCell>
            <TableCell>{membro.rgCpf || <Vazio texto="-" />}</TableCell>
            <TableCell>{membro.func || <Vazio texto="-" />}</TableCell>
            {showEmpresa ? <TableCell>{membro.empresa || <Vazio texto="-" />}</TableCell> : null}
            <TableCell align="center">
              {/* So a resposta escolhida aparece: manter as duas opcoes lado a
                  lado deixava duvida sobre qual valia. */}
              {membro.apto === PT_FIT_STATUS.YES || membro.apto === PT_FIT_STATUS.NO ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5 }}>
                  <CheckBox checked />
                  {membro.apto === PT_FIT_STATUS.YES ? ptBr.ptForm.yes : ptBr.ptForm.no}
                </span>
              ) : (
                <Vazio texto="-" />
              )}
            </TableCell>
          </tr>
        ))}

        {members.length === 0 ? (
          <tr>
            <TableCell align="center">
              <Vazio texto="Nenhum participante adicionado." />
            </TableCell>
            <TableCell>{''}</TableCell>
            <TableCell>{''}</TableCell>
            {showEmpresa ? <TableCell>{''}</TableCell> : null}
            <TableCell>{''}</TableCell>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

function LinhaAssinatura({ rotulo, nome }: { rotulo: string; nome?: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div
        style={{
          minHeight: 46,
          borderBottom: `1px solid ${COLORS.text}`,
          marginBottom: 6,
        }}
      />
      <div
        style={{
          fontFamily: monoFont,
          fontSize: 9.5,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: COLORS.secondaryStrong,
        }}
      >
        {rotulo}
      </div>
      <div style={{ fontSize: 11.5, color: COLORS.text, marginTop: 2 }}>
        {nome || <Vazio texto={ptBr.other.notFilled} />}
      </div>
    </div>
  );
}

export function PTPreview({ formData, company, renderMode = 'preview' }: PTPreviewProps) {
  if (!formData?.pt) return null;

  const { pt: ptData } = formData;
  const checklist = ptData.ptChecklist || {};

  const secoesMarcadas = ptChecklistItems.filter((secao) =>
    secao.items.some((item) => checklist[item.id]),
  );

  // A numeracao acompanha as secoes que existem neste documento.
  let contador = 0;
  const proximo = () => String(++contador);
  const emitidoEm = new Date().toLocaleDateString('pt-BR');
  // Documentos novos trazem a liberacao como lista; os antigos, tres campos.
  const responsaveis = (ptData.ptResponsaveis || []).filter((pessoa) => pessoa?.name);

  // Mesma moldura A4 da APR: margem de 20mm na tela, zero no PDF.
  return (
    <div style={getPageStyle(renderMode)}>
      {/* ---------------- Cabecalho ---------------- */}
      <header
        style={{
          display: 'flex',
          alignItems: 'stretch',
          border: `1px solid ${COLORS.border}`,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            width: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12,
            borderRight: `1px solid ${COLORS.border}`,
          }}
        >
          {company?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logo}
              alt={ptBr.other.companyLogoAlt}
              style={{ maxHeight: 56, maxWidth: 120, objectFit: 'contain' }}
            />
          ) : (
            <span style={{ fontFamily: headingFont, fontSize: 13, color: COLORS.secondary }}>
              {company?.name || 'PhiDocs'}
            </span>
          )}
        </div>

        <div
          style={{
            flex: 1,
            padding: '14px 18px',
            textAlign: 'center',
            borderRight: `1px solid ${COLORS.border}`,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontFamily: headingFont,
              fontSize: 19,
              fontWeight: 700,
              lineHeight: 1.15,
              textTransform: 'uppercase',
              color: COLORS.text,
            }}
          >
            {ptBr.printPreview.pt.title}
          </h1>
          <p
            style={{
              margin: '4px 0 0',
              fontFamily: monoFont,
              fontSize: 9.5,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: COLORS.primary,
            }}
          >
            {ptBr.printPreview.pt.subtitle}
          </p>
        </div>

        <div style={{ width: 180, padding: '12px 14px' }}>
          <FieldLabel>{ptBr.printPreview.pt.date}</FieldLabel>
          <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 8 }}>
            {formatarData(ptData.ptData) || <Vazio texto={ptBr.other.notFilled} />}
          </div>
          <FieldLabel>Horario</FieldLabel>
          <div style={{ fontSize: 12, color: COLORS.text }}>
            {ptData.ptHoraInicio || '--:--'} as {ptData.ptHoraFim || '--:--'}
          </div>
        </div>
      </header>

      {/* ---------------- 1. Dados da permissao ---------------- */}
      <section style={{ marginBottom: 26, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <SectionTitle
          index={proximo()}
          title="Dados da Permissao"
          icon={<Construction size={16} strokeWidth={2.2} />}
        />

        <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: 18 }}>
          <div style={{ marginBottom: 10 }}>
            <FieldLabel>{ptBr.printPreview.pt.location}</FieldLabel>
            <UnderlineValue bold>
              {ptData.ptLocalAtividade || <Vazio texto={ptBr.other.notFilled} />}
            </UnderlineValue>
          </div>

          <div style={{ marginBottom: 10 }}>
            <FieldLabel>{ptBr.printPreview.pt.equipment}</FieldLabel>
            <UnderlineValue>
              {ptData.ptEquipamentoLinha || <Vazio texto={ptBr.other.notFilled} />}
            </UnderlineValue>
          </div>

          <div>
            <FieldLabel>{ptBr.printPreview.pt.taskDescription}</FieldLabel>
            <UnderlineValue minHeight={52}>
              {ptData.ptDescricaoTarefa || <Vazio texto={ptBr.other.notFilled} />}
            </UnderlineValue>
          </div>
        </div>
      </section>

      {/* ---------------- Condicoes e requisitos ---------------- */}
      {secoesMarcadas.length > 0 ? (
        <section style={{ marginBottom: 26 }}>
          <SectionTitle
            index={proximo()}
            title="Condicoes e Requisitos"
            icon={<ClipboardList size={16} strokeWidth={2.2} />}
          />

          <div style={{ display: 'grid', gap: 14 }}>
            {secoesMarcadas.map((secao) => (
              <div key={secao.id} style={{ border: `1px solid ${COLORS.border}` }}>
                <div
                  style={{
                    background: COLORS.headerFill,
                    borderBottom: `1px solid ${COLORS.border}`,
                    padding: '7px 12px',
                    fontFamily: monoFont,
                    fontSize: 9.5,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: COLORS.secondaryStrong,
                  }}
                >
                  {ptBr.ptChecklist.titles[secao.id as keyof typeof ptBr.ptChecklist.titles]}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${secao.columns === 3 ? 3 : secao.columns === 2 ? 2 : 1}, minmax(0, 1fr))`,
                    gap: '6px 16px',
                    padding: '10px 12px',
                  }}
                >
                  {secao.items.map((item) => (
                    <div
                      key={item.id}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, lineHeight: 1.4 }}
                    >
                      <span style={{ marginTop: 2 }}>
                        <CheckBox checked={Boolean(checklist[item.id])} />
                      </span>
                      <span style={{ color: checklist[item.id] ? COLORS.text : COLORS.secondary }}>
                        {ptBr.ptChecklist.items[item.id as keyof typeof ptBr.ptChecklist.items]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------------- Colaboradores ---------------- */}
      <section style={{ marginBottom: 26 }}>
        <SectionTitle
          index={proximo()}
          title={ptBr.printPreview.pt.collaborators}
          icon={<Users size={16} strokeWidth={2.2} />}
        />
        <TeamTable members={ptData.ptColaboradores || []} showEmpresa />
      </section>

      {/* ---------------- Espaco confinado ---------------- */}
      {ptData.ptEnableEspacoConfinado ? (
        <section style={{ marginBottom: 26, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <SectionTitle
            index={proximo()}
            title={ptBr.printPreview.pt.confinedSpaceTitle}
            icon={<Wind size={16} strokeWidth={2.2} />}
          />
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <TableHead>{ptBr.printPreview.pt.oxygen}</TableHead>
                <TableHead>{ptBr.printPreview.pt.le}</TableHead>
                <TableHead>{ptBr.printPreview.pt.h2s}</TableHead>
                <TableHead>{ptBr.printPreview.pt.co2}</TableHead>
                <TableHead width="34%">{ptBr.printPreview.pt.observation}</TableHead>
              </tr>
            </thead>
            <tbody>
              <tr>
                <TableCell align="center">{ptData.ptOxigenio || <Vazio texto="-" />}</TableCell>
                <TableCell align="center">{ptData.ptLE || <Vazio texto="-" />}</TableCell>
                <TableCell align="center">{ptData.ptH2S || <Vazio texto="-" />}</TableCell>
                <TableCell align="center">{ptData.ptCO2 || <Vazio texto="-" />}</TableCell>
                <TableCell>{ptData.ptObservacao || <Vazio texto="-" />}</TableCell>
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}

      {/* ---------------- Vigias ---------------- */}
      {ptData.ptEnableVigia ? (
        <section style={{ marginBottom: 26 }}>
          <SectionTitle
            index={proximo()}
            title={ptBr.printPreview.pt.lookouts}
            icon={<ShieldCheck size={16} strokeWidth={2.2} />}
          />
          <TeamTable members={ptData.ptVigias || []} />
        </section>
      ) : null}

      {/* ---------------- Resgatistas ---------------- */}
      {ptData.ptEnableResgatistas ? (
        <section style={{ marginBottom: 26 }}>
          <SectionTitle
            index={proximo()}
            title={ptBr.printPreview.pt.rescuers}
            icon={<ShieldCheck size={16} strokeWidth={2.2} />}
          />
          <TeamTable members={ptData.ptResgatistas || []} showEmpresa />
        </section>
      ) : null}

      {/* ---------------- Assinaturas ---------------- */}
      <section style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <SectionTitle
          index={proximo()}
          title="Liberacao e Assinaturas"
          icon={<UserCheck size={16} strokeWidth={2.2} />}
        />
        <div
          style={{
            display: 'flex',
            gap: 24,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 6,
            padding: '22px 18px 14px',
          }}
        >
          {responsaveis.length > 0
            ? responsaveis.map((pessoa, indice) => (
                <LinhaAssinatura
                  key={`${pessoa.name}-${indice}`}
                  rotulo={pessoa.role || 'Responsavel'}
                  nome={pessoa.name}
                />
              ))
            : (
              <>
                <LinhaAssinatura rotulo="Gestor da Area" nome={ptData.ptGestorArea?.name} />
                <LinhaAssinatura rotulo="Responsavel pela Atividade" nome={ptData.ptResponsavelAtividade?.name} />
                <LinhaAssinatura rotulo="SESMT" nome={ptData.ptSesmt?.name} />
              </>
            )}
        </div>
      </section>

      <DocumentFooter emitidoEm={emitidoEm} />
    </div>
  );
}
