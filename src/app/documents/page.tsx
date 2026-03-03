'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/auth/session-provider';
import { getDocuments, deleteDocument, createDocumentRevision, createDocumentRevisionFromSignature } from '@/server/document-actions';
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
import { trackApiError, trackPdfDownloaded, trackRevisionCreated } from '@/lib/telemetry/events';
import { reportClientError } from '@/lib/telemetry/crash-reporter';

// ===== Tipos =====
type FilterType = 'all' | 'draft' | 'signature';

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

function savedStatusLabel(status: SavedDocument['status']) {
  if (status === 'draft') return 'Rascunho';
  if (status === 'completed') return 'Concluído';
  if (status === 'declined') return 'Recusado';
  if (status === 'expired') return 'Expirado';
  if (status === 'signed' || status === 'certificated') return 'Assinado';
  if (status === 'pending' || status === 'uploaded' || status === 'sent') return 'Em assinatura';
  return status;
}

function savedStatusVariant(status: SavedDocument['status']): 'default' | 'destructive' | 'secondary' | 'outline' {
  if (status === 'completed' || status === 'signed' || status === 'certificated') return 'default';
  if (status === 'declined') return 'destructive';
  if (status === 'expired') return 'secondary';
  if (status === 'draft') return 'secondary';
  return 'outline';
}

function isReadyForRevision(status: SavedDocument['status']) {
  return status === 'completed' || status === 'signed' || status === 'certificated';
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
  onEdit,
  onDelete,
  deletingId,
  revisingId,
}: {
  item: SavedDocument;
  onOpen: (doc: SavedDocument) => void;
  onEdit: (doc: SavedDocument) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
  revisingId: string | null;
}) {
  const canEdit = item.documentType === 'APR' && isReadyForRevision(item.status);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold">{item.documentName}</h3>
              <Badge variant={savedStatusVariant(item.status)}>{savedStatusLabel(item.status)}</Badge>
              {item.documentNumber && (
                <Badge variant="outline">{item.documentNumber}</Badge>
              )}
              {typeof item.revisionNumber === 'number' && (
                <Badge variant="outline">Rev {String(item.revisionNumber).padStart(2, '0')}</Badge>
              )}
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
            {canEdit && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={revisingId === item.id}>
                    {revisingId === item.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="mr-2 h-4 w-4" />
                    )}
                    Editar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Criar nova revisão?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O número da APR será mantido e a revisão será incrementada em +1. Um novo documento será criado para manter o histórico.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onEdit(item)}>Continuar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
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
                    Esta ação não pode ser desfeita. O documento será excluído permanentemente.
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

function RevisionGroupCard({
  latest,
  revisions,
  isExpanded,
  onToggleExpand,
  onOpen,
  onEdit,
  onDelete,
  deletingId,
  revisingId,
}: {
  latest: SavedDocument;
  revisions: SavedDocument[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpen: (doc: SavedDocument) => void;
  onEdit: (doc: SavedDocument) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
  revisingId: string | null;
}) {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{latest.documentName}</h3>
              {latest.documentNumber && <Badge variant="outline">{latest.documentNumber}</Badge>}
              <Badge variant="secondary">{revisions.length} revisões</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Mais recente: Rev {String(latest.revisionNumber || 1).padStart(2, '0')}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onToggleExpand}>
            {isExpanded ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
            {isExpanded ? 'Ocultar' : 'Ver revisões'}
          </Button>
        </div>

        {isExpanded && (
          <div className="space-y-3 border-l pl-4">
            {revisions.map((revision) => (
              <DraftCard
                key={revision.id}
                item={revision}
                onOpen={onOpen}
                onEdit={onEdit}
                onDelete={onDelete}
                deletingId={deletingId}
                revisingId={revisingId}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SignatureCard({
  item,
  linkedDocument,
  expandedId,
  onToggleExpand,
  onRefresh,
  refreshingId,
  onResend,
  resendingId,
  onDownload,
  onEdit,
  onEditFromSignature,
  revisingId,
}: {
  item: SignatureDocument;
  linkedDocument: SavedDocument | null;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onRefresh: (id: string) => void;
  refreshingId: string | null;
  onResend: (id: string) => void;
  resendingId: string | null;
  onDownload: (id: string, fileName: string) => void;
  onEdit: (doc: SavedDocument) => void;
  onEditFromSignature: (signatureDocumentId: string) => void;
  revisingId: string | null;
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
            {(item.status === 'signed' || item.status === 'certificated') && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={revisingId === (linkedDocument?.id || item.id)}>
                    {revisingId === (linkedDocument?.id || item.id) ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="mr-2 h-4 w-4" />
                    )}
                    Editar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Criar nova revisão?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O número da APR será mantido e a revisão será incrementada em +1. Um novo documento será criado para manter o histórico.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => (linkedDocument ? onEdit(linkedDocument) : onEditFromSignature(item.id))}>
                      Continuar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
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
  const activeCompanyId = user?.activeCompanyId ?? user?.companyId;
  const router = useRouter();
  const { toast } = useToast();

  const [drafts, setDrafts] = useState<SavedDocument[]>([]);
  const [signatures, setSignatures] = useState<SignatureDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [revisingId, setRevisingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedRevisionGroupId, setExpandedRevisionGroupId] = useState<string | null>(null);

  const loadData = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    const [docsResult, sigsResult] = await Promise.all([
      getDocuments(activeCompanyId),
      getSignatureDocuments(activeCompanyId),
    ]);
    if (docsResult.success && docsResult.data) setDrafts(docsResult.data);
    if (sigsResult.success && sigsResult.data) setSignatures(sigsResult.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [activeCompanyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const draftItems = drafts
    .filter((d) => d.status === 'draft' || d.status === 'completed' || d.status === 'signed' || d.status === 'certificated')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const draftGroups = (() => {
    const groups = new Map<string, SavedDocument[]>();
    for (const doc of draftItems) {
      const key = doc.revisionGroupId || doc.id;
      const arr = groups.get(key) || [];
      arr.push(doc);
      groups.set(key, arr);
    }
    return Array.from(groups.entries())
      .map(([key, docs]) => ({
        key,
        docs: docs.sort((a, b) => (b.revisionNumber || 1) - (a.revisionNumber || 1)),
      }))
      .sort((a, b) => new Date(b.docs[0].updatedAt).getTime() - new Date(a.docs[0].updatedAt).getTime());
  })();

  const signatureItems = signatures
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Contadores para os filtros
  const draftCount = draftItems.length;
  const signatureCount = signatureItems.length;

  const handleOpenDraft = (doc: SavedDocument) => {
    router.push(`/reports?documentId=${doc.id}`);
  };

  const handleCreateRevision = async (doc: SavedDocument) => {
    setRevisingId(doc.id);
    try {
      const result = await createDocumentRevision(doc.id);
      if (!result.success || !result.documentId) {
        toast({ variant: 'destructive', title: 'Erro ao criar revisão', description: result.error });
        return;
      }

      toast({ title: 'Nova revisão criada', description: 'A revisão foi criada e carregada para edição.' });
      trackRevisionCreated({
        source: 'document',
        documentId: result.documentId,
        companyId: activeCompanyId,
      });
      router.push(`/reports?documentId=${result.documentId}`);
    } catch (error: any) {
      const message = error?.message || 'Erro ao criar revisão';
      trackApiError({ context: 'documents_create_revision', message });
      reportClientError({
        source: 'manual',
        context: 'documents_create_revision',
        message,
        stack: error?.stack,
      });
      toast({ variant: 'destructive', title: 'Erro ao criar revisão', description: error.message });
    } finally {
      setRevisingId(null);
    }
  };

  const handleCreateRevisionFromSignature = async (signatureDocumentId: string) => {
    setRevisingId(signatureDocumentId);
    try {
      const result = await createDocumentRevisionFromSignature(signatureDocumentId);
      if (!result.success || !result.documentId) {
        toast({ variant: 'destructive', title: 'Erro ao criar revisão', description: result.error });
        return;
      }
      toast({ title: 'Nova revisão criada', description: 'A revisão foi criada e carregada para edição.' });
      trackRevisionCreated({
        source: 'signature',
        documentId: result.documentId,
        companyId: activeCompanyId,
      });
      router.push(`/reports?documentId=${result.documentId}`);
    } catch (error: any) {
      const message = error?.message || 'Erro ao criar revisão por assinatura';
      trackApiError({ context: 'documents_create_revision_from_signature', message });
      reportClientError({
        source: 'manual',
        context: 'documents_create_revision_from_signature',
        message,
        stack: error?.stack,
      });
      toast({ variant: 'destructive', title: 'Erro ao criar revisão', description: error.message });
    } finally {
      setRevisingId(null);
    }
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
    if (!response.ok) {
      const message = `Falha ao baixar PDF assinado (status ${response.status})`;
      trackApiError({ context: 'documents_download_signed_pdf', message });
      reportClientError({
        source: 'manual',
        context: 'documents_download_signed_pdf',
        message,
      });
      return;
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'documento_assinado.pdf';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    trackPdfDownloaded({
      documentType: 'ASSINADO',
      documentId: id,
      companyId: activeCompanyId,
    });
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
        ) : (filter === 'all' ? draftGroups.length + signatureItems.length : filter === 'draft' ? draftGroups.length : signatureItems.length) === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {filter === 'draft' ? 'Nenhum rascunho salvo.' :
               filter === 'signature' ? 'Nenhum documento enviado para assinatura.' :
               'Nenhum documento encontrado.'}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {(filter === 'all' || filter === 'draft') &&
              draftGroups.map((group) => {
                if (group.docs.length === 1) {
                  return (
                    <DraftCard
                      key={`draft-${group.docs[0].id}`}
                      item={group.docs[0]}
                      onOpen={handleOpenDraft}
                      onEdit={handleCreateRevision}
                      onDelete={handleDeleteDraft}
                      deletingId={deletingId}
                      revisingId={revisingId}
                    />
                  );
                }

                return (
                  <RevisionGroupCard
                    key={`group-${group.key}`}
                    latest={group.docs[0]}
                    revisions={group.docs}
                    isExpanded={expandedRevisionGroupId === group.key}
                    onToggleExpand={() => setExpandedRevisionGroupId(expandedRevisionGroupId === group.key ? null : group.key)}
                    onOpen={handleOpenDraft}
                    onEdit={handleCreateRevision}
                    onDelete={handleDeleteDraft}
                    deletingId={deletingId}
                    revisingId={revisingId}
                  />
                );
              })}

            {(filter === 'all' || filter === 'signature') &&
              signatureItems.map((item) => {
                const linkedDocument = drafts.find((d) => d.signatureDocumentId === item.id) || null;
                return (
                  <SignatureCard
                    key={`sig-${item.id}`}
                    item={item}
                    linkedDocument={linkedDocument}
                    expandedId={expandedId}
                    onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
                    onRefresh={handleRefresh}
                    refreshingId={refreshingId}
                    onResend={handleResend}
                    resendingId={resendingId}
                    onDownload={handleDownload}
                    onEdit={handleCreateRevision}
                    onEditFromSignature={handleCreateRevisionFromSignature}
                    revisingId={revisingId}
                  />
                );
              })}
          </div>
        )}
      </main>
    </div>
  );
}
