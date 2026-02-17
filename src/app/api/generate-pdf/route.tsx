import { NextRequest, NextResponse } from 'next/server';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import type { SafetyFormValues, Company } from '@/lib/types';
import type { SafetyAnalysisOutput, ProtectiveEquipmentOutput } from '@/server/ai-actions';
import { generatePdfBuffer } from '@/server/pdf-generator';
import { requireAuth } from '@/server/auth-guard';

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') || '0');
    if (contentLength > 1_000_000) {
      return NextResponse.json(
        { error: 'Payload muito grande. Limite de 1MB.' },
        { status: 413 }
      );
    }

    try {
      await requireAuth();
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Acesso negado.' },
        { status: 401 }
      );
    }

    const { formData, analysisData, equipmentData, company } = (await request.json()) as {
        formData: SafetyFormValues;
        analysisData: SafetyAnalysisOutput | null;
        equipmentData: ProtectiveEquipmentOutput | null;
        company: Company | null;
    };

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
