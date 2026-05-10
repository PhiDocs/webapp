'use client';

import { useEffect, useRef, useTransition, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Link as LinkIcon, Loader2, Terminal, Upload } from 'lucide-react';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Company, CompanySettingsFormValues } from '@/lib/types';
import { companySettingsFormSchema } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ptBr } from '@/lib/data/strings';
import { updateCompany } from '@/server/company-actions';
import { cn } from '@/lib/utils';

interface CompanySettingsProps {
  company: Company;
  onCompanyUpdate: () => void;
}

export function CompanySettings({ company, onCompanyUpdate }: CompanySettingsProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<CompanySettingsFormValues>({
    resolver: zodResolver(companySettingsFormSchema),
    defaultValues: {
      name: company.name || '',
      logo: company.logo || '',
      n8nProductionUrl: company.n8nProductionUrl || '',
      n8nTestUrl: company.n8nTestUrl || '',
    },
  });

  useEffect(() => {
    form.reset({
      name: company.name || '',
      logo: company.logo || '',
      n8nProductionUrl: company.n8nProductionUrl || '',
      n8nTestUrl: company.n8nTestUrl || '',
    });
  }, [company, form]);

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: ptBr.toasts.errors.fileTooLarge,
        description: ptBr.toasts.errors.fileTooLargeDescription,
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      form.setValue('logo', reader.result as string, { shouldValidate: true, shouldDirty: true });
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = (values: CompanySettingsFormValues) => {
    startTransition(async () => {
      const result = await updateCompany(company.id, values);

      if (result.success) {
        toast({ title: 'Configuracoes da empresa atualizadas com sucesso!' });
        onCompanyUpdate();
        return;
      }

      toast({ variant: 'destructive', title: 'Erro ao atualizar', description: result.error });
    });
  };

  const currentLogo = form.watch('logo');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <section className="rounded-2xl border border-[#e0c0b1] bg-white px-6 py-7 shadow-sm">
          <div className="mb-10 border-b border-[#ecd4c8] pb-5">
            <div className="flex items-center gap-3 text-[#9e4300]">
              <Building2 className="h-6 w-6" />
              <h2 className="font-headline text-[2rem] font-semibold text-[#191c1e]">Informacoes Gerais</h2>
            </div>
          </div>

          <div className="space-y-10">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="grid gap-4 md:grid-cols-4 md:items-center">
                  <FormLabel className="text-[1.05rem] font-semibold text-[#191c1e] md:col-span-1">Nome da Empresa</FormLabel>
                  <div className="md:col-span-3">
                    <FormControl>
                      <Input
                        placeholder="Nome da sua empresa"
                        {...field}
                        className="h-14 rounded-2xl border-2 border-[#e0c0b1] bg-white px-5 text-[1rem] text-[#191c1e] focus-visible:ring-[#9e4300]/20"
                      />
                    </FormControl>
                    <FormMessage className="mt-2" />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logo"
              render={() => (
                <FormItem className="grid gap-4 md:grid-cols-4 md:items-start">
                  <FormLabel className="pt-2 text-[1.05rem] font-semibold text-[#191c1e] md:col-span-1">
                    {ptBr.safetyForm.companyLogo}
                  </FormLabel>
                  <div className="md:col-span-3">
                    <div className="flex flex-col gap-5 md:flex-row md:items-center">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png, image/jpeg,image/svg+xml"
                        onChange={handleLogoChange}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="group relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#e0c0b1] bg-[#eef1f5] transition-colors hover:border-[#9e4300]"
                      >
                        {currentLogo ? (
                          <img src={currentLogo} alt="Logo da empresa" className="absolute inset-0 h-full w-full object-cover opacity-55" />
                        ) : null}

                        <div className="relative z-10 flex flex-col items-center gap-1 text-[#4f5f7a] transition-colors group-hover:text-[#9e4300]">
                          <Upload className="h-6 w-6" />
                          <span className="text-xs font-medium">Alterar</span>
                        </div>
                      </button>

                      <div className="space-y-2">
                        <FormDescription className="text-base text-[#584237]">
                          Recomendado: 512x512px. PNG ou SVG.
                        </FormDescription>
                        <button
                          type="button"
                          onClick={() => {
                            form.setValue('logo', '', { shouldDirty: true, shouldValidate: true });
                            if (logoInputRef.current) {
                              logoInputRef.current.value = '';
                            }
                          }}
                          className={cn(
                            'text-base font-semibold text-[#9e4300] transition-colors hover:text-[#7d3500]',
                            !currentLogo && 'pointer-events-none opacity-50'
                          )}
                        >
                          Remover logo atual
                        </button>
                        <FormMessage />
                      </div>
                    </div>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-[#e0c0b1] bg-white px-6 py-7 shadow-sm">
          <div className="mb-10 border-b border-[#ecd4c8] pb-5">
            <div className="flex items-center gap-3 text-[#9e4300]">
              <LinkIcon className="h-6 w-6" />
              <h2 className="font-headline text-[2rem] font-semibold text-[#191c1e]">Configuracao de Webhooks (n8n)</h2>
            </div>
          </div>

          <div className="space-y-8">
            <FormField
              control={form.control}
              name="n8nProductionUrl"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <FormLabel className="text-[1.05rem] font-semibold text-[#191c1e]">URL de Producao</FormLabel>
                    <span className="rounded-full bg-[#e9edf3] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#37485f]">
                      Prod Environment
                    </span>
                  </div>
                  <div>
                    <FormControl>
                      <div className="relative">
                        <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#4f5f7a]" />
                        <Input
                          {...field}
                          type="url"
                          placeholder="https://seu.n8n.cloud/webhook/production..."
                          className="h-14 rounded-2xl border-2 border-[#e0c0b1] bg-white pl-12 pr-4 font-mono text-[1rem] text-[#37485f] focus-visible:ring-[#9e4300]/20"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="mt-2" />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="n8nTestUrl"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <FormLabel className="text-[1.05rem] font-semibold text-[#191c1e]">URL de Teste</FormLabel>
                    <span className="rounded-full bg-[#e9edf3] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#54637c]">
                      Staging
                    </span>
                  </div>
                  <div>
                    <FormControl>
                      <div className="relative">
                        <Terminal className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#4f5f7a]" />
                        <Input
                          {...field}
                          type="url"
                          placeholder="https://seu.n8n.cloud/webhook-test/..."
                          className="h-14 rounded-2xl border-2 border-[#e0c0b1] bg-white pl-12 pr-4 font-mono text-[1rem] text-[#37485f] focus-visible:ring-[#9e4300]/20"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="mt-2" />
                  </div>
                </FormItem>
              )}
            />
          </div>
        </section>

        <div className="flex flex-col justify-end gap-4 pb-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            className="h-16 rounded-2xl border-2 border-[#3f5b86] bg-white px-10 text-[1rem] font-semibold text-[#3f5b86] hover:bg-[#f5f8fd] hover:text-[#3f5b86]"
          >
            Descartar
          </Button>
          <Button
            type="submit"
            disabled={isPending || !form.formState.isDirty}
            className="h-16 rounded-2xl bg-[#9e4300] px-10 text-[1rem] font-semibold text-white shadow-[0_8px_24px_rgba(158,67,0,0.18)] hover:bg-[#8c3b00]"
          >
            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Salvar Alteracoes
          </Button>
        </div>
      </form>
    </Form>
  );
}
