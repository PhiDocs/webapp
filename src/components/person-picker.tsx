'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { PhoneInput } from '@/components/ui/phone-input';
import { SignaturePad } from '@/components/signature-pad';
import { cn } from '@/lib/utils';
import { Check, Loader2, Mail, MessageCircle, PenLine, PlusCircle, Search, Trash2, UserPlus, X } from 'lucide-react';

/** Pessoa disponivel para escolha (funcionario cadastrado ou responsavel salvo). */
export type PersonOption = {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  /** CPF do cadastro. A PT exige documento de cada participante. */
  document?: string;
  organization?: string;
  /** 'contact' vem do cadastro reutilizavel e nao tem employeeId. */
  kind?: 'employee' | 'contact';
};

/** Pessoa ja vinculada ao documento. */
export type PickedPerson = {
  employeeId?: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  date?: string;
  document?: string;
  organization?: string;
  /** Apto para a atividade. Usado so na PT. */
  fitness?: string;
  /** Como a pessoa assina: por e-mail, por WhatsApp ou a mao. */
  signatureMethod?: 'email' | 'whatsapp' | 'manual';
  useAssinafy?: boolean;
  signatureData?: string;
  isManual?: boolean;
};

type NewPerson = PickedPerson & { saveForReuse?: boolean };

type PersonPickerProps = {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  addLabel: string;
  emptyHint: string;
  /** Pessoas oferecidas na lista de escolha. */
  options: PersonOption[];
  /** Pessoas ja adicionadas ao documento. */
  people: PickedPerson[];
  /** Responsaveis precisam de funcao; equipe executora nao. */
  requireRole?: boolean;
  /** A equipe executora registra a data de participacao. */
  withDate?: boolean;
  defaultDate?: string;
  /** A PT pede CPF e empresa de cada participante. */
  withDocument?: boolean;
  /** A PT registra se a pessoa esta apta para a atividade. */
  withFitness?: boolean;
  /** Habilita a caixa "salvar para reutilizar" no cadastro rapido. */
  canSaveContact?: boolean;
  isSavingContact?: boolean;
  onAdd: (person: NewPerson) => void | Promise<void>;
  onPatch: (index: number, patch: Partial<PickedPerson>) => void;
  onRemove: (index: number) => void;
  errorMessage?: string;
};

const METODOS = [
  { valor: 'email' as const, rotulo: 'E-mail', icone: Mail },
  { valor: 'whatsapp' as const, rotulo: 'WhatsApp', icone: MessageCircle },
  { valor: 'manual' as const, rotulo: 'Manual', icone: PenLine },
];

/** Documentos antigos so tem useAssinafy: true vira e-mail, false vira manual. */
function metodoDe(person: PickedPerson): 'email' | 'whatsapp' | 'manual' {
  return person.signatureMethod || (person.useAssinafy === false ? 'manual' : 'email');
}

function initialOf(name: string) {
  return (name || 'U').trim().slice(0, 1).toUpperCase();
}

function emptyDraft(requireRole: boolean, defaultDate?: string): NewPerson {
  return {
    name: '',
    role: '',
    email: '',
    phone: '',
    date: defaultDate,
    useAssinafy: true,
    isManual: true,
    saveForReuse: false,
    signatureData: '',
    ...(requireRole ? {} : {}),
  };
}

export function PersonPicker({
  title,
  subtitle,
  icon,
  addLabel,
  emptyHint,
  options,
  people,
  requireRole = false,
  withDate = false,
  defaultDate,
  withDocument = false,
  withFitness = false,
  canSaveContact = false,
  isSavingContact = false,
  onAdd,
  onPatch,
  onRemove,
  errorMessage,
}: PersonPickerProps) {
  const [mode, setMode] = useState<'idle' | 'picking' | 'creating'>('idle');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<NewPerson | null>(null);
  const [draftError, setDraftError] = useState('');

  // Quem ja esta no documento aparece marcado, para nao ser adicionado duas vezes.
  const addedKeys = useMemo(() => new Set(
    people.map((person) => person.employeeId || person.name.trim().toLowerCase()),
  ), [people]);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => `${option.name} ${option.role}`.toLowerCase().includes(query));
  }, [options, search]);

  const closePanel = () => {
    setMode('idle');
    setSearch('');
    setDraft(null);
    setDraftError('');
  };

  const openPicker = () => {
    // Sem ninguem cadastrado nao ha o que escolher: vai direto para o cadastro
    // rapido, em vez de abrir uma lista vazia.
    if (options.length === 0) {
      setDraft(emptyDraft(requireRole, defaultDate));
      setMode('creating');
    } else {
      setMode('picking');
    }
    setSearch('');
    setDraftError('');
  };

  const pickExisting = (option: PersonOption) => {
    void onAdd({
      employeeId: option.kind === 'contact' ? undefined : option.id,
      name: option.name,
      role: option.role,
      email: option.email || '',
      phone: option.phone || '',
      document: option.document || '',
      organization: option.organization || '',
      fitness: withFitness ? 'sim' : undefined,
      date: withDate ? defaultDate : undefined,
      signatureMethod: 'email',
      useAssinafy: true,
      isManual: false,
      signatureData: '',
    });
    closePanel();
  };

  const confirmDraft = async () => {
    if (!draft) return;

    if (!draft.name?.trim()) {
      setDraftError('Informe o nome da pessoa.');
      return;
    }

    if (requireRole && !draft.role?.trim()) {
      setDraftError('Informe a função da pessoa.');
      return;
    }

    await onAdd({
      ...draft,
      name: draft.name.trim(),
      role: draft.role?.trim() || '',
      email: draft.email?.trim() || '',
      phone: draft.phone?.trim() || '',
      date: withDate ? (draft.date || defaultDate) : undefined,
    });
    closePanel();
  };

  const isPanelOpen = mode !== 'idle';

  return (
    <div className="overflow-hidden rounded-md border border-[#cfcbc0] bg-white shadow-sm">
      <div className="flex flex-col gap-3 bg-[#111111] px-5 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center font-headline text-h3 text-white">
            {icon}
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-white/80">{subtitle}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPanelOpen}
          className="h-9 w-full justify-center rounded-md bg-background px-4 text-[#111111] hover:bg-background/90 sm:w-auto"
          onClick={openPicker}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {addLabel}
        </Button>
      </div>

      <div className="space-y-3 px-5 pb-5 pt-4">
        {people.length === 0 && !isPanelOpen && (
          <button
            type="button"
            onClick={openPicker}
            className="flex w-full flex-col items-center gap-2 rounded-md border border-dashed border-[#cfcbc0] bg-[#faf9f5] px-4 py-6 text-center transition-colors hover:bg-[#f2f1ed]"
          >
            <PlusCircle className="h-6 w-6 text-[#7a1f1f]" />
            <span className="text-sm font-medium text-[#111111]">{addLabel}</span>
            <span className="text-xs text-[#6e6a61]">{emptyHint}</span>
          </button>
        )}

        {people.map((person, index) => {
          const metodo = metodoDe(person);
          const missingEmail = metodo === 'email' && !person.email?.trim();
          const missingPhone = metodo === 'whatsapp' && !person.phone?.trim();

          return (
            <div
              key={`${person.employeeId || person.name}-${index}`}
              className="rounded-md border border-[#cfcbc0] bg-[#faf9f5] px-3 py-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#6e6a61] text-xs font-semibold text-white">
                  {initialOf(person.name)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#111111]">{person.name}</p>
                  <p className="truncate text-xs text-[#6e6a61]">
                    {person.role || 'Sem função informada'}
                    {person.document ? ` · ${person.document}` : ''}
                    {person.email ? ` · ${person.email}` : ''}
                  </p>
                </div>

                {withFitness && (
                  <div className="flex shrink-0 items-center gap-1 rounded-sm border border-[#cfcbc0] bg-white p-0.5">
                    {[
                      { valor: 'sim', rotulo: 'Apto' },
                      { valor: 'nao', rotulo: 'Não apto' },
                    ].map((opcao) => {
                      const ativo = (person.fitness || 'sim') === opcao.valor;
                      return (
                        <button
                          key={opcao.valor}
                          type="button"
                          onClick={() => onPatch(index, { fitness: opcao.valor })}
                          className={cn(
                            'rounded-sm px-2 py-1 text-xs font-medium transition-colors',
                            ativo
                              ? opcao.valor === 'sim'
                                ? 'bg-[#1b5e3f] text-white'
                                : 'bg-[#7a1f1f] text-white'
                              : 'text-[#6e6a61] hover:bg-[#f2f1ed]',
                          )}
                        >
                          {opcao.rotulo}
                        </button>
                      );
                    })}
                  </div>
                )}

                {withDate && (
                  <Input
                    type="date"
                    aria-label={`Data de participação de ${person.name}`}
                    value={person.date || ''}
                    onChange={(event) => onPatch(index, { date: event.target.value })}
                    className="h-9 w-[150px] rounded-md border-[#cfcbc0] bg-white text-xs"
                  />
                )}

                {/* Como esta pessoa assina. E-mail e WhatsApp ainda dependem
                    da plataforma de envio; manual e assinatura no papel. */}
                <div
                  role="group"
                  aria-label={`Forma de assinatura de ${person.name}`}
                  className="flex shrink-0 items-center gap-0.5 rounded-md border border-[#cfcbc0] bg-white p-0.5"
                >
                  {METODOS.map((opcao) => {
                    const Icone = opcao.icone;
                    const ativo = metodo === opcao.valor;
                    return (
                      <button
                        key={opcao.valor}
                        type="button"
                        aria-pressed={ativo}
                        title={`Assinar por ${opcao.rotulo}`}
                        onClick={() => onPatch(index, {
                          signatureMethod: opcao.valor,
                          // useAssinafy segue o metodo: so o e-mail vai para a Assinafy.
                          useAssinafy: opcao.valor === 'email',
                        })}
                        className={cn(
                          'flex h-8 items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition-colors',
                          ativo ? 'bg-[#7a1f1f] text-white' : 'text-[#6e6a61] hover:bg-[#f2f1ed]',
                        )}
                      >
                        <Icone className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{opcao.rotulo}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  aria-label={`Remover ${person.name}`}
                  className="text-[#7a1f1f] transition-colors hover:text-[#5f1818]"
                  onClick={() => onRemove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {missingPhone && (
                <div className="mt-3 rounded-md border border-[#e2a45c] bg-[#faf3e4] px-3 py-2">
                  <label className="flex flex-col gap-1.5 text-xs font-medium text-[#8a5a00] sm:flex-row sm:items-center sm:gap-3">
                    <span className="flex items-center gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5" />
                      Telefone para WhatsApp
                    </span>
                    <Input
                      value={person.phone || ''}
                      onChange={(event) => onPatch(index, { phone: event.target.value })}
                      placeholder="(00) 00000-0000"
                      className="h-9 flex-1 rounded-md border-[#e2a45c] bg-white text-sm"
                    />
                  </label>
                </div>
              )}

              {missingEmail && (
                <div className="mt-3 rounded-md border border-[#8a5a00] bg-[#faf3e4] px-3 py-2">
                  <label className="flex flex-col gap-1.5 text-xs font-medium text-[#8a5a00] sm:flex-row sm:items-center sm:gap-3">
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      E-mail para assinatura
                    </span>
                    <Input
                      value={person.email || ''}
                      onChange={(event) => onPatch(index, { email: event.target.value })}
                      placeholder="nome@empresa.com.br"
                      className="h-9 flex-1 rounded-md border-[#8a5a00] bg-white text-sm"
                    />
                  </label>
                </div>
              )}

              {metodo === 'manual' && (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-medium text-[#6e6a61]">
                    Assinatura no papel. Se quiser, colete aqui tambem:
                  </p>
                  <SignaturePad
                    value={person.signatureData}
                    onChange={(value) => onPatch(index, { signatureData: value })}
                  />
                </div>
              )}
            </div>
          );
        })}

        {mode === 'picking' && (
          <div className="overflow-hidden rounded-md border border-[#cfcbc0] bg-white">
            <div className="flex items-center gap-2 border-b border-[#cfcbc0] px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-[#6e6a61]" />
              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar pessoa..."
                className="h-8 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-[#cfcbc0]"
              />
              <button
                type="button"
                aria-label="Fechar"
                onClick={closePanel}
                className="text-[#6e6a61] transition-colors hover:text-[#111111]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul className="max-h-64 overflow-y-auto">
              {filteredOptions.map((option) => {
                const alreadyAdded = addedKeys.has(option.id) || addedKeys.has(option.name.trim().toLowerCase());
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => pickExisting(option)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#f2f1ed] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ebe9e3] text-xs font-semibold text-[#6e6a61]">
                        {initialOf(option.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#111111]">{option.name}</p>
                        <p className="truncate text-xs text-[#6e6a61]">{option.role || 'Sem função'}</p>
                      </div>
                      {alreadyAdded && (
                        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-[#1b5e3f]">
                          <Check className="h-3.5 w-3.5" />
                          Adicionado
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}

              {filteredOptions.length === 0 && (
                <li className="px-3 py-4 text-center text-sm text-[#6e6a61]">
                  Nenhuma pessoa encontrada.
                </li>
              )}
            </ul>

            <div className="border-t border-[#cfcbc0] bg-[#faf9f5] px-3 py-2">
              <button
                type="button"
                onClick={() => {
                  setDraft({ ...emptyDraft(requireRole, defaultDate), name: search.trim() });
                  setMode('creating');
                  setDraftError('');
                }}
                className="flex items-center gap-2 text-sm font-medium text-[#7a1f1f] transition-colors hover:text-[#5f1818]"
              >
                <UserPlus className="h-4 w-4" />
                Não encontrou? Cadastrar nova pessoa
              </button>
            </div>
          </div>
        )}

        {mode === 'creating' && draft && (
          <div className="space-y-3 rounded-md border border-[#cfcbc0] bg-[#faf9f5] p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#111111]">Cadastro rápido</p>
              {options.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('picking');
                    setDraftError('');
                  }}
                  className="text-xs font-medium text-[#6e6a61] transition-colors hover:text-[#111111]"
                >
                  Voltar para a lista
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-[#6e6a61]">Nome</label>
                <Input
                  autoFocus
                  value={draft.name}
                  onChange={(event) => setDraft((current) => current ? { ...current, name: event.target.value } : current)}
                  placeholder="Nome completo"
                  className="mt-1 h-10 rounded-md border-[#cfcbc0] bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#6e6a61]">
                  Função{requireRole ? '' : ' (opcional)'}
                </label>
                <Input
                  value={draft.role || ''}
                  onChange={(event) => setDraft((current) => current ? { ...current, role: event.target.value } : current)}
                  placeholder="Ex.: Eletricista"
                  className="mt-1 h-10 rounded-md border-[#cfcbc0] bg-white"
                />
              </div>
              {withDocument && (
                <>
                  <div>
                    <label className="text-xs font-medium text-[#6e6a61]">RG / CPF</label>
                    <Input
                      value={draft.document || ''}
                      onChange={(event) => setDraft((current) => current ? { ...current, document: event.target.value } : current)}
                      placeholder="000.000.000-00"
                      className="mt-1 h-10 rounded-md border-[#cfcbc0] bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#6e6a61]">Empresa</label>
                    <Input
                      value={draft.organization || ''}
                      onChange={(event) => setDraft((current) => current ? { ...current, organization: event.target.value } : current)}
                      placeholder="Empresa da pessoa"
                      className="mt-1 h-10 rounded-md border-[#cfcbc0] bg-white"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-medium text-[#6e6a61]">E-mail (para assinatura)</label>
                <Input
                  value={draft.email || ''}
                  onChange={(event) => setDraft((current) => current ? { ...current, email: event.target.value } : current)}
                  placeholder="nome@empresa.com.br"
                  className="mt-1 h-10 rounded-md border-[#cfcbc0] bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#6e6a61]">Telefone (opcional)</label>
                <div className="mt-1">
                  <PhoneInput
                    value={draft.phone || ''}
                    onChange={(value) => setDraft((current) => current ? { ...current, phone: value } : current)}
                  />
                </div>
              </div>
            </div>

            {canSaveContact && (
              <label className="flex items-start gap-3 rounded-md border border-[#cfcbc0] bg-white px-3 py-2.5">
                <Checkbox
                  className="mt-0.5"
                  checked={Boolean(draft.saveForReuse)}
                  onCheckedChange={(checked) => setDraft((current) => current ? { ...current, saveForReuse: checked === true } : current)}
                />
                <span className="text-xs leading-5 text-[#6e6a61]">
                  Salvar esta pessoa para reutilizar nos próximos documentos.
                </span>
              </label>
            )}

            {draftError ? <p className="text-sm font-medium text-destructive">{draftError}</p> : null}

            <div className="flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-md border-[#cfcbc0]"
                onClick={closePanel}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={isSavingContact}
                className="rounded-md bg-[#7a1f1f] text-white hover:bg-[#5f1818]"
                onClick={() => { void confirmDraft(); }}
              >
                {isSavingContact && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Adicionar
              </Button>
            </div>
          </div>
        )}

        {errorMessage ? <p className="text-sm font-medium text-destructive">{errorMessage}</p> : null}
      </div>
    </div>
  );
}
