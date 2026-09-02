'use client';

import { useMemo, useState } from 'react';
import { Building2, Check, PlusCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * A empresa da atividade. Vem da tabela de obras, que ja guarda razao social,
 * CNPJ, logo e endereco completo do cliente — nao existe entidade duplicada.
 */
export type EmpresaOpcao = {
  id: string;
  nome: string;
  razaoSocial?: string | null;
  cnpj?: string | null;
  logoUrl?: string | null;
  detalhe?: string | null;
};

type CompanyStepProps = {
  empresas: EmpresaOpcao[];
  selectedId: string;
  onSelect: (empresaId: string) => void;
  onCreateNew: () => void;
  /** Projeto ao qual estas empresas pertencem. */
  projetoNome?: string;
  temProjeto?: boolean;
  onEscolherProjeto?: () => void;
};

function formatarCnpj(cnpj?: string | null) {
  const digitos = (cnpj || '').replace(/\D/g, '');
  if (digitos.length !== 14) return cnpj || '';
  return digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export function CompanyStep({
  empresas,
  selectedId,
  onSelect,
  onCreateNew,
  projetoNome,
  temProjeto = true,
  onEscolherProjeto,
}: CompanyStepProps) {
  const [busca, setBusca] = useState('');

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return empresas;
    return empresas.filter((empresa) =>
      `${empresa.nome} ${empresa.razaoSocial || ''} ${empresa.cnpj || ''}`.toLowerCase().includes(termo),
    );
  }, [busca, empresas]);

  // Sem projeto nao ha onde cadastrar empresa: a hierarquia e projeto > empresa.
  if (!temProjeto) {
    return (
      <div>
        <h3 className="font-headline text-h2 text-[#111111]">Escolha o projeto primeiro</h3>
        <p className="mt-2 max-w-[56ch] text-sm text-[#6e6a61]">
          As empresas ficam guardadas dentro de um projeto. Selecione ou crie um projeto
          para poder escolher a empresa desta atividade.
        </p>
        <Button
          type="button"
          className="mt-5 h-11 bg-[#7a1f1f] text-white hover:bg-[#5f1818]"
          onClick={onEscolherProjeto}
        >
          Selecionar projeto
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-headline text-h2 text-[#111111]">
        Para qual empresa será realizada esta atividade?
      </h3>
      <p className="mt-2 max-w-[60ch] text-sm text-[#6e6a61]">
        {projetoNome ? (
          <>
            Empresas cadastradas no projeto <strong className="font-semibold text-[#111111]">{projetoNome}</strong>.{' '}
          </>
        ) : (
          'Empresas cadastradas neste projeto. '
        )}
        Os dados dela entram no cabeçalho do documento.
      </p>

      {empresas.length > 3 && (
        <div className="mt-5 flex items-center gap-2 rounded-sm border border-[#cfcbc0] bg-white px-3">
          <Search className="h-4 w-4 shrink-0 text-[#6e6a61]" />
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome ou CNPJ..."
            className="h-11 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-[#6e6a61]"
          />
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {filtradas.map((empresa) => {
          const selecionada = empresa.id === selectedId;
          return (
            <button
              key={empresa.id}
              type="button"
              onClick={() => onSelect(empresa.id)}
              aria-pressed={selecionada}
              className={cn(
                'flex items-start gap-3 rounded-sm border bg-white p-4 text-left transition-colors',
                selecionada
                  ? 'border-[#7a1f1f] ring-1 ring-[#7a1f1f]'
                  : 'border-[#cfcbc0] hover:border-[#6e6a61]',
              )}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-[#e3e0d8] bg-[#f7f5f0]">
                {empresa.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={empresa.logoUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <Building2 className="h-5 w-5 text-[#6e6a61]" />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-[#111111]">
                  {empresa.razaoSocial || empresa.nome}
                </span>
                {empresa.cnpj && (
                  <span className="mt-0.5 block truncate text-xs tabular-nums text-[#6e6a61]">
                    {formatarCnpj(empresa.cnpj)}
                  </span>
                )}
                {empresa.detalhe && (
                  <span className="mt-1 block truncate text-xs text-[#6e6a61]">{empresa.detalhe}</span>
                )}
              </span>

              {selecionada && <Check className="h-5 w-5 shrink-0 text-[#7a1f1f]" aria-hidden="true" />}
            </button>
          );
        })}

        <button
          type="button"
          onClick={onCreateNew}
          className="flex flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-[#cfcbc0] bg-[#faf9f5] p-6 text-center transition-colors hover:border-[#7a1f1f] hover:bg-white"
        >
          <PlusCircle className="h-6 w-6 text-[#7a1f1f]" />
          <span className="text-sm font-semibold text-[#111111]">Cadastrar empresa</span>
          <span className="text-xs text-[#6e6a61]">Informe o CNPJ e o resto vem preenchido.</span>
        </button>
      </div>

      {empresas.length > 0 && filtradas.length === 0 && (
        <p className="mt-4 text-sm text-[#6e6a61]">Nenhuma empresa encontrada para “{busca}”.</p>
      )}

      {selectedId && (
        <div className="mt-5 flex items-center gap-2 rounded-sm border border-[#dde9e2] bg-[#eaf2ed] px-4 py-3 text-sm text-[#1b5e3f]">
          <Check className="h-4 w-4 shrink-0" />
          Empresa selecionada. Os dados dela vão para o cabeçalho do documento.
        </div>
      )}
    </div>
  );
}
