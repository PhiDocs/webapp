import { NextRequest, NextResponse } from 'next/server';
import { SignatureDocumentRepository } from '@/repositories/signature-document.repository';
import { downloadSignedDocument } from '@/server/assinafy-actions';
import { ErrorLogRepository } from '@/repositories/error-log.repository';

export async function GET(
  _request: NextRequest,
  { params }: { params: { signatureDocumentId: string } }
) {
  try {
    const signatureDocumentId = params.signatureDocumentId;
    const signatureDoc = await SignatureDocumentRepository.getById(signatureDocumentId);

    if (!signatureDoc) {
      return NextResponse.json({ error: 'Documento de assinatura n\u00e3o encontrado.' }, { status: 404 });
    }

    const pdfBlob = await downloadSignedDocument(signatureDoc.assinafyDocumentId);
    const buffer = Buffer.from(await pdfBlob.arrayBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${signatureDoc.documentName}"`,
      },
    });
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro desconhecido ao baixar PDF.'));
    await ErrorLogRepository.log(error, 'assinafy-download-api');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
