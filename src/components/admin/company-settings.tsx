'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { Company, CompanySettingsFormValues } from '@/lib/types';
import { companySettingsFormSchema } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTransition, type ChangeEvent } from 'react';
import { ptBr } from '@/lib/data/strings';
import { updateCompany } from '@/server/company-actions';

interface CompanySettingsProps {
  company: Company;
  onCompanyUpdate: () => void;
}

export function CompanySettings({ company, onCompanyUpdate }: CompanySettingsProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CompanySettingsFormValues>({
    resolver: zodResolver(companySettingsFormSchema),
    defaultValues: {
      name: company.name || '',
      logo: company.logo || '',
    },
  });

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
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
    }
  };

  const onSubmit = (values: CompanySettingsFormValues) => {
    startTransition(async () => {
      const result = await updateCompany(company.id, values);
      if (result.success) {
        toast({ title: 'Configurações da empresa atualizadas com sucesso!' });
        onCompanyUpdate();
      } else {
        toast({ variant: 'destructive', title: 'Erro ao atualizar', description: result.error });
      }
    });
  };

  const currentLogo = form.watch('logo');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações da Empresa</CardTitle>
        <CardDescription>Atualize o nome e o logo da sua empresa. Estas informações aparecerão em todos os documentos gerados.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Empresa</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da sua empresa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
                <FormLabel>{ptBr.safetyForm.companyLogo}</FormLabel>
                <div className='flex items-center gap-4'>
                    {currentLogo && <img src={currentLogo} alt="Logo preview" className='h-16 w-16 object-contain rounded-md border p-1'/>}
                    <FormControl className='flex-1'>
                        <Input
                        type="file"
                        accept="image/png, image/jpeg"
                        onChange={handleLogoChange}
                        />
                    </FormControl>
                </div>
                <FormDescription>{ptBr.safetyForm.companyLogoDescription}</FormDescription>
                <FormMessage />
            </FormItem>
            
            <div className="flex justify-end">
              <Button type="submit" disabled={isPending || !form.formState.isDirty}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
