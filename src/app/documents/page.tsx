'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/auth/session-provider';
import { getDocuments, deleteDocument } from '@/server/document-actions';
import { getSignatureDocuments, refreshSignatureDocument, resendSignatureNotification } from '@/server/signature-actions';
import type { SavedDocument, SignatureDocument, SignatureSigner } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, FileText, Trash2, ExternalLink, RefreshCw, Download, Mail, Phone,
  ChevronDown, ChevronUp, Send, Filter,
} from 'lucide-react';
import { ptBr } from '@/lib/data/strings';
import { Header } from '@/components/header';
import { UserNav } from '@/components/auth/user-nav';
import { formatPhoneDisplay } from '@/lib/utils/phone-validator';
import { useToast } from '@/hooks/use-toast';
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

// ===== Tipos unificados =====
type FilterType = 'all' | 'draft' | 'signature';

type UnifiedItem =
  | { kind: 'draft'; data: SavedDocument }
  | { kind: 'signature'; data: SignatureDocument };

// ===== Helpers =====
function formatDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

function signatureStatusLabel(status: SignatureDocument['status'] | SignatureSigner['status']) {
  if (status === 'signed' || status === 'certificated') return ptBr.signature.status.signed;
  if (status === 'declined') return ptBr.signature.status.declined;
  if (status === 'expired') return ptBr.signature.status.expired;
  if (status === 'uploaded') return ptBr.signature.status.uploaded;
  return ptBr.signature.status.pending;
}

function signatureStatusVariant(status: SignatureDocument['status'] | SignatureSigner['status']): 'default' | 'destructive' | 'secondary' | 'outline' {
  if (status === 'signed' || status === 'certificated') return 'default';
  if (status === 'declined') return 'destructive';
  if (status === 'expired') return 'secondary';
  return 'outline';
}

// ===== Sub-componentes =====
function SignersList({ signers }: { signers: SignatureSigner[] }) {
  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Signatários</p>
      <div className="grid gap-2">
        {signers.map((signer, i) => (
          <div key={i} className="flex flex-col gap-1 rounded-md border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{signer.name}</span>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {signer.email}
                </span>
                {signer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {formatPhoneDisplay(signer.phone)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1 sm:mt-0">
              <Badge variant={signatureStatusVariant(signer.status)}>{signatureStatusLabel(signer.status)}</Badge>
              {signer.signingUrl && signer.status === 'pending' && (
                <a
                  href={signer.signingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Assinar
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DraftCard({
  item,
  onOpen,
  onDelete,
  deletingId,
}: {
  item: SavedDocument;
  onOpen: (doc: SavedDocument) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold">{item.documentName}</h3>
              <Badge variant="secondary">Rascunho</Badge>
              <Badge variant="outline">{String(item.documentType)}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Criado em {formatDate(item.createdAt)}
              {item.updatedAt !== item.createdAt && (
                <> · Atualizado em {formatDate(item.updatedAt)}</>
              )}
            </div>
            {item.formData?.workName && (
              <div className="text-sm text-muted-foreground">
                Obra: {item.formData.workName}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpen(item)}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={deletingId === item.id}>
                  {deletingId === item.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O rascunho será excluído permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(item.id)}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SignatureCard({
  item,
  expandedId,
  onToggleExpand,
  onRefresh,
  refreshingId,
  onResend,
  resendingId,
  onDownload,
}: {
  item: SignatureDocument;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onRefresh: (id: string) => void;
  refreshingId: string | null;
  onResend: (id: string) => void;
  resendingId: string | null;
  onDownload: (id: string, fileName: string) => void;
}) {
  const total = item.signers.length;
  const signed = item.signers.filter(s => s.status === 'signed').length;
  const pending = total - signed;
  const isFullySigned = signed === total && total > 0 && (item.status === 'signed' || item.status === 'certificated');
  const isExpanded = expandedId === item.id;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">{item.documentName}</h3>
              <Badge variant={signatureStatusVariant(item.status)}>{signatureStatusLabel(item.status)}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {ptBr.signature.counts
                .replace('{{signed}}', String(signed))
                .replace('{{pending}}', String(pending))
                .replace('{{total}}', String(total))}
            </div>
            <div className="text-xs text-muted-foreground">
              {ptBr.signature.lastSync.replace('{{date}}', item.lastSyncedAt || item.createdAt)}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="ghost" size="sm" onClick={() => onToggleExpand(item.id)}>
              {isExpanded ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
              {total} signatário{total !== 1 ? 's' : ''}
            </Button>
            <Button variant="outline" onClick={() => onRefresh(item.id)} disabled={refreshingId === item.id}>
              {refreshingId === item.id ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{ptBr.actions.refreshing}</>
              ) : (
                <><RefreshCw className="mr-2 h-4 w-4" />{ptBr.actions.refresh}</>
              )}
            </Button>
            {!isFullySigned && (
              <Button variant="outline" onClick={() => onResend(item.id)} disabled={resendingId === item.id}>
                {resendingId === item.id ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reenviando...</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" />Reenviar</>
                )}
              </Button>
            )}
            <Button
              onClick={() => onDownload(item.id, item.documentName.replace('.pdf', '_assinado.pdf'))}
              disabled={!isFullySigned}
            >
              <Download className="mr-2 h-4 w-4" />
              {ptBr.actions.downloadSignedPdf}
            </Button>
          </div>
        </div>
        {isExpanded && <SignersList signers={item.signers} />}
      </CardContent>
    </Card>
  );
}

// ===== Filtros =====
const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'draft', label: 'Rascunhos' },
  { value: 'signature', label: 'Assinaturas' },
];

// ===== Página principal =====
export default function DocumentsPage() {
  const { user } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [drafts, setDrafts] = useState<SavedDocument[]>([]);
  const [signatures, setSignatures] = useState<SignatureDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    const [docsResult, sigsResult] = await Promise.all([
      getDocuments(user.companyId!),
      getSignatureDocuments(user.companyId!),
    ]);
    if (docsResult.success && docsResult.data) setDrafts(docsResult.data);
    if (sigsResult.success && sigsResult.data) setSignatures(sigsResult.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user?.companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Unificar e ordenar por data
  const items: UnifiedItem[] = (() => {
    const all: UnifiedItem[] = [];

    if (filter === 'all' || filter === 'draft') {
      // Só mostrar rascunhos que não foram enviados (para não duplicar com assinaturas)
      drafts
        .filter(d => d.status === 'draft')
        .forEach(d => all.push({ kind: 'draft', data: d }));
    }

    if (filter === 'all' || filter === 'signature') {
      signatures.forEach(s => all.push({ kind: 'signature', data: s }));
    }

    // Ordenar por data mais recente
    all.sort((a, b) => {
      const dateA = a.kind === 'draft' ? a.data.updatedAt : a.data.createdAt;
      const dateB = b.kind === 'draft' ? b.data.updatedAt : b.data.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return all;
  })();

  // Contadores para os filtros
  const draftCount = drafts.filter(d => d.status === 'draft').length;
  const signatureCount = signatures.length;

  const handleOpenDraft = (doc: SavedDocument) => {
    router.push(`/reports?documentId=${doc.id}`);
  };

  const handleDeleteDraft = async (id: string) => {
    setDeletingId(id);
    try {
      const result = await deleteDocument(id);
      if (result.success) {
        setDrafts(prev => prev.filter(d => d.id !== id));
        toast({ title: 'Documento excluído' });
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: result.error });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleRefresh = async (id: string) => {
    setRefreshingId(id);
    await refreshSignatureDocument(id);
    await loadData();
    setRefreshingId(null);
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
    if (!response.ok) return;
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'documento_assinado.pdf';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header>
        <UserNav />
      </Header>
      <main className="container mx-auto flex-1 px-4 py-8 md:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Documentos</h2>
            <p className="text-muted-foreground">Rascunhos salvos e documentos enviados para assinatura.</p>
          </div>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{ptBr.actions.loading}</>
            ) : (
              <><RefreshCw className="mr-2 h-4 w-4" />{ptBr.actions.refresh}</>
            )}
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 mb-6">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {FILTERS.map((f) => {
            const count = f.value === 'all' ? draftCount + signatureCount
              : f.value === 'draft' ? draftCount
              : signatureCount;
            return (
              <Button
                key={f.value}
                variant={filter === f.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f.value)}
              >
                {f.label}
                <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] px-1.5 text-xs">
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {filter === 'draft' ? 'Nenhum rascunho salvo.' :
               filter === 'signature' ? 'Nenhum documento enviado para assinatura.' :
               'Nenhum documento encontrado.'}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {items.map((item) => {
              if (item.kind === 'draft') {
                return (
                  <DraftCard
                    key={`draft-${item.data.id}`}
                    item={item.data}
                    onOpen={handleOpenDraft}
                    onDelete={handleDeleteDraft}
                    deletingId={deletingId}
                  />
                );
              }
              return (
                <SignatureCard
                  key={`sig-${item.data.id}`}
                  item={item.data}
                  expandedId={expandedId}
                  onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
                  onRefresh={handleRefresh}
                  refreshingId={refreshingId}
                  onResend={handleResend}
                  resendingId={resendingId}
                  onDownload={handleDownload}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
