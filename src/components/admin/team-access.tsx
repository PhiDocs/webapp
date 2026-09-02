'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, ShieldCheck, UserMinus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  liberarAcesso, listarAcessosPendentes, listarEquipe, revogarAcesso,
  type PessoaAguardando, type PessoaDaEquipe,
} from '@/server/access-actions';

/**
 * Quem entra no sistema.
 *
 * O cadastro cria a conta sem empresa de proposito: a pessoa fica esperando
 * ate um admin liberar. Antes disso so dava para vincular editando o banco na
 * mao, o que na pratica impedia qualquer teste com gente de verdade.
 */
export function TeamAccess() {
  const { toast } = useToast();
  const [pendentes, setPendentes] = useState<PessoaAguardando[]>([]);
  const [equipe, setEquipe] = useState<PessoaDaEquipe[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [emAcao, setEmAcao] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [fila, time] = await Promise.all([listarAcessosPendentes(), listarEquipe()]);
    if (fila.data) setPendentes(fila.data);
    if (time.data) setEquipe(time.data);
    const problema = fila.error || time.error;
    if (problema) toast({ variant: 'destructive', title: 'Erro ao carregar acessos', description: problema });
    setCarregando(false);
  }, [toast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const aoLiberar = async (pessoa: PessoaAguardando, papel: 'admin' | 'user') => {
    setEmAcao(pessoa.uid);
    const resultado = await liberarAcesso(pessoa.uid, papel);
    if (resultado.success) {
      toast({ title: `${pessoa.name} agora tem acesso.` });
      await carregar();
    } else {
      toast({ variant: 'destructive', title: 'Nao foi possivel liberar', description: resultado.error });
    }
    setEmAcao(null);
  };

  const aoRevogar = async (pessoa: PessoaDaEquipe) => {
    setEmAcao(pessoa.uid);
    const resultado = await revogarAcesso(pessoa.uid);
    if (resultado.success) {
      toast({ title: `${pessoa.name} saiu da empresa.` });
      await carregar();
    } else {
      toast({ variant: 'destructive', title: 'Nao foi possivel remover', description: resultado.error });
    }
    setEmAcao(null);
  };

  if (carregando) {
    return (
      <div className="flex items-center gap-2 rounded-sm border border-[#cfcbc0] bg-white px-5 py-8 text-sm text-[#6e6a61]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando acessos...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fila de espera */}
      <section className="overflow-hidden rounded-sm border border-[#cfcbc0] bg-white">
        <div className="bg-[#111111] px-5 py-3">
          <h3 className="font-headline text-h3 text-white">Aguardando liberacao</h3>
          <p className="mt-0.5 text-xs text-white/80">
            Quem se cadastrou e ainda nao consegue usar o sistema. Libere so quem voce reconhece.
          </p>
        </div>

        {pendentes.length === 0 ? (
          <p className="px-5 py-6 text-sm italic text-[#6e6a61]">
            Ninguem esperando. Quando alguem criar uma conta, aparece aqui.
          </p>
        ) : (
          <ul className="divide-y divide-[#e3e0d8]">
            {pendentes.map((pessoa) => (
              <li key={pessoa.uid} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#111111]">{pessoa.name}</p>
                  <p className="truncate text-xs text-[#6e6a61]">{pessoa.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => aoLiberar(pessoa, 'user')}
                    disabled={emAcao === pessoa.uid}
                    className="h-11 flex-1 sm:h-9 sm:flex-none"
                  >
                    {emAcao === pessoa.uid
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <UserPlus className="h-4 w-4" />}
                    Liberar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => aoLiberar(pessoa, 'admin')}
                    disabled={emAcao === pessoa.uid}
                    title="Alem de usar, podera liberar outras pessoas"
                    className="h-11 flex-1 sm:h-9 sm:flex-none"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Liberar como admin
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Quem ja esta dentro */}
      <section className="overflow-hidden rounded-sm border border-[#cfcbc0] bg-white">
        <div className="border-b border-[#cfcbc0] px-5 py-3">
          <p className="label-oficial">Com acesso ({equipe.length})</p>
        </div>
        <ul className="divide-y divide-[#e3e0d8]">
          {equipe.map((pessoa) => (
            <li key={pessoa.uid} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#111111]">
                  {pessoa.name}
                  {pessoa.ehVoce && <span className="ml-2 text-xs font-normal text-[#6e6a61]">(voce)</span>}
                </p>
                <p className="truncate text-xs text-[#6e6a61]">{pessoa.email}</p>
              </div>

              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-[#f2f1ed] px-3 py-1 text-xs font-semibold text-[#6e6a61]">
                {pessoa.role === 'admin' ? <ShieldCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                {pessoa.role === 'admin' ? 'Administrador' : 'Usuario'}
              </span>

              {!pessoa.ehVoce && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => aoRevogar(pessoa)}
                  disabled={emAcao === pessoa.uid}
                  className="h-11 text-[#7a1f1f] sm:h-9"
                >
                  {emAcao === pessoa.uid
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <UserMinus className="h-4 w-4" />}
                  Remover
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
