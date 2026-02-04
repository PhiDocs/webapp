'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/components/auth/session-provider';
import { getSignatureDocuments, refreshSignatureDocument } from '@/server/signature-actions';
import type { SignatureDocument } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Download } from 'lucide-react';
import { ptBr } from '@/lib/data/strings';
import { Header } from '@/components/header';
import { UserNav } from '@/components/auth/user-nav';

function statusLabel(status: SignatureDocument['status']) {
  if (status === 'signed') return ptBr.signature.status.signed;
  if (status === 'declined') return ptBr.signature.status.declined;
  if (status === 'expired') return ptBr.signature.status.expired;
  if (status === 'uploaded') return ptBr.signature.status.uploaded;
  return ptBr.signature.status.pending;
}

function statusVariant(status: SignatureDocument['status']) {
  if (status === 'signed') return 'default';
  if (status === 'declined') return 'destructive';
  if (status === 'expired') return 'secondary';
  return 'secondary';
}

export default function SignatureStatusPage() {
  const { user } = useSession();
  const [items, setItems] = useState<SignatureDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const loadData = async () => {
    if (!user?.companyId) return;
    setIsLoading(true);
    const result = await getSignatureDocuments(user.companyId);
    if (result.success && result.data) {
      setItems(result.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user?.companyId]);

  const handleRefresh = async (id: string) => {
    setRefreshingId(id);
    await refreshSignatureDocument(id);
    await loadData();
    setRefreshingId(null);
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{ptBr.signature.title}</h2>
            <p className="text-sm text-muted-foreground">{ptBr.signature.description}</p>
          </div>
          <Button variant="outline" onClick={loadData} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {ptBr.actions.loading}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {ptBr.actions.refresh}
              </>
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {ptBr.signature.empty}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {items.map((item) => {
              const total = item.signers.length;
              const signed = item.signers.filter(s => s.status === 'signed').length;
              const pending = total - signed;
              const isFullySigned = signed === total && total > 0 && item.status === 'signed';
              return (
                <Card key={item.id}>
                  <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">{item.documentName}</h3>
                        <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
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
                      <Button
                        variant="outline"
                        onClick={() => handleRefresh(item.id)}
                        disabled={refreshingId === item.id}
                      >
                        {refreshingId === item.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {ptBr.actions.refreshing}
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            {ptBr.actions.refresh}
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleDownload(item.id, item.documentName.replace('.pdf', '_assinado.pdf'))}
                        disabled={!isFullySigned}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {ptBr.actions.downloadSignedPdf}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
