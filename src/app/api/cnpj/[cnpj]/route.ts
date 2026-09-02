import { NextResponse } from 'next/server';
import { isValidCnpj, onlyCnpjDigits, type NormalizedCnpjData } from '@/lib/cnpj';

type BrasilApiCnpjResponse = {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  descricao_situacao_cadastral?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  ddd_telefone_1?: string;
  email?: string;
  cnae_fiscal_descricao?: string;
};

type CnpjWsResponse = {
  razao_social?: string;
  estabelecimento?: {
    cnpj?: string;
    nome_fantasia?: string;
    situacao_cadastral?: string;
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: { nome?: string };
    estado?: { sigla?: string };
    ddd1?: string;
    telefone1?: string;
    email?: string;
    atividade_principal?: { descricao?: string };
  };
};

function normalizeCnpjData(data: BrasilApiCnpjResponse): NormalizedCnpjData {
  return {
    cnpj: data.cnpj || '',
    razao_social: data.razao_social || '',
    nome_fantasia: data.nome_fantasia || '',
    situacao_cadastral: data.descricao_situacao_cadastral || '',
    cep: data.cep || '',
    logradouro: data.logradouro || '',
    numero: data.numero || '',
    complemento: data.complemento || '',
    bairro: data.bairro || '',
    cidade: data.municipio || '',
    estado: data.uf || '',
    telefone: data.ddd_telefone_1 || '',
    email: data.email || '',
    cnae_principal: data.cnae_fiscal_descricao || '',
  };
}

function normalizeCnpjWsData(data: CnpjWsResponse): NormalizedCnpjData {
  const company = data.estabelecimento || {};
  return {
    cnpj: company.cnpj || '',
    razao_social: data.razao_social || '',
    nome_fantasia: company.nome_fantasia || '',
    situacao_cadastral: company.situacao_cadastral || '',
    cep: company.cep || '',
    logradouro: company.logradouro || '',
    numero: company.numero || '',
    complemento: company.complemento || '',
    bairro: company.bairro || '',
    cidade: company.cidade?.nome || '',
    estado: company.estado?.sigla || '',
    telefone: [company.ddd1, company.telefone1].filter(Boolean).join(' '),
    email: company.email || '',
    cnae_principal: company.atividade_principal?.descricao || '',
  };
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(_request: Request, context: { params: Promise<{ cnpj: string }> }) {
  const { cnpj } = await context.params;
  const digits = onlyCnpjDigits(cnpj);

  if (!isValidCnpj(digits)) {
    return NextResponse.json({ success: false, error: 'CNPJ invalido.' }, { status: 400 });
  }

  try {
    const response = await fetchJsonWithTimeout(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);

    if (response.status === 404) {
      return NextResponse.json({ success: false, error: 'CNPJ nao encontrado.' }, { status: 404 });
    }

    if (!response.ok) {
      return NextResponse.json({ success: false, error: 'Falha ao consultar CNPJ.' }, { status: 502 });
    }

    const data = (await response.json()) as BrasilApiCnpjResponse;
    return NextResponse.json({ success: true, data: normalizeCnpjData(data) });
  } catch {}

  try {
    const response = await fetchJsonWithTimeout(`https://publica.cnpj.ws/cnpj/${digits}`);

    if (response.status === 404) {
      return NextResponse.json({ success: false, error: 'CNPJ nao encontrado.' }, { status: 404 });
    }

    if (!response.ok) {
      return NextResponse.json({ success: false, error: 'Falha ao consultar CNPJ.' }, { status: 502 });
    }

    const data = (await response.json()) as CnpjWsResponse;
    return NextResponse.json({ success: true, data: normalizeCnpjWsData(data) });
  } catch {
    return NextResponse.json({ success: false, error: 'Nao foi possivel conectar aos servicos de CNPJ agora. Preencha manualmente ou tente novamente mais tarde.' }, { status: 502 });
  }
}
