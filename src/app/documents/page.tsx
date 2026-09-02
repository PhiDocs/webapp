'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/auth/session-provider';
import { getDocuments, deleteDocument } from '@/server/document-actions';
import { getSignatureDocuments, refreshSignatureDocument, resendSignatureNotification } from '@/server/signature-actions';
import type { SavedDocument, SignatureDocument } from '@/lib/types';
import {
  CORES_POR_TOM, DOCUMENT_STATUS, STATUS_INFO,
  progressoAssinaturas, resolverStatus, type DocumentStatus,
} from '@/lib/document-status';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { UserNav } from '@/components/auth/user-nav';
import { Logo } from '@/components/icons/logo';
import { createSupabaseBrowserClient } from '@/supabase/browser';
import { signOut } from '@/server/auth-actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  EllipsisVertical,
  Eye,
  FileCheck2,
  FileClock,
  FilePenLine,
  FileText,
  HardHat,
  Loader2,
  LogOut,
  PenSquare,
  RefreshCw,
  Search,
  Settings,
  Shield,
  UserCog,
  UserRound,
  Users,
} from 'lucide-react';

type FilterType = 'all' | 'draft' | 'signature' | 'completed';

type DocumentRow = {
  id: string;
  /** De onde veio a linha. Define quais acoes o menu oferece. */
  kind: 'draft' | 'signature';
  name: string;
  type: string;
  /** Estado do ciclo de vida, unico em todo o sistema. Ver lib/document-status. */
  status: DocumentStatus;
  date: string;
  workName: string;
  /**
   * Assinatura vinculada, quando existe. Documento assinado no WhatsApp ou na
   * mao nunca passa pela Assinafy e continua aparecendo na lista sem isto.
   */
  assinatura?: SignatureDocument;
  raw: SavedDocument | SignatureDocument;
};

const PAGE_SIZE = 10;

const adminNavItems = [
  { label: 'Acessos', icon: Users, section: 'teamAccess' },
  { label: 'Obras', icon: HardHat, section: 'works' },
  { label: 'Colaboradores', icon: UserRound, section: 'collaborators' },
  { label: 'Funcionarios', icon: Users, section: 'employees' },
  { label: 'Cargos', icon: Shield, section: 'jobRoles' },
  { label: 'Terceirizadas', icon: UserCog, section: 'subcontractors' },
  { label: 'Configuracoes', icon: Settings, section: 'settings' },
] as const;

const aprPtNavItems = adminNavItems.filter((item) =>
  ['works', 'employees', 'jobRoles', 'subcontractors'].includes(item.section)
);
const standaloneNavItems = adminNavItems.filter((item) =>
  !['works', 'employees', 'jobRoles', 'subcontractors'].includes(item.section)
);

const filters: Array<{ value: FilterType; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'draft', label: 'Rascunhos' },
  { value: 'signature', label: 'Em Assinatura' },
  { value: 'completed', label: 'Concluidos' },
];

/** Quais estados cada aba mostra. 'all' nao filtra nada. */
const ESTADOS_POR_FILTRO: Record<Exclude<FilterType, 'all'>, DocumentStatus[]> = {
  draft: [DOCUMENT_STATUS.DRAFT, DOCUMENT_STATUS.IN_REVIEW],
  signature: [DOCUMENT_STATUS.AWAITING_SIGNATURE],
  completed: [DOCUMENT_STATUS.SIGNED, DOCUMENT_STATUS.COMPLETED],
};

function formatShortDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).replace('.', '');
  } catch {
    return dateString;
  }
}

/**
 * O rotulo e a cor saem do ciclo de vida, nao de uma tabela propria desta tela.
 * Assim a lista, o painel do documento e a trilha falam a mesma lingua.
 */
function getStatusPill(status: DocumentStatus) {
  const info = STATUS_INFO[status];
  const cores = CORES_POR_TOM[info.tom];
  const concluido = status === DOCUMENT_STATUS.SIGNED || status === DOCUMENT_STATUS.COMPLETED;

  return {
    label: info.rotulo,
    style: { backgroundColor: cores.fundo, color: cores.texto },
    icon: concluido
      ? <CheckCircle2 className="h-3.5 w-3.5" />
      : <span className="h-1.5 w-1.5 rounded-full" style={{ background: cores.ponto }} />,
  };
}

function getTypeBadge(type: string) {
  return type === 'APR'
    ? 'bg-[#f7f5f0] text-[#111111]'
    : 'bg-[#e3e0d8] text-[#111111]';
}

function getDocumentIcon(row: DocumentRow) {
  if (row.status === DOCUMENT_STATUS.SIGNED || row.status === DOCUMENT_STATUS.COMPLETED) {
    return <FileCheck2 className="h-6 w-6 text-[#1b5e3f]" />;
  }
  if (row.status === DOCUMENT_STATUS.AWAITING_SIGNATURE) {
    return <FileClock className="h-6 w-6 text-[#7a1f1f]" />;
  }
  if (row.status === DOCUMENT_STATUS.DRAFT || row.status === DOCUMENT_STATUS.IN_REVIEW) {
    return <FilePenLine className="h-6 w-6 text-[#7a1f1f]" />;
  }
  return <FileText className="h-6 w-6 text-[#6e6a61]" />;
}

export default function DocumentsPage() {
  const { user } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [drafts, setDrafts] = useState<SavedDocument[]>([]);
  const [signatures, setSignatures] = useState<SignatureDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rowRefreshingId, setRowRefreshingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [isAprPtMenuOpen, setIsAprPtMenuOpen] = useState(true);

  const loadData = async () => {
    if (!user?.companyId) {
      return;
    }

    setLoading(true);
    const [docsResult, sigsResult] = await Promise.all([
      getDocuments(user.companyId),
      getSignatureDocuments(user.companyId),
    ]);

    if (docsResult.success && docsResult.data) {
      setDrafts(docsResult.data);
    }

    if (sigsResult.success && sigsResult.data) {
      setSignatures(sigsResult.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (user && !user.companyId) {
      router.replace('/awaiting-company');
      return;
    }

    void loadData();
  }, [user, user?.companyId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo<DocumentRow[]>(() => {
    const porId = new Map(signatures.map((assinatura) => [assinatura.id, assinatura]));

    // Todo documento entra, em qualquer estado. Antes so 'draft' aparecia, e o
    // que fosse para revisao, para assinatura manual ou fosse cancelado sumia.
    const documentRows = drafts.map((documento) => {
      const assinatura = documento.signatureDocumentId
        ? porId.get(documento.signatureDocumentId)
        : undefined;

      return {
        id: documento.id,
        kind: 'draft' as const,
        name: documento.documentName,
        type: documento.documentType,
        status: resolverStatus(documento, assinatura),
        date: documento.updatedAt || documento.createdAt,
        workName: documento.formData?.workName || 'Nao informado',
        assinatura,
        raw: documento,
      };
    });

    // Assinaturas antigas que nao apontam para nenhum documento continuam visiveis.
    const vinculadas = new Set(
      drafts.map((documento) => documento.signatureDocumentId).filter(Boolean)
    );
    const orfas = signatures
      .filter((assinatura) => !vinculadas.has(assinatura.id))
      .map((assinatura) => ({
        id: assinatura.id,
        kind: 'signature' as const,
        name: assinatura.documentName,
        type: assinatura.documentType,
        status: resolverStatus({ status: 'sent' }, assinatura),
        date: assinatura.createdAt,
        workName: 'Nao informado',
        assinatura,
        raw: assinatura,
      }));

    return [...documentRows, ...orfas].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [drafts, signatures]);

  const stats = useMemo(() => {
    const total = rows.length;
    const pending = rows.filter(
      (row) => row.status === DOCUMENT_STATUS.AWAITING_SIGNATURE
    ).length;
    const completed = rows.filter((row) =>
      ESTADOS_POR_FILTRO.completed.includes(row.status)
    ).length;
    const draftCount = rows.filter((row) =>
      ESTADOS_POR_FILTRO.draft.includes(row.status)
    ).length;

    return { total, pending, completed, draftCount };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const statusFiltered = rows.filter((row) =>
      filter === 'all' ? true : ESTADOS_POR_FILTRO[filter].includes(row.status)
    );

    if (!query) {
      return statusFiltered;
    }

    return statusFiltered.filter((row) =>
      [row.name, row.type, row.workName].join(' ').toLowerCase().includes(query)
    );
  }, [filter, rows, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleOpenDraft = (draft: SavedDocument) => {
    router.push(`/reports?documentId=${draft.id}`);
  };

  const handleDeleteDraft = async (id: string) => {
    setDeletingId(id);
    try {
      const result = await deleteDocument(id);
      if (result.success) {
        setDrafts((current) => current.filter((draft) => draft.id !== id));
        toast({ title: 'Documento excluido' });
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: result.error });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleRefreshAll = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRefreshSignature = async (id: string) => {
    setRowRefreshingId(id);
    await refreshSignatureDocument(id);
    await loadData();
    setRowRefreshingId(null);
  };

  const handleResend = async (id: string) => {
    setResendingId(id);
    const result = await resendSignatureNotification(id);
    if (result.success) {
      toast({ title: 'Convite reenviado com sucesso.' });
    } else {
      toast({ variant: 'destructive', title: 'Erro ao reenviar', description: result.error });
    }
    setResendingId(null);
  };

  const handleDownload = async (id: string, fileName: string) => {
    const response = await fetch(`/api/assinafy/download/${id}`);
    if (!response.ok) {
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'documento_assinado.pdf';
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    link.remove();
  };

  const handlePreviewRow = (row: DocumentRow) => {
    const assinatura = row.assinatura;

    // Enquanto falta assinar, o util e cair direto no link de assinatura.
    if (assinatura && row.status === DOCUMENT_STATUS.AWAITING_SIGNATURE) {
      const pendente = assinatura.signers.find((signer) => signer.signingUrl);
      if (pendente?.signingUrl) {
        window.open(pendente.signingUrl, '_blank', 'noopener,noreferrer');
        return;
      }
    }

    if (assinatura && ESTADOS_POR_FILTRO.completed.includes(row.status)) {
      void handleDownload(
        assinatura.id,
        assinatura.documentName.replace('.pdf', '_assinado.pdf')
      );
      return;
    }

    if (row.kind === 'draft') {
      handleOpenDraft(row.raw as SavedDocument);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    await createSupabaseBrowserClient().auth.signOut();
    router.push('/login');
  };

  const companyPanelHref = (section: (typeof adminNavItems)[number]['section']) =>
    user?.companyId ? `/company/${user.companyId}?section=${section}` : '#';

  const pageButtons = Array.from({ length: Math.min(3, totalPages) }, (_, index) => index + 1);

  return (
    <div className="min-h-screen bg-[#f2f1ed]">
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col border-r border-[#cfcbc0] bg-[#f2f1ed] py-4 lg:flex">
        <div className="px-4 pb-8">
          <div className="space-y-3">
            <Logo className="h-auto w-[210px]" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6e6a61]">Phi Docs</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <div className="mx-2">
            <button
              type="button"
              onClick={() => setIsAprPtMenuOpen((current) => !current)}
              className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-[1rem] font-semibold text-[#6e6a61] transition-colors hover:bg-[#e3e0d8] hover:text-[#111111]"
            >
              <span className="flex items-center gap-4">
                <FileText className="h-5 w-5" />
                APRs/PT
              </span>
              <ChevronDown className={['h-4 w-4 transition-transform', isAprPtMenuOpen ? 'rotate-180' : ''].join(' ')} />
            </button>
            {isAprPtMenuOpen && (
              <div className="mt-1 space-y-1 border-l border-[#e3e0d8] pl-3">
                {aprPtNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      href={companyPanelHref(item.section)}
                      className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-[0.95rem] text-[#6e6a61] transition-colors hover:bg-[#e3e0d8] hover:text-[#111111]"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          {standaloneNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={companyPanelHref(item.section)}
                className="mx-2 flex items-center gap-4 rounded-xl px-4 py-3 text-[1rem] text-[#6e6a61] transition-colors hover:bg-[#e3e0d8] hover:text-[#111111]"
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[#cfcbc0]/30 px-4 py-4">
          <Button
            onClick={() => router.push('/reports')}
            className="h-14 w-full rounded-xl bg-[#7a1f1f] text-[1rem] font-semibold text-[#8a5a00] hover:bg-[#5f1818]"
          >
            <Briefcase className="h-5 w-5" />
            Novo Relatorio
          </Button>

          <div className="mt-4 space-y-1">
            <Button variant="ghost" className="h-11 w-full justify-start rounded-xl px-4 text-[0.95rem] text-[#6e6a61] hover:bg-[#e3e0d8] hover:text-[#111111]">
              <CircleHelp className="h-5 w-5" />
              Suporte
            </Button>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="h-11 w-full justify-start rounded-xl px-4 text-[0.95rem] text-[#7a1f1f] hover:bg-[#f0e2e0] hover:text-[#7a1f1f]"
            >
              <LogOut className="h-5 w-5" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#cfcbc0] bg-white px-6 shadow-sm">
          <div className="flex items-center gap-6">
            <Logo className="h-auto w-[170px]" />
            <nav className="hidden items-center gap-6 md:flex">
              <Link href="/reports" className="text-[1rem] text-[#6e6a61] transition-colors hover:text-[#7a1f1f]">
                Relatorios
              </Link>
              <Link href="/documents" className="border-b-2 border-[#7a1f1f] pb-1 text-[1rem] font-bold text-[#7a1f1f]">
                Documentos
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-[#6e6a61] hover:bg-[#ebe9e3]">
                <Bell className="h-5 w-5" />
              </Button>
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#7a1f1f]" />
            </div>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-[#6e6a61] hover:bg-[#ebe9e3]">
              <CircleHelp className="h-5 w-5" />
            </Button>
            <UserNav />
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-6">
          <section className="mb-6">
            <h2 className="font-headline text-[3.75rem] font-bold leading-[1.05] tracking-[-0.03em] text-[#111111]">Documentos</h2>
            <p className="mt-3 max-w-4xl text-[1.2rem] leading-10 text-[#6e6a61]">
              Gerencie rascunhos, documentos enviados e o status de assinaturas em tempo real.
            </p>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#cfcbc0] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-all hover:border-[#7a1f1f]/30">
              <div className="mb-2 flex items-start justify-between">
                <FileText className="h-10 w-10 text-[#6e6a61]" />
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#6e6a61]">Total</span>
              </div>
              <div className="font-headline text-[3rem] font-semibold leading-none text-[#111111]">{stats.total}</div>
              <p className="mt-3 text-[1rem] text-[#6e6a61]">Documentos totais</p>
            </div>

            <div className="rounded-2xl border border-[#cfcbc0] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-all hover:border-[#7a1f1f]/30">
              <div className="mb-2 flex items-start justify-between">
                <FileClock className="h-10 w-10 text-[#7a1f1f]" />
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#7a1f1f]">Em Assinatura</span>
              </div>
              <div className="font-headline text-[3rem] font-semibold leading-none text-[#111111]">{stats.pending}</div>
              <p className="mt-3 text-[1rem] text-[#6e6a61]">Aguardando firmas</p>
            </div>

            <div className="rounded-2xl border border-[#cfcbc0] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-all hover:border-[#7a1f1f]/30">
              <div className="mb-2 flex items-start justify-between">
                <CheckCircle2 className="h-10 w-10 text-[#1b5e3f]" />
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#1b5e3f]">Concluidos</span>
              </div>
              <div className="font-headline text-[3rem] font-semibold leading-none text-[#111111]">{stats.completed}</div>
              <p className="mt-3 text-[1rem] text-[#6e6a61]">Validos e arquivados</p>
            </div>

            <div className="rounded-2xl border border-[#cfcbc0] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-all hover:border-[#7a1f1f]/30">
              <div className="mb-2 flex items-start justify-between">
                <FilePenLine className="h-10 w-10 text-[#6e6a61]" />
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#6e6a61]">Rascunhos</span>
              </div>
              <div className="font-headline text-[3rem] font-semibold leading-none text-[#111111]">{stats.draftCount}</div>
              <p className="mt-3 text-[1rem] text-[#6e6a61]">Edicoes pendentes</p>
            </div>
          </section>

          <section className="mb-4 flex flex-col gap-4 rounded-2xl border border-[#cfcbc0] bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="flex w-full self-start overflow-x-auto rounded-lg bg-[#f2f1ed] p-1 md:w-auto">
              {filters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={[
                    'whitespace-nowrap rounded-md px-5 py-2 text-[0.95rem] transition-colors',
                    filter === item.value
                      ? 'bg-white font-bold text-[#7a1f1f] shadow-sm'
                      : 'text-[#6e6a61] hover:text-[#7a1f1f]',
                  ].join(' ')}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex w-full flex-col gap-4 md:w-auto md:flex-row">
              <div className="relative flex-1 md:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6e6a61]" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar documento..."
                  className="h-11 w-full rounded-lg border border-[#cfcbc0] bg-[#f2f1ed] pl-11 pr-4 text-[0.95rem] text-[#111111] outline-none focus:border-[#7a1f1f] focus:ring-2 focus:ring-[#7a1f1f]/15"
                />
              </div>
              <Button
                type="button"
                onClick={handleRefreshAll}
                disabled={refreshing || loading}
                className="h-11 rounded-lg bg-[#111111] px-8 text-[0.95rem] font-semibold text-white hover:bg-[#111111]"
              >
                {refreshing || loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                Atualizar Status
              </Button>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#cfcbc0] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#cfcbc0] bg-[#f2f1ed]">
                    <th className="px-8 py-5 text-[1rem] font-bold text-[#6e6a61]">Documento</th>
                    <th className="px-6 py-5 text-[1rem] font-bold text-[#6e6a61]">Tipo</th>
                    <th className="px-6 py-5 text-[1rem] font-bold text-[#6e6a61]">Status</th>
                    <th className="px-6 py-5 text-[1rem] font-bold text-[#6e6a61]">Data</th>
                    <th className="px-6 py-5 text-[1rem] font-bold text-[#6e6a61]">Obra</th>
                    <th className="px-8 py-5 text-right text-[1rem] font-bold text-[#6e6a61]">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#cfcbc0]/40">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#7a1f1f]" />
                      </td>
                    </tr>
                  ) : visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-16 text-center text-[1rem] text-[#6e6a61]">
                        Nenhum documento encontrado.
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((row) => {
                      const statusPill = getStatusPill(row.status);
                      const assinaturaId = row.assinatura?.id;
                      const concluido = ESTADOS_POR_FILTRO.completed.includes(row.status);
                      // Excluir so enquanto o documento ainda e rascunho, como antes.
                      const podeExcluir = ESTADOS_POR_FILTRO.draft.includes(row.status);
                      return (
                        <tr key={`${row.kind}-${row.id}`} className="group transition-colors hover:bg-[#f7f5f0]">
                          <td className="px-8 py-5">
                            <div className="flex items-start gap-4">
                              <div className="pt-1">{getDocumentIcon(row)}</div>
                              <span className="max-w-[420px] text-[1rem] font-semibold leading-10 text-[#111111]">{row.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`rounded-sm px-2 py-1 text-xs font-bold uppercase tracking-tight ${getTypeBadge(row.type)}`}>
                              {row.type}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span
                              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.95rem] font-semibold"
                              style={statusPill.style}
                            >
                              {statusPill.icon}
                              {statusPill.label}
                            </span>
                            {row.assinatura && row.status === DOCUMENT_STATUS.AWAITING_SIGNATURE && (
                              <span className="mt-1 block text-xs tabular-nums text-[#6e6a61]">
                                {progressoAssinaturas(row.assinatura).concluidas} de{' '}
                                {progressoAssinaturas(row.assinatura).total} assinaram
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-5 text-[1rem] leading-9 text-[#6e6a61]">{formatShortDate(row.date)}</td>
                          <td className="px-6 py-5 text-[1rem] leading-9 text-[#6e6a61]">{row.workName}</td>
                          <td className="px-8 py-5">
                            <div className="flex items-center justify-end gap-2 opacity-70 transition-opacity group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => {
                                  if (row.kind === 'draft') {
                                    handleOpenDraft(row.raw as SavedDocument);
                                  }
                                }}
                                className="rounded-lg p-2 text-[#8a5a00] transition-colors hover:bg-[#f2f1ed] hover:text-[#7a1f1f]"
                                title="Abrir"
                              >
                                <PenSquare className="h-6 w-6" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePreviewRow(row)}
                                className="rounded-lg p-2 text-[#cfcbc0] transition-colors hover:bg-[#f2f1ed] hover:text-[#6e6a61]"
                                title="Visualizar"
                              >
                                <Eye className="h-6 w-6" />
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="rounded-lg p-2 text-[#cfcbc0] transition-colors hover:bg-[#f2f1ed] hover:text-[#6e6a61]"
                                  >
                                    <EllipsisVertical className="h-6 w-6" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                  {row.kind === 'draft' && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleOpenDraft(row.raw as SavedDocument)}>
                                        Abrir documento
                                      </DropdownMenuItem>
                                      {podeExcluir && (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <button className="flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm text-[#7a1f1f] outline-none transition-colors hover:bg-[#f6edec]">
                                            {deletingId === row.id ? 'Excluindo...' : 'Excluir'}
                                          </button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Esta acao nao pode ser desfeita. O rascunho sera excluido permanentemente.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteDraft(row.id)}>
                                              Excluir
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                      )}
                                    </>
                                  )}
                                  {assinaturaId && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => handleRefreshSignature(assinaturaId)}
                                        disabled={rowRefreshingId === assinaturaId}
                                      >
                                        {rowRefreshingId === assinaturaId ? 'Atualizando...' : 'Atualizar status'}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleResend(assinaturaId)}
                                        disabled={resendingId === assinaturaId || concluido}
                                      >
                                        {resendingId === assinaturaId ? 'Reenviando...' : 'Reenviar notificacao'}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleDownload(
                                            assinaturaId,
                                            row.name.replace('.pdf', '_assinado.pdf')
                                          )
                                        }
                                        disabled={!concluido}
                                      >
                                        Baixar PDF
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-4 border-t border-[#cfcbc0] px-8 py-7 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[1rem] text-[#6e6a61]">
                Exibindo {visibleRows.length} de {filteredRows.length} documentos
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#cfcbc0] text-[#6e6a61] transition-colors hover:bg-[#f2f1ed] disabled:opacity-30"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                {pageButtons.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={[
                      'h-12 w-12 rounded-xl border font-bold transition-colors',
                      currentPage === page
                        ? 'border-[#7a1f1f] bg-[#7a1f1f] text-white'
                        : 'border-[#cfcbc0] bg-white text-[#111111] hover:bg-[#f2f1ed]',
                    ].join(' ')}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#cfcbc0] text-[#111111] transition-colors hover:bg-[#f2f1ed] disabled:opacity-30"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
