import React from 'react';
import type { SafetyFormValues, Company } from '@/lib/types';
import type { SafetyAnalysisOutput, ProtectiveEquipmentOutput } from '@/server/ai-actions';
import { Logo } from '@/components/icons/logo';
import { PTPreview } from './pt-preview';
import { ClipboardList, Construction, ShieldCheck, UserCheck, Users } from 'lucide-react';
import {
  COLORS, FieldLabel, SectionTitle, UnderlineValue, getPageStyle,
  bodyFont, emptyTextStyle, headingFont, monoFont,
} from './document-primitives';
import { ptBr } from '@/lib/data/strings';
import { DOCUMENT_TYPES } from '@/lib/constants';

interface PrintPreviewProps {
  formData: SafetyFormValues;
  analysisData: SafetyAnalysisOutput | null;
  equipmentData: ProtectiveEquipmentOutput | null;
  company: Company | null;
  error?: string | null;
  renderMode?: 'preview' | 'pdf';
}

function formatDate(dateString?: string) {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    const normalized = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
    return normalized.toLocaleDateString('pt-BR');
  } catch {
    return null;
  }
}

function buildAprId(data: SafetyFormValues) {
  const baseDate = formatDate(data.startDate) || new Date().toLocaleDateString('pt-BR');
  const [day, month, year] = baseDate.split('/');
  return `APR-${year || '2026'}-${(month || '01').padStart(2, '0')}${(day || '01').padStart(2, '0')}`;
}

function getProcedureRows(formData: SafetyFormValues, analysisData: SafetyAnalysisOutput | null) {
  if (analysisData?.proceduralSteps?.length) {
    return analysisData.proceduralSteps
      .filter((step) => step.activity || step.potentialRisks || step.preventiveMeasures)
      .map((step, index) => ({
        activity: step.activity || '',
        risks: step.potentialRisks || '',
        measures: step.preventiveMeasures || '',
        item: step.item || index + 1,
      }));
  }

  if (formData.analysisSteps?.length) {
    return formData.analysisSteps
      .filter((step) => step.activity || step.potentialRisks || step.preventiveMeasures)
      .map((step, index) => ({
        activity: step.activity || '',
        risks: step.potentialRisks || '',
        measures: step.preventiveMeasures || '',
        item: step.item || index + 1,
      }));
  }

  return [];
}

function splitLines(text?: string) {
  if (!text) return [];
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function renderText(text?: string) {
  const lines = splitLines(text);
  if (!lines.length) return <span style={emptyTextStyle}>{ptBr.other.notFilled}</span>;

  return lines.map((line, index) => (
    <React.Fragment key={`${line}-${index}`}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </React.Fragment>
  ));
}

function renderBulletText(text?: string) {
  const lines = splitLines(text);
  if (!lines.length) return <span style={emptyTextStyle}>{ptBr.other.notFilled}</span>;

  return (
    <div>
      {lines.map((line, index) => (
        <div key={`${line}-${index}`} style={{ marginBottom: index === lines.length - 1 ? 0 : 5 }}>
          {line.startsWith('•') || line.startsWith('-') ? line : `• ${line}`}
        </div>
      ))}
    </div>
  );
}

function SignatureCell({ signatureData }: { signatureData?: string }) {
  if (!signatureData?.startsWith('data:image')) return null;

  return (
    <img
      src={signatureData}
      alt={ptBr.other.signatureAlt}
      style={{ maxHeight: 28, maxWidth: '100%', objectFit: 'contain' }}
    />
  );
}

function HeaderMetaRow({ label, value, bordered = true }: { label: string; value: string; bordered?: boolean }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '56px 1fr',
        gap: 8,
        alignItems: 'center',
        padding: bordered ? '6px 0' : '6px 0 0',
        borderBottom: bordered ? `1px solid ${COLORS.borderSoft}` : 'none',
      }}
    >
      <span
        style={{
          fontFamily: monoFont,
          fontSize: 10,
          lineHeight: 1.1,
          color: COLORS.secondaryStrong,
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: monoFont,
          fontSize: 10,
          lineHeight: 1.1,
          fontWeight: 700,
          color: COLORS.text,
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function APRPreviewContent({
  formData,
  analysisData,
  equipmentData,
  company,
  renderMode,
}: {
  formData: SafetyFormValues;
  analysisData: SafetyAnalysisOutput | null;
  equipmentData: ProtectiveEquipmentOutput | null;
  company: Company | null;
  error?: string | null;
  renderMode: 'preview' | 'pdf';
}) {
  const procedures = getProcedureRows(formData, analysisData);
  const teamMembers = (formData.teamMembers || []).filter((member) => member.name || member.role || member.signatureData);
  const responsibles = (formData.responsiblePersons || []).filter((person) => person.name || person.role || person.signatureData);
  const footerDate = new Date().toLocaleDateString('pt-BR');
  const headerDate = formatDate(formData.startDate) || footerDate;
  const revision = '04';
  // EPI/EPC sao gerados pela IA e agora entram no documento. A numeracao das
  // secoes seguintes acompanha a presenca deles.
  const temEquipamentos = Boolean(
    equipmentData && ((equipmentData.epiItems?.length || 0) > 0 || (equipmentData.epcItems?.length || 0) > 0),
  );
  const aprId = buildAprId(formData);
  const hasCompanyLogo = Boolean(company?.logo);
  return (
    <div style={getPageStyle(renderMode)}>
      <header
        style={{
          display: 'grid',
          gridTemplateColumns: '1.15fr 2.35fr 1.15fr',
          border: `1px solid #b39a8a`,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            borderRight: `1px solid #b39a8a`,
            padding: '18px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {hasCompanyLogo ? (
            <div
              style={{
                width: '100%',
                height: 74,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img
                src={company?.logo}
                alt={company?.name || 'Logo da empresa'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
          ) : (
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Logo style={{ width: 168, height: 'auto', display: 'block' }} />
            </div>
          )}
        </div>

        <div
          style={{
            borderRight: `1px solid #b39a8a`,
            padding: '18px 20px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: headingFont,
              fontSize: 23,
              lineHeight: 1.35,
              fontWeight: 500,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Analise Preliminar de Risco
            <br />
            (APR)
          </div>
          <div
            style={{
              marginTop: 10,
              fontFamily: monoFont,
              fontSize: 11,
              lineHeight: 1.1,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: COLORS.secondaryStrong,
            }}
          >
            Seguranca do Trabalho e Compliance
          </div>
        </div>

        <div style={{ padding: '12px 12px 10px' }}>
          <HeaderMetaRow label="ID:" value={aprId} />
          <HeaderMetaRow label="REVISAO:" value={revision} />
          <HeaderMetaRow label="DATA:" value={headerDate} bordered={false} />
        </div>
      </header>

      <section style={{ marginBottom: 30 }}>
        <SectionTitle
          index="1"
          title="Dados da Obra / Projeto"
          icon={<Construction size={16} strokeWidth={2.2} />}
        />

        <div
          style={{
            border: `1px solid ${COLORS.border}`,
            borderRadius: 6,
            padding: 18,
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <FieldLabel>Nome do Projeto</FieldLabel>
            <UnderlineValue bold>
              {formData.workName || <span style={emptyTextStyle}>{ptBr.other.notFilled}</span>}
            </UnderlineValue>
          </div>

          <div style={{ marginBottom: 10 }}>
            <FieldLabel>Endereco / Localizacao</FieldLabel>
            <UnderlineValue>
              {formData.workAddress || <span style={emptyTextStyle}>{ptBr.other.notFilled}</span>}
            </UnderlineValue>
          </div>

          <div style={{ marginBottom: 10 }}>
            <FieldLabel>Local da Atividade</FieldLabel>
            <UnderlineValue>
              {formData.workLocationDetails || <span style={emptyTextStyle}>{ptBr.other.notFilled}</span>}
            </UnderlineValue>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '0.95fr 1fr 1.9fr', gap: 18 }}>
            <div>
              <FieldLabel>Data de Inicio</FieldLabel>
              <UnderlineValue>
                {formatDate(formData.startDate) || <span style={emptyTextStyle}>{ptBr.other.notFilled}</span>}
              </UnderlineValue>
            </div>
            <div>
              <FieldLabel>Previsao de Termino</FieldLabel>
              <UnderlineValue>
                {formatDate(formData.endDate) || <span style={emptyTextStyle}>{ptBr.other.notFilled}</span>}
              </UnderlineValue>
            </div>
            <div>
              <FieldLabel>Descricao da Atividade</FieldLabel>
              <UnderlineValue minHeight={46}>
                {formData.activityDescription || <span style={emptyTextStyle}>{ptBr.other.notFilled}</span>}
              </UnderlineValue>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <SectionTitle
          index="2"
          title="Procedimento Operacional e Riscos"
          icon={<ClipboardList size={16} strokeWidth={2.2} />}
        />

        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 11.2 }}>
          <thead>
            <tr style={{ background: COLORS.headerFill, color: '#3a2a1f', textTransform: 'uppercase' }}>
              <th style={{ width: '25%', border: `1px solid ${COLORS.border}`, padding: '11px 10px', textAlign: 'center', fontWeight: 500 }}>
                Etapa da Atividade
              </th>
              <th style={{ width: '25%', border: `1px solid ${COLORS.border}`, padding: '11px 10px', textAlign: 'center', fontWeight: 500 }}>
                Riscos Potenciais
              </th>
              <th style={{ width: '50%', border: `1px solid ${COLORS.border}`, padding: '11px 10px', textAlign: 'center', fontWeight: 500 }}>
                Medidas de Controle / Mitigacao (EPI/EPC)
              </th>
            </tr>
          </thead>
          <tbody>
            {procedures.length > 0 ? (
              procedures.map((step, index) => (
                <tr key={`procedure-${index}`} style={{ background: index % 2 === 1 ? '#fcfdfd' : COLORS.white }}>
                  <td style={{ border: `1px solid ${COLORS.border}`, padding: '10px 10px 12px', verticalAlign: 'top', lineHeight: 1.45 }}>
                    {(step.item || index + 1) ? `${step.item || index + 1}. ` : ''}
                    {renderText(step.activity)}
                  </td>
                  <td style={{ border: `1px solid ${COLORS.border}`, padding: '10px 10px 12px', verticalAlign: 'top', lineHeight: 1.45 }}>
                    {renderBulletText(step.risks)}
                  </td>
                  <td style={{ border: `1px solid ${COLORS.border}`, padding: '10px 10px 12px', verticalAlign: 'top', lineHeight: 1.45 }}>
                    {renderText(step.measures)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={3}
                  style={{
                    border: `1px solid ${COLORS.border}`,
                    padding: '18px 16px',
                    textAlign: 'center',
                    color: COLORS.secondary,
                    fontStyle: 'italic',
                  }}
                >
                  Preencha os campos para visualizar a analise detalhada aqui.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {temEquipamentos ? (
        <section style={{ marginBottom: 28, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <SectionTitle
            index="3"
            title="EPI e EPC Obrigatorios"
            icon={<ShieldCheck size={16} strokeWidth={2.2} />}
          />

          <div style={{ display: 'flex', gap: 16 }}>
            {[
              {
                titulo: 'EPI - Equipamento de Protecao Individual',
                itens: equipmentData?.epiItems || [],
                nota: equipmentData?.epiNote,
              },
              {
                titulo: 'EPC - Equipamento de Protecao Coletiva',
                itens: equipmentData?.epcItems || [],
                nota: equipmentData?.epcNote,
              },
            ].map((grupo) => (
              <div key={grupo.titulo} style={{ flex: 1, border: `1px solid ${COLORS.border}` }}>
                <div
                  style={{
                    background: COLORS.headerFill,
                    borderBottom: `1px solid ${COLORS.border}`,
                    padding: '7px 12px',
                    fontFamily: headingFont,
                    fontSize: 9.5,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: COLORS.secondaryStrong,
                  }}
                >
                  {grupo.titulo}
                </div>

                <ul style={{ margin: 0, padding: '10px 12px 10px 26px', fontSize: 11.2, lineHeight: 1.5 }}>
                  {grupo.itens.map((item: string, indice: number) => (
                    <li key={`${grupo.titulo}-${indice}`} style={{ marginBottom: 3 }}>
                      {item}
                    </li>
                  ))}
                  {grupo.itens.length === 0 ? (
                    <li style={{ listStyle: 'none', marginLeft: -14, color: COLORS.secondary }}>
                      Nao aplicavel a esta atividade.
                    </li>
                  ) : null}
                </ul>

                {grupo.nota ? (
                  <p
                    style={{
                      margin: 0,
                      borderTop: `1px solid ${COLORS.borderSoft}`,
                      padding: '8px 12px',
                      fontSize: 9.5,
                      lineHeight: 1.45,
                      color: COLORS.secondary,
                    }}
                  >
                    {grupo.nota}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section style={{ marginBottom: 28 }}>
        <SectionTitle
          index={temEquipamentos ? '4' : '3'}
          title="Equipe de Trabalho"
          icon={<Users size={16} strokeWidth={2.2} />}
        />

        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 11.2 }}>
          <thead>
            <tr style={{ background: COLORS.headerFill, color: '#3a2a1f', textTransform: 'uppercase' }}>
              <th style={{ width: '40%', border: `1px solid ${COLORS.border}`, padding: '11px 10px', textAlign: 'left', fontWeight: 500 }}>
                Nome Completo
              </th>
              <th style={{ width: '25%', border: `1px solid ${COLORS.border}`, padding: '11px 10px', textAlign: 'left', fontWeight: 500 }}>
                Funcao
              </th>
              <th style={{ width: '35%', border: `1px solid ${COLORS.border}`, padding: '11px 10px', textAlign: 'center', fontWeight: 500 }}>
                Assinatura / Visto
              </th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.length > 0 ? (
              teamMembers.map((member, index) => (
                <tr key={`team-${index}`} style={{ background: index % 2 === 1 ? '#fcfdfd' : COLORS.white }}>
                  <td style={{ border: `1px solid ${COLORS.border}`, padding: '11px 10px', verticalAlign: 'middle' }}>
                    {member.name || <span style={emptyTextStyle}>{ptBr.other.notFilled}</span>}
                  </td>
                  <td style={{ border: `1px solid ${COLORS.border}`, padding: '11px 10px', verticalAlign: 'middle' }}>
                    {member.role || <span style={emptyTextStyle}>{ptBr.other.notFilled}</span>}
                  </td>
                  <td style={{ border: `1px solid ${COLORS.border}`, padding: '8px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <SignatureCell signatureData={member.signatureData} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={3}
                  style={{
                    border: `1px solid ${COLORS.border}`,
                    padding: '18px 16px',
                    textAlign: 'center',
                    color: COLORS.secondary,
                    fontStyle: 'italic',
                  }}
                >
                  Nenhum membro adicionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section
        style={{
          marginTop: 28,
          marginBottom: 42,
          breakInside: 'avoid',
          pageBreakInside: 'avoid',
        }}
      >
        <SectionTitle
          index={temEquipamentos ? '5' : '4'}
          title="Responsaveis"
          icon={<UserCheck size={16} strokeWidth={2.2} />}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            columnGap: 28,
            rowGap: 34,
            paddingBottom: 24,
          }}
        >
          {responsibles.length > 0 ? (
            responsibles.map((person, index) => (
              <div
                key={`responsible-${index}`}
                style={{
                  minHeight: 112,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  breakInside: 'avoid',
                  pageBreakInside: 'avoid',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    minHeight: 54,
                    borderBottom: `1px solid ${COLORS.text}`,
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingBottom: 4,
                  }}
                >
                  {person.signatureData ? <SignatureCell signatureData={person.signatureData} /> : null}
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.25, fontWeight: 700, color: COLORS.text, textAlign: 'center' }}>
                  {person.name || <span style={emptyTextStyle}>{ptBr.other.notFilled}</span>}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontFamily: monoFont,
                    fontSize: 10,
                    lineHeight: 1.2,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: COLORS.secondary,
                    textAlign: 'center',
                  }}
                >
                  {person.role || 'Responsavel'}
                </div>
              </div>
            ))
          ) : (
            <div
              style={{
                gridColumn: '1 / -1',
                minHeight: 72,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px dashed ${COLORS.border}`,
                color: COLORS.secondary,
                fontStyle: 'italic',
              }}
            >
              Nenhum responsavel adicionado.
            </div>
          )}
        </div>
      </section>

      <footer
        style={{
          marginTop: 8,
          paddingTop: 8,
          borderTop: `1px solid ${COLORS.borderSoft}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: monoFont,
          fontSize: 9,
          lineHeight: 1.15,
          color: COLORS.secondary,
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div>
          Emitido em {footerDate} via <span style={{ fontWeight: 700, color: COLORS.primary }}>PhiDocs Safety &amp; Compliance</span>
        </div>
        {/* A paginacao real vem do Puppeteer (pdf-generator.ts). Aqui havia
            "Pagina 01 de 01" fixo, que saia errado em toda APR de varias
            paginas — e esta APR de teste tem 10 etapas. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={12} strokeWidth={2.2} />
        </div>
      </footer>

      <div
        style={{
          position: 'absolute',
          right: 28,
          bottom: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: COLORS.watermark,
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.45,
        }}
      >
        <Logo style={{ width: 132, height: 'auto' }} />
      </div>
    </div>
  );
}

export function PrintPreview({ formData, analysisData, equipmentData, company, error, renderMode = 'preview' }: PrintPreviewProps) {
  const documentType = formData?.documentType;

  return (
    <div className="print-preview-wrapper">
      <div
        id="print-content-root"
        className="print-document-container bg-white shadow-lg"
        style={renderMode === 'pdf' ? { width: '100%', minHeight: 'auto' } : { width: '210mm', minHeight: '297mm' }}
      >
        {documentType === DOCUMENT_TYPES.APR ? (
          <APRPreviewContent
            formData={formData}
            analysisData={analysisData}
            equipmentData={equipmentData}
            company={company}
            error={error}
            renderMode={renderMode}
          />
        ) : (
          <PTPreview formData={formData} company={company} renderMode={renderMode} />
        )}
      </div>
    </div>
  );
}
