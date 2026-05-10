'use client';

import { useState } from 'react';
import { Bug, ChevronRight, CirclePlay, ExternalLink, Loader2, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notifyN8n } from '@/server/n8n-actions';
import { useToast } from '@/hooks/use-toast';
import type { Company } from '@/lib/types';
import { ptBr } from '@/lib/data/strings';

interface N8nSettingsProps {
  company: Company;
}

export function N8nSettings({ company }: N8nSettingsProps) {
  const [isTestingProd, setIsTestingProd] = useState(false);
  const [isTestingTest, setIsTestingTest] = useState(false);
  const { toast } = useToast();

  const handleTestN8n = async (isTest: boolean) => {
    const url = isTest ? company.n8nTestUrl : company.n8nProductionUrl;
    const targetName = isTest ? ptBr.toasts.success.n8nTest : ptBr.toasts.success.n8nProduction;

    if (!url) {
      toast({
        variant: 'destructive',
        title: 'URL nao configurada',
        description: `A ${targetName} nao esta configurada nas configuracoes da empresa.`,
      });
      return;
    }

    if (isTest) {
      setIsTestingTest(true);
    } else {
      setIsTestingProd(true);
    }

    const testPayload = {
      message: ptBr.n8n.testMessage,
      testId: `test-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
      testType: isTest ? 'Test' : 'Production',
      companyName: company.name,
    };

    const result = await notifyN8n(testPayload, url);

    if (result.success) {
      toast({
        title: ptBr.toasts.success.n8nConnection,
        description: `Requisicao enviada com sucesso para a ${targetName}.`,
      });
    } else {
      const errorStatus = 'status' in result.data ? result.data.status : undefined;
      const errorDetails = 'details' in result.data ? result.data.details : undefined;

      toast({
        variant: 'destructive',
        title: `${ptBr.toasts.errors.n8nConnectionFailed} (${errorStatus || ptBr.toasts.errors.n8nConnectionFailedNetwork})`,
        description: ptBr.toasts.errors.n8nConnectionFailedDescription.replace('{{details}}', errorDetails || ptBr.errors.n8nCheckUrl),
      });
    }

    if (isTest) {
      setIsTestingTest(false);
    } else {
      setIsTestingProd(false);
    }
  };

  const hasConnection = Boolean(company.n8nProductionUrl || company.n8nTestUrl);

  return (
    <div className="space-y-6 lg:sticky lg:top-24">
      <section className="rounded-2xl border border-[#5b4e49] bg-[#2f3235] px-7 py-8 text-[#eff1f4] shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
        <div className="mb-7 flex items-center gap-3 text-[#ffb691]">
          <SlidersHorizontal className="h-7 w-7" />
          <h3 className="font-headline text-[2rem] font-semibold">Integracao n8n</h3>
        </div>

        <p className="mb-8 text-[1.05rem] leading-9 text-[#eff1f4]">
          Execute testes de conectividade para garantir que os fluxos de trabalho do n8n estejam recebendo os dados de conformidade corretamente.
        </p>

        <div className="space-y-5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleTestN8n(false)}
            disabled={isTestingProd || !company.n8nProductionUrl}
            className="group flex h-auto w-full items-center justify-between rounded-2xl border border-[#6d625d] bg-[#414446] px-6 py-5 text-left text-white hover:bg-[#4a4d50] hover:text-white"
          >
            <span className="flex items-center gap-4 text-[1rem] font-semibold">
              {isTestingProd ? <Loader2 className="h-6 w-6 animate-spin text-[#ffcfb6]" /> : <CirclePlay className="h-6 w-6 text-[#ffcfb6]" />}
              Testar Producao
            </span>
            <ChevronRight className="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => handleTestN8n(true)}
            disabled={isTestingTest || !company.n8nTestUrl}
            className="group flex h-auto w-full items-center justify-between rounded-2xl border border-[#6d625d] bg-[#414446] px-6 py-5 text-left text-white hover:bg-[#4a4d50] hover:text-white"
          >
            <span className="flex items-center gap-4 text-[1rem] font-semibold">
              {isTestingTest ? <Loader2 className="h-6 w-6 animate-spin text-[#c6d1e7]" /> : <Bug className="h-6 w-6 text-[#c6d1e7]" />}
              Testar Ambiente Teste
            </span>
            <ChevronRight className="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100" />
          </Button>
        </div>

        <div className="mt-10 border-t border-[#5b4e49] pt-8">
          <div className="mb-3 flex items-center justify-between gap-4">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#d2d6db]">Status da conexao</span>
            <span className="flex items-center gap-2 text-lg font-semibold text-[#4ade80]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#4ade80]" />
              {hasConnection ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <p className="text-sm leading-8 text-[#d2d6db]">
            {hasConnection
              ? 'Ultima resposta bem-sucedida recebida ha 14 minutos (200 OK).'
              : 'Configure pelo menos uma URL de webhook para ativar os testes de conectividade.'}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e0c0b1] bg-white px-7 py-8 shadow-sm">
        <h4 className="mb-4 font-headline text-[2rem] font-semibold text-[#191c1e]">Precisa de ajuda?</h4>
        <p className="mb-6 text-[1.05rem] leading-9 text-[#584237]">
          Consulte nossa documentacao tecnica para configurar o mapeamento de campos entre o PhiDocs e seus workflows n8n.
        </p>
        <a href="#" className="inline-flex items-center gap-2 text-[1rem] font-semibold text-[#9e4300] transition-colors hover:text-[#7d3500]">
          Ver Documentacao API
          <ExternalLink className="h-4 w-4" />
        </a>
      </section>
    </div>
  );
}
