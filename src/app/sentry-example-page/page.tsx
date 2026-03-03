'use client';

import { useState } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function SentryExamplePage() {
  const [clientStatus, setClientStatus] = useState<string>('');
  const [serverStatus, setServerStatus] = useState<string>('');

  const triggerClientError = () => {
    const error = new Error('Sentry test error (client): /sentry-example-page');
    Sentry.captureException(error);
    setClientStatus('Erro de teste enviado no client. Verifique o Sentry.');
  };

  const triggerServerError = async () => {
    setServerStatus('Disparando erro no servidor...');

    try {
      const response = await fetch('/api/sentry-example-api', {
        method: 'POST',
      });

      if (!response.ok) {
        setServerStatus('Erro disparado no servidor. Verifique o Sentry.');
        return;
      }

      setServerStatus('Requisição concluída sem erro (inesperado para teste).');
    } catch {
      setServerStatus('Falha de rede ao chamar endpoint de teste.');
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Sentry Example Page</h1>
      <p className="text-sm text-muted-foreground">
        Use esta página para validar eventos de erro no Sentry (client e server).
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={triggerClientError}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Testar erro no client
        </button>

        <button
          type="button"
          onClick={triggerServerError}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Testar erro no server
        </button>
      </div>

      {clientStatus ? <p className="text-sm">{clientStatus}</p> : null}
      {serverStatus ? <p className="text-sm">{serverStatus}</p> : null}
    </main>
  );
}
