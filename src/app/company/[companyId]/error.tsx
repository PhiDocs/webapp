'use client';

import { Button } from '@/components/ui/button';

export default function CompanyError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#f7f2ee] p-6 lg:pl-80">
      <div className="mx-auto max-w-2xl rounded-2xl border border-[#e0c0b1] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#191c1e]">Nao foi possivel carregar esta area.</h1>
        <p className="mt-3 text-sm leading-6 text-[#4f5f7a]">Tente novamente. Se o erro persistir, acesse outro modulo pelo menu lateral.</p>
        <Button onClick={reset} className="mt-5 rounded-xl bg-[#9e4300] text-white hover:bg-[#8c3b00]">Tentar novamente</Button>
      </div>
    </div>
  );
}
