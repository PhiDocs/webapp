'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/auth/session-provider';
import { getDocuments, deleteDocument } from '@/server/document-actions';
import { getSignatureDocuments, refreshSignatureDocument, resendSignatureNotification } from '@/server/signature-actions';
import type { SavedDocument, SignatureDocument } from '@/lib/types';
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
  kind: 'draft' | 'signature';
  name: string;
  type: string;
  status: 'draft' | 'pending' | 'completed' | 'uploaded' | 'declined' | 'expired';
  date: string;
  workName: string;
  raw: SavedDocument | SignatureDocument;
};

const PAGE_SIZE = 10;

const adminNavItems = [
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

function normalizeSignatureStatus(status: SignatureDocument['status']): DocumentRow['status'] {
  if (status === 'signed' || status === 'certificated') return 'completed';
  if (status === 'uploaded') return 'uploaded';
  if (status === 'declined') return 'declined';
  if (status === 'expired') return 'expired';
  return 'pending';
}

function getStatusPill(status: DocumentRow['status']) {
  switch (status) {
    case 'completed':
      return {
        label: 'Assinado',
        className: 'bg-[#ddf7e3] text-[#0f9f46]',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      };
    case 'pending':
      return {
        label: 'Pendente',
        className: 'bg-[#ffe6cc] text-[#b45309]',
        icon: <span className="h-1.5 w-1.5 rounded-full bg-[#b45309]" />,
      };
    case 'uploaded':
      return {
        label: 'Enviado',
        className: 'bg-[#e5efff] text-[#415778]',
        icon: <span className="h-1.5 w-1.5 rounded-full bg-[#415778]" />,
      };
    case 'expired':
      return {
        label: 'Expirado',
        className: 'bg-[#eceef1] text-[#4f5f7a]',
        icon: <span className="h-1.5 w-1.5 rounded-full bg-[#4f5f7a]" />,
      };
    case 'declined':
      return {
        label: 'Recusado',
        className: 'bg-[#ffdfdc] text-[#ba1a1a]',
        icon: <span className="h-1.5 w-1.5 rounded-full bg-[#ba1a1a]" />,
      };
    case 'draft':
    default:
      return {
        label: 'Rascunho',
        className: 'bg-[#eceef1] text-[#4f5f7a]',
        icon: <span className="h-1.5 w-1.5 rounded-full bg-[#4f5f7a]" />,
      };
  }
}

function getTypeBadge(type: string) {
  return type === 'APR'
    ? 'bg-[#d8e5fb] text-[#51617d]'
    : 'bg-[#b6c7e7] text-[#2d3f59]';
}

function getDocumentIcon(row: DocumentRow) {
  if (row.status === 'completed') return <FileCheck2 className="h-6 w-6 text-[#0f9f46]" />;
  if (row.status === 'pending') return <FileClock className="h-6 w-6 text-[#9e4300]" />;
  if (row.kind === 'draft') return <FilePenLine className="h-6 w-6 text-[#9e4300]" />;
  return <FileText className="h-6 w-6 text-[#4f5f7a]" />;
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
    const draftRows = drafts
      .filter((draft) => draft.status === 'draft')
      .map((draft) => ({
        id: draft.id,
        kind: 'draft' as const,
        name: draft.documentName,
        type: draft.documentType,
        status: 'draft' as const,
        date: draft.updatedAt || draft.createdAt,
        workName: draft.formData?.workName || 'Nao informado',
        raw: draft,
      }));

    const signatureRows = signatures.map((signature) => ({
      id: signature.id,
      kind: 'signature' as const,
      name: signature.documentName,
      type: signature.documentType,
      status: normalizeSignatureStatus(signature.status),
      date: signature.createdAt,
      workName: 'Nao informado',
      raw: signature,
    }));

    return [...draftRows, ...signatureRows].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [drafts, signatures]);

  const stats = useMemo(() => {
    const total = rows.length;
    const pending = rows.filter((row) => row.status === 'pending' || row.status === 'uploaded').length;
    const completed = rows.filter((row) => row.status === 'completed').length;
    const draftCount = rows.filter((row) => row.status === 'draft').length;

    return { total, pending, completed, draftCount };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const statusFiltered = rows.filter((row) => {
      if (filter === 'draft') return row.status === 'draft';
      if (filter === 'signature') return row.status === 'pending' || row.status === 'uploaded';
      if (filter === 'completed') return row.status === 'completed';
      return true;
    });

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
    if (row.kind === 'draft') {
      handleOpenDraft(row.raw as SavedDocument);
      return;
    }

    const signature = row.raw as SignatureDocument;
    const firstPendingSigner = signature.signers.find((signer) => signer.signingUrl);
    if (firstPendingSigner?.signingUrl) {
      window.open(firstPendingSigner.signingUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (row.status === 'completed') {
      void handleDownload(signature.id, signature.documentName.replace('.pdf', '_assinado.pdf'));
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
    <div className="min-h-screen bg-[#f7f9fc]">
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col border-r border-[#e0c0b1] bg-[#f2f4f7] py-4 lg:flex">
        <div className="px-4 pb-8">
          <div className="space-y-3">
            <Logo className="h-auto w-[210px]" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4f5f7a]">Phi Docs</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <div className="mx-2">
            <button
              type="button"
              onClick={() => setIsAprPtMenuOpen((current) => !current)}
              className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-[1rem] font-semibold text-[#4f5f7a] transition-colors hover:bg-[#e6e8eb] hover:text-[#191c1e]"
            >
              <span className="flex items-center gap-4">
                <FileText className="h-5 w-5" />
                APRs/PT
              </span>
              <ChevronDown className={['h-4 w-4 transition-transform', isAprPtMenuOpen ? 'rotate-180' : ''].join(' ')} />
            </button>
            {isAprPtMenuOpen && (
              <div className="mt-1 space-y-1 border-l border-[#d8dadd] pl-3">
                {aprPtNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      href={companyPanelHref(item.section)}
                      className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-[0.95rem] text-[#4f5f7a] transition-colors hover:bg-[#e6e8eb] hover:text-[#191c1e]"
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
                className="mx-2 flex items-center gap-4 rounded-xl px-4 py-3 text-[1rem] text-[#4f5f7a] transition-colors hover:bg-[#e6e8eb] hover:text-[#191c1e]"
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[#e0c0b1]/30 px-4 py-4">
          <Button
            onClick={() => router.push('/reports')}
            className="h-14 w-full rounded-xl bg-[#f46e11] text-[1rem] font-semibold text-[#521f00] hover:bg-[#e96710]"
          >
            <Briefcase className="h-5 w-5" />
            Novo Relatorio
          </Button>

          <div className="mt-4 space-y-1">
            <Button variant="ghost" className="h-11 w-full justify-start rounded-xl px-4 text-[0.95rem] text-[#4f5f7a] hover:bg-[#e6e8eb] hover:text-[#191c1e]">
              <CircleHelp className="h-5 w-5" />
              Suporte
            </Button>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="h-11 w-full justify-start rounded-xl px-4 text-[0.95rem] text-[#ba1a1a] hover:bg-[#ffdfdc] hover:text-[#ba1a1a]"
            >
              <LogOut className="h-5 w-5" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#e0c0b1] bg-white px-6 shadow-sm">
          <div className="flex items-center gap-6">
            <Logo className="h-auto w-[170px]" />
            <nav className="hidden items-center gap-6 md:flex">
              <Link href="/reports" className="text-[1rem] text-[#584237] transition-colors hover:text-[#9e4300]">
                Relatorios
              </Link>
              <Link href="/documents" className="border-b-2 border-[#9e4300] pb-1 text-[1rem] font-bold text-[#9e4300]">
                Documentos
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-[#4f5f7a] hover:bg-[#eef1f5]">
                <Bell className="h-5 w-5" />
              </Button>
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#9e4300]" />
            </div>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-[#4f5f7a] hover:bg-[#eef1f5]">
              <CircleHelp className="h-5 w-5" />
            </Button>
            <UserNav />
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-6">
          <section className="mb-6">
            <h2 className="font-headline text-[3.75rem] font-bold leading-[1.05] tracking-[-0.03em] text-[#191c1e]">Documentos</h2>
            <p className="mt-3 max-w-4xl text-[1.2rem] leading-10 text-[#4f5f7a]">
              Gerencie rascunhos, documentos enviados e o status de assinaturas em tempo real.
            </p>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#e0c0b1] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-all hover:border-[#9e4300]/30">
              <div className="mb-2 flex items-start justify-between">
                <FileText className="h-10 w-10 text-[#4f5f7a]" />
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#4f5f7a]">Total</span>
              </div>
              <div className="font-headline text-[3rem] font-semibold leading-none text-[#191c1e]">{stats.total}</div>
              <p className="mt-3 text-[1rem] text-[#4f5f7a]">Documentos totais</p>
            </div>

            <div className="rounded-2xl border border-[#e0c0b1] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-all hover:border-[#9e4300]/30">
              <div className="mb-2 flex items-start justify-between">
                <FileClock className="h-10 w-10 text-[#9e4300]" />
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#9e4300]">Em Assinatura</span>
              </div>
              <div className="font-headline text-[3rem] font-semibold leading-none text-[#191c1e]">{stats.pending}</div>
              <p className="mt-3 text-[1rem] text-[#4f5f7a]">Aguardando firmas</p>
            </div>

            <div className="rounded-2xl border border-[#e0c0b1] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-all hover:border-[#9e4300]/30">
              <div className="mb-2 flex items-start justify-between">
                <CheckCircle2 className="h-10 w-10 text-[#0f9f46]" />
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f9f46]">Concluidos</span>
              </div>
              <div className="font-headline text-[3rem] font-semibold leading-none text-[#191c1e]">{stats.completed}</div>
              <p className="mt-3 text-[1rem] text-[#4f5f7a]">Validos e arquivados</p>
            </div>

            <div className="rounded-2xl border border-[#e0c0b1] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-all hover:border-[#9e4300]/30">
              <div className="mb-2 flex items-start justify-between">
                <FilePenLine className="h-10 w-10 text-[#584237]" />
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#584237]">Rascunhos</span>
              </div>
              <div className="font-headline text-[3rem] font-semibold leading-none text-[#191c1e]">{stats.draftCount}</div>
              <p className="mt-3 text-[1rem] text-[#4f5f7a]">Edicoes pendentes</p>
            </div>
          </section>

          <section className="mb-4 flex flex-col gap-4 rounded-2xl border border-[#e0c0b1] bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="flex w-full self-start overflow-x-auto rounded-lg bg-[#f2f4f7] p-1 md:w-auto">
              {filters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={[
                    'whitespace-nowrap rounded-md px-5 py-2 text-[0.95rem] transition-colors',
                    filter === item.value
                      ? 'bg-white font-bold text-[#9e4300] shadow-sm'
                      : 'text-[#4f5f7a] hover:text-[#9e4300]',
                  ].join(' ')}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex w-full flex-col gap-4 md:w-auto md:flex-row">
              <div className="relative flex-1 md:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#4f5f7a]" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar documento..."
                  className="h-11 w-full rounded-lg border border-[#e0c0b1] bg-[#f7f9fc] pl-11 pr-4 text-[0.95rem] text-[#191c1e] outline-none focus:border-[#9e4300] focus:ring-2 focus:ring-[#9e4300]/15"
                />
              </div>
              <Button
                type="button"
                onClick={handleRefreshAll}
                disabled={refreshing || loading}
                className="h-11 rounded-lg bg-[#5f7394] px-8 text-[0.95rem] font-semibold text-white hover:bg-[#556887]"
              >
                {refreshing || loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                Atualizar Status
              </Button>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#e0c0b1] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#e0c0b1] bg-[#f2f4f7]">
                    <th className="px-8 py-5 text-[1rem] font-bold text-[#4f5f7a]">Documento</th>
                    <th className="px-6 py-5 text-[1rem] font-bold text-[#4f5f7a]">Tipo</th>
                    <th className="px-6 py-5 text-[1rem] font-bold text-[#4f5f7a]">Status</th>
                    <th className="px-6 py-5 text-[1rem] font-bold text-[#4f5f7a]">Data</th>
                    <th className="px-6 py-5 text-[1rem] font-bold text-[#4f5f7a]">Obra</th>
                    <th className="px-8 py-5 text-right text-[1rem] font-bold text-[#4f5f7a]">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0c0b1]/40">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#9e4300]" />
                      </td>
                    </tr>
                  ) : visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-16 text-center text-[1rem] text-[#4f5f7a]">
                        Nenhum documento encontrado.
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((row) => {
                      const statusPill = getStatusPill(row.status);
                      return (
                        <tr key={`${row.kind}-${row.id}`} className="group transition-colors hover:bg-[#fbfcff]">
                          <td className="px-8 py-5">
                            <div className="flex items-start gap-4">
                              <div className="pt-1">{getDocumentIcon(row)}</div>
                              <span className="max-w-[420px] text-[1rem] font-semibold leading-10 text-[#191c1e]">{row.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`rounded-sm px-2 py-1 text-xs font-bold uppercase tracking-tight ${getTypeBadge(row.type)}`}>
                              {row.type}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.95rem] font-semibold ${statusPill.className}`}>
                              {statusPill.icon}
                              {statusPill.label}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-[1rem] leading-9 text-[#4f5f7a]">{formatShortDate(row.date)}</td>
                          <td className="px-6 py-5 text-[1rem] leading-9 text-[#4f5f7a]">{row.workName}</td>
                          <td className="px-8 py-5">
                            <div className="flex items-center justify-end gap-2 opacity-70 transition-opacity group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => {
                                  if (row.kind === 'draft') {
                                    handleOpenDraft(row.raw as SavedDocument);
                                  }
                                }}
                                className="rounded-lg p-2 text-[#c9793d] transition-colors hover:bg-[#f2f4f7] hover:text-[#9e4300]"
                                title="Abrir"
                              >
                                <PenSquare className="h-6 w-6" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePreviewRow(row)}
                                className="rounded-lg p-2 text-[#91a0b7] transition-colors hover:bg-[#f2f4f7] hover:text-[#4f5f7a]"
                                title="Visualizar"
                              >
                                <Eye className="h-6 w-6" />
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="rounded-lg p-2 text-[#91a0b7] transition-colors hover:bg-[#f2f4f7] hover:text-[#4f5f7a]"
                                  >
                                    <EllipsisVertical className="h-6 w-6" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                  {row.kind === 'draft' ? (
                                    <>
                                      <DropdownMenuItem onClick={() => handleOpenDraft(row.raw as SavedDocument)}>
                                        Abrir rascunho
                                      </DropdownMenuItem>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <button className="flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm text-[#ba1a1a] outline-none transition-colors hover:bg-[#fff1f0]">
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
                                    </>
                                  ) : (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => handleRefreshSignature(row.id)}
                                        disabled={rowRefreshingId === row.id}
                                      >
                                        {rowRefreshingId === row.id ? 'Atualizando...' : 'Atualizar status'}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleResend(row.id)}
                                        disabled={resendingId === row.id || row.status === 'completed'}
                                      >
                                        {resendingId === row.id ? 'Reenviando...' : 'Reenviar notificacao'}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleDownload(
                                            row.id,
                                            row.name.replace('.pdf', '_assinado.pdf')
                                          )
                                        }
                                        disabled={row.status !== 'completed'}
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

            <div className="flex flex-col gap-4 border-t border-[#e0c0b1] px-8 py-7 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[1rem] text-[#4f5f7a]">
                Exibindo {visibleRows.length} de {filteredRows.length} documentos
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#e0c0b1] text-[#8c7165] transition-colors hover:bg-[#f2f4f7] disabled:opacity-30"
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
                        ? 'border-[#9e4300] bg-[#9e4300] text-white'
                        : 'border-[#e0c0b1] bg-white text-[#191c1e] hover:bg-[#f2f4f7]',
                    ].join(' ')}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#e0c0b1] text-[#191c1e] transition-colors hover:bg-[#f2f4f7] disabled:opacity-30"
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
