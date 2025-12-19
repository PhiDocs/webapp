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
import { DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import type { Subcontractor, SubcontractorFormValues } from '@/lib/types';
import { subcontractorFormSchema } from '@/lib/types';

interface SubcontractorFormProps {
  onSubmit: (values: SubcontractorFormValues) => void;
  defaultValues?: Partial<Subcontractor> | null;
  isPending: boolean;
}

export function SubcontractorForm({ onSubmit, defaultValues, isPending }: SubcontractorFormProps) {
  const form = useForm<SubcontractorFormValues>({
    resolver: zodResolver(subcontractorFormSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      cnpj: defaultValues?.cnpj || '',
      contractNumber: defaultValues?.contractNumber || '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Empresa</FormLabel>
              <FormControl>
                <Input placeholder="Nome da empresa terceirizada" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cnpj"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CNPJ</FormLabel>
              <FormControl>
                <Input placeholder="00.000.000/0001-00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contractNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número do Contrato (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Nº do contrato" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
