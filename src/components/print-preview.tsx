import React from 'react';
import type { SafetyFormValues, Company } from '@/lib/types';
import type { SafetyAnalysisOutput, ProtectiveEquipmentOutput } from '@/server/ai-actions';
import { Logo } from '@/components/icons/logo';
import { PTPreview } from './pt-preview';
import { ClipboardList, Construction, ShieldCheck, Users } from 'lucide-react';
import { ptBr } from '@/lib/data/strings';
import { DOCUMENT_TYPES } from '@/lib/constants';

interface PrintPreviewProps {
  formData: SafetyFormValues;
  analysisData: SafetyAnalysisOutput | null;
  equipmentData: ProtectiveEquipmentOutput | null;
  company: Company | null;
  error?: string | null;
}

const COLORS = {
  white: '#ffffff',
  text: '#191c1e',
  secondary: '#4f5f7a',
  secondaryStrong: '#314d78',
  primary: '#9e4300',
  primaryStrong: '#b24a00',
  border: '#e0c0b1',
  borderSoft: '#dfe3e8',
  headerFill: '#eceff3',
  watermark: 'rgba(158,67,0,0.16)',
};

const headingFont = '"Hanken Grotesk", Inter, Arial, sans-serif';
const bodyFont = 'Inter, Arial, sans-serif';
const monoFont = '"JetBrains Mono", "Courier New", monospace';

const pageStyle: React.CSSProperties = {
  width: '210mm',
  minHeight: '297mm',
  background: COLORS.white,
  color: COLORS.text,
  position: 'relative',
  padding: '20mm 20mm 16mm',
  fontFamily: bodyFont,
  boxSizing: 'border-box',
};

const emptyTextStyle: React.CSSProperties = {
  color: '#8c7165',
  fontStyle: 'italic',
};

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

function SectionTitle({
  index,
  title,
  icon,
}: {
  index: string;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: COLORS.headerFill,
        borderLeft: `4px solid ${COLORS.primary}`,
        padding: '12px 20px',
        marginBottom: 12,
      }}
    >
      <span style={{ color: COLORS.primary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </span>
      <h2
        style={{
          margin: 0,
          fontFamily: headingFont,
          fontSize: 17,
          fontWeight: 700,
          lineHeight: 1.2,
          color: COLORS.text,
          textTransform: 'uppercase',
        }}
      >
        {index}. {title}
      </h2>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: monoFont,
        fontSize: 11,
        lineHeight: 1.1,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: COLORS.secondaryStrong,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function UnderlineValue({
  children,
  bold = false,
  minHeight = 34,
}: {
  children: React.ReactNode;
  bold?: boolean;
  minHeight?: number;
}) {
  return (
    <div
      style={{
        minHeight,
        paddingBottom: 6,
        borderBottom: `1px solid ${COLORS.borderSoft}`,
        fontSize: bold ? 18 : 13,
        lineHeight: bold ? 1.2 : 1.35,
        fontWeight: bold ? 700 : 400,
        color: COLORS.text,
      }}
    >
      {children}
    </div>
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
  company,
}: {
  formData: SafetyFormValues;
  analysisData: SafetyAnalysisOutput | null;
  equipmentData: ProtectiveEquipmentOutput | null;
  company: Company | null;
  error?: string | null;
}) {
  const procedures = getProcedureRows(formData, analysisData);
  const teamMembers = (formData.teamMembers || []).filter((member) => member.name || member.role || member.signatureData);
  const responsibles = (formData.responsiblePersons || []).filter((person) => person.name || person.role || person.signatureData);
  const footerDate = new Date().toLocaleDateString('pt-BR');
  const headerDate = formatDate(formData.startDate) || footerDate;
  const revision = '04';
  const aprId = buildAprId(formData);
  return (
    <div style={pageStyle}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo style={{ width: 42, height: 42, color: COLORS.primaryStrong }} />
            <span
              style={{
                fontFamily: headingFont,
                fontSize: 25,
                lineHeight: 1,
                fontWeight: 700,
                color: COLORS.primaryStrong,
                letterSpacing: '-0.03em',
              }}
            >
              PhiDocs
            </span>
          </div>
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

      <section style={{ marginBottom: 28 }}>
        <SectionTitle
          index="3"
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

      <section style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
        {Array.from({ length: 2 }).map((_, index) => {
          const person = responsibles[index];

          return (
            <div key={`responsible-${index}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: '100%',
                  height: 48,
                  borderBottom: `1px solid ${COLORS.text}`,
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                }}
              >
                {person?.signatureData ? <SignatureCell signatureData={person.signatureData} /> : null}
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.25, fontWeight: 700, color: COLORS.text, textAlign: 'center' }}>
                {person?.name || <span style={emptyTextStyle}>{ptBr.other.notFilled}</span>}
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
                {person?.role || 'Responsavel'}
              </div>
            </div>
          );
        })}
      </section>

      <footer
        style={{
          marginTop: 18,
          paddingTop: 8,
          borderTop: `1px solid ${COLORS.borderSoft}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: monoFont,
          fontSize: 9,
          lineHeight: 1.15,
          color: COLORS.secondary,
        }}
      >
        <div>
          Emitido em {footerDate} via <span style={{ fontWeight: 700, color: COLORS.primary }}>PhiDocs Safety &amp; Compliance</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Pagina 01 de 01</span>
          <ShieldCheck size={12} strokeWidth={2.2} />
        </div>
      </footer>

      <div
        style={{
          position: 'absolute',
          right: 28,
          bottom: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: COLORS.watermark,
          pointerEvents: 'none',
        }}
      >
        <Logo style={{ width: 42, height: 42 }} />
        <span style={{ fontFamily: headingFont, fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}>PHIDOCS</span>
      </div>
    </div>
  );
}

export function PrintPreview({ formData, analysisData, equipmentData, company, error }: PrintPreviewProps) {
  const documentType = formData?.documentType;

  return (
    <div className="print-preview-wrapper">
      <div
        id="print-content-root"
        className="print-document-container bg-white shadow-lg"
        style={{ width: '210mm', minHeight: '297mm' }}
      >
        {documentType === DOCUMENT_TYPES.APR ? (
          <APRPreviewContent
            formData={formData}
            analysisData={analysisData}
            equipmentData={equipmentData}
            company={company}
            error={error}
          />
        ) : (
          <PTPreview formData={formData} company={company} />
        )}
      </div>
    </div>
  );
}
