import { NextRequest, NextResponse } from 'next/server';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import type { SafetyFormValues, Company } from '@/lib/types';
import type { SafetyAnalysisOutput, ProtectiveEquipmentOutput } from '@/server/ai-actions';
import { generatePdfBuffer } from '@/server/pdf-generator';
import { requireAuth } from '@/server/auth-guard';

// Chromium so roda no runtime Node, nunca no edge.
export const runtime = 'nodejs';
// Levantar o Chromium a frio na Vercel leva alguns segundos; o padrao curto
// cortaria a geracao no meio e o usuario veria um erro sem causa aparente.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') || '0');
    if (contentLength > 1_000_000) {
      return NextResponse.json(
        { error: 'Payload muito grande. Limite de 1MB.' },
        { status: 413 }
      );
    }

    const { formData, analysisData, equipmentData, company } = (await request.json()) as {
        formData: SafetyFormValues;
        analysisData: SafetyAnalysisOutput | null;
        equipmentData: ProtectiveEquipmentOutput | null;
        company: Company | null;
    };

    if (!company?.id) {
      return NextResponse.json({ error: 'Empresa não identificada.' }, { status: 400 });
    }

    try {
      await requireAuth({ matchCompanyId: company.id, requireCompany: true });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Acesso negado.' },
        { status: 401 }
      );
    }

    const pdfBuffer = await generatePdfBuffer({
      formData,
      analysisData,
      equipmentData,
      company,
    });

    // 4. Return the PDF as a response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="documento_seguranca.pdf"`,
      },
    });

  } catch (e: any) {
    console.error("PDF Generation Error:", e);
    await ErrorLogRepository.log(e, 'generate-pdf-api');
    return NextResponse.json(
      { error: 'Falha ao gerar o PDF no servidor.', details: e.message },
      { status: 500 }
    );
  }
}
