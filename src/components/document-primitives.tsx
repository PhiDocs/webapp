import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/icons/logo';

/**
 * Vocabulario visual compartilhado entre APR e PT no documento impresso.
 *
 * Tudo aqui usa estilo inline de proposito: o gerador de PDF roda com um CSS
 * proprio no servidor e reimplementa a mao apenas um punhado de classes do
 * Tailwind. Qualquer classe fora dessa lista some silenciosamente no PDF.
 */
export const COLORS = {
  white: '#ffffff',
  text: '#191c1e',
  secondary: '#4f5f7a',
  secondaryStrong: '#314d78',
  primary: '#9e4300',
  primaryStrong: '#b24a00',
  border: '#e0c0b1',
  borderSoft: '#dfe3e8',
  headerFill: '#eceff3',
  watermark: 'rgba(158,67,0,0.08)',
};

export const headingFont = '"Hanken Grotesk", Inter, Arial, sans-serif';
export const bodyFont = 'Inter, Arial, sans-serif';
export const monoFont = '"JetBrains Mono", "Courier New", monospace';

export const emptyTextStyle: React.CSSProperties = {
  color: '#8c7165',
  fontStyle: 'italic',
};

export function SectionTitle({
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

export function FieldLabel({ children }: { children: React.ReactNode }) {
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

export function UnderlineValue({
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

/** Celula de cabecalho de tabela, no mesmo tom das seções. */
export function TableHead({ children, width }: { children: React.ReactNode; width?: string }) {
  return (
    <th
      style={{
        width,
        textAlign: 'left',
        padding: '8px 10px',
        background: COLORS.headerFill,
        border: `1px solid ${COLORS.border}`,
        fontFamily: monoFont,
        fontSize: 9.5,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: COLORS.secondaryStrong,
        fontWeight: 500,
      }}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'center';
}) {
  return (
    <td
      style={{
        padding: '8px 10px',
        border: `1px solid ${COLORS.border}`,
        fontSize: 11.2,
        lineHeight: 1.4,
        color: COLORS.text,
        textAlign: align,
        verticalAlign: 'top',
      }}
    >
      {children}
    </td>
  );
}

/** Caixa de marcar do documento, desenhada sem depender de classe utilitaria. */
export function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 11,
        height: 11,
        border: `1px solid ${COLORS.text}`,
        verticalAlign: 'middle',
      }}
    >
      {checked ? (
        <span style={{ display: 'block', width: 6, height: 6, background: COLORS.text }} />
      ) : null}
    </span>
  );
}

export function Vazio({ texto }: { texto: string }) {
  return <span style={emptyTextStyle}>{texto}</span>;
}

/**
 * Moldura da folha. Na tela e uma A4 de verdade com margem de 20mm; no PDF o
 * proprio Puppeteer aplica a margem, entao aqui ela vai a zero.
 */
export function getPageStyle(renderMode: 'preview' | 'pdf'): React.CSSProperties {
  if (renderMode === 'pdf') {
    return {
      width: '100%',
      minHeight: 'auto',
      background: COLORS.white,
      color: COLORS.text,
      position: 'relative',
      padding: 0,
      fontFamily: bodyFont,
      boxSizing: 'border-box',
    };
  }

  return {
    width: '210mm',
    minHeight: '297mm',
    background: COLORS.white,
    color: COLORS.text,
    position: 'relative',
    padding: '20mm 20mm 16mm',
    fontFamily: bodyFont,
    boxSizing: 'border-box',
  };
}

/** Rodape e marca d'agua, iguais nos dois documentos. */
export function DocumentFooter({ emitidoEm }: { emitidoEm: string }) {
  return (
    <>
      <footer
        style={{
          marginTop: 28,
          paddingTop: 10,
          borderTop: `1px solid ${COLORS.borderSoft}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 9,
          lineHeight: 1.15,
          color: COLORS.secondary,
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div>
          Emitido em {emitidoEm} via{' '}
          <span style={{ fontWeight: 700, color: COLORS.primary }}>PhiDocs Safety &amp; Compliance</span>
        </div>
        {/* A paginacao real e impressa pelo Puppeteer, em pdf-generator.ts:
            so ele sabe em quantas paginas o documento caiu. Aqui ficava
            "Pagina 01 de 01" fixo, errado em todo documento com mais de uma. */}
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
    </>
  );
}
